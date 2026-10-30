import archiveRouter from "./archive-routes.js";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { Document, Packer, Paragraph, TextRun } from "docx";

const apiDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(apiDirectory, "../.env") });

const app = express();
const execFileAsync = promisify(execFile);
const port = Number(process.env.PORT || 5000);

const MAX_UPLOAD_MB = Math.min(
  Math.max(Number(process.env.MAX_UPLOAD_MB || 25), 1),
  100
);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const CONVERSION_TIMEOUT_MS = 60_000;
const MAX_PDF_PAGES = 200;
const MAX_EXTRACTED_CHARACTERS = 2_000_000;

const configuredOrigins = (
  process.env.FRONTEND_ORIGIN || "https://filefluxa.vercel.app"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...configuredOrigins,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const isWindows = process.platform === "win32";

const windowsSoffice = [
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
];

const soffice =
  process.env.SOFFICE_PATH ||
  (isWindows
    ? windowsSoffice[0]
    : "soffice");

app.disable("x-powered-by");
app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Origin not allowed by FileFluxa API")
      );
    },
  })
);

app.use(express.json({ limit: "1mb" }));

app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
    fields: 0,
    parts: 1,
  },
});

const tempRoot = path.join(os.tmpdir(), "filefluxa");
await fs.mkdir(tempRoot, { recursive: true });
app.use("/api/archives", archiveRouter);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "FileFluxa API",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/tools", (_req, res) => {
  res.json({
    tools: [
      { id: "image-studio", status: "planned" },
      { id: "pdf-lab", status: "planned" },
      { id: "document-converter", status: "available" },
      { id: "audio-lab", status: "planned" },
      { id: "archive-tools", status: "planned" },
    ],
  });
});

/* -------------------------------------------------------
   File validation
------------------------------------------------------- */

function hasPdfSignature(buffer) {
  return (
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString("ascii") === "%PDF-"
  );
}

function hasZipSignature(buffer) {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (
      (buffer[2] === 0x03 && buffer[3] === 0x04) ||
      (buffer[2] === 0x05 && buffer[3] === 0x06) ||
      (buffer[2] === 0x07 && buffer[3] === 0x08)
    )
  );
}

function safeBaseName(originalName) {
  const parsed = path.parse(path.basename(originalName || "document"));
  const name = parsed.name
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 100);

  return name || "document";
}

function setDownloadHeaders(res, contentType, filename, length) {
  res.set({
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": String(length),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
}

/* -------------------------------------------------------
   LibreOffice conversion
------------------------------------------------------- */

async function runLibreOffice(
  inputPath,
  outputDir,
  profileDir,
  format
) {
  await fs.mkdir(profileDir, { recursive: true });

  const normalizedProfilePath = profileDir.replace(/\\/g, "/");
  const profileUrl = `file:///${normalizedProfilePath.replace(/^\/+/, "")}`;

  await execFileAsync(
    soffice,
    [
      "--headless",
      "--nologo",
      "--nodefault",
      "--nolockcheck",
      "--norestore",
      `-env:UserInstallation=${profileUrl}`,
      "--convert-to",
      format,
      "--outdir",
      outputDir,
      inputPath,
    ],
    {
      timeout: CONVERSION_TIMEOUT_MS,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
    }
  );
}

async function convertDocxToPdf(req, res) {
  let workDir;

  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: "Upload one DOCX file using the 'file' field.",
      });
    }

    if (file.size === 0) {
      return res.status(400).json({
        error: "The uploaded file is empty.",
      });
    }

    const originalName = path.basename(
      file.originalname || "document.docx"
    );

    if (path.extname(originalName).toLowerCase() !== ".docx") {
      return res.status(415).json({
        error: "Please upload a .docx file.",
      });
    }

    if (!hasZipSignature(file.buffer)) {
      return res.status(415).json({
        error: "The uploaded file is not a valid DOCX-style archive.",
      });
    }

    workDir = await fs.mkdtemp(
      path.join(tempRoot, `${randomUUID()}-`)
    );

    const inputPath = path.join(workDir, "input.docx");
    const outputDir = path.join(workDir, "output");
    const profileDir = path.join(workDir, "profile");

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(inputPath, file.buffer, { flag: "wx" });

    await runLibreOffice(
      inputPath,
      outputDir,
      profileDir,
      "pdf"
    );

    const outputPath = path.join(outputDir, "input.pdf");
    const output = await fs.readFile(outputPath).catch(() => null);

    if (!output || !hasPdfSignature(output)) {
      return res.status(422).json({
        error: "Conversion did not produce a valid PDF.",
      });
    }

    setDownloadHeaders(
      res,
      "application/pdf",
      `${safeBaseName(originalName)}.pdf`,
      output.length
    );

    return res.send(output);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error("LibreOffice executable was not found.");

      return res.status(503).json({
        error: "The document conversion engine is unavailable.",
      });
    }

    if (
      error.killed ||
      error.signal === "SIGTERM" ||
      error.code === "ETIMEDOUT"
    ) {
      return res.status(504).json({
        error: "Conversion timed out. Try a smaller document.",
      });
    }

    console.error("DOCX-to-PDF conversion failed:", error.message);

    return res.status(422).json({
      error:
        "DOCX-to-PDF conversion failed. The document may be damaged, encrypted, or unsupported.",
    });
  } finally {
    if (workDir) {
      await fs.rm(workDir, {
        recursive: true,
        force: true,
      }).catch(() => {});
    }
  }
}

/* -------------------------------------------------------
   PDF text extraction and DOCX generation
------------------------------------------------------- */

async function convertPdfToDocx(req, res) {
  let pdfDocument;

  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: "Upload one PDF using the 'file' field.",
      });
    }

    if (file.size === 0) {
      return res.status(400).json({
        error: "The uploaded file is empty.",
      });
    }

    const originalName = path.basename(
      file.originalname || "document.pdf"
    );

    if (path.extname(originalName).toLowerCase() !== ".pdf") {
      return res.status(415).json({
        error: "Please upload a .pdf file.",
      });
    }

    if (!hasPdfSignature(file.buffer)) {
      return res.status(415).json({
        error: "The uploaded file does not have a valid PDF signature.",
      });
    }

    const loadingTask = getDocument({
      data: new Uint8Array(file.buffer),
      useSystemFonts: true,
      isEvalSupported: false,
    });

    pdfDocument = await loadingTask.promise;

    if (pdfDocument.numPages > MAX_PDF_PAGES) {
      return res.status(413).json({
        error: `This PDF has too many pages. The current limit is ${MAX_PDF_PAGES} pages.`,
      });
    }

    const paragraphs = [];
    let totalCharacters = 0;

    for (
      let pageNumber = 1;
      pageNumber <= pdfDocument.numPages;
      pageNumber++
    ) {
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();

      let currentLine = "";

      for (const item of textContent.items) {
        if (!("str" in item)) continue;

        const text = item.str || "";
        currentLine += text;

        if (item.hasEOL) {
          const line = currentLine.trim();

          if (line) {
            totalCharacters += line.length;

            if (totalCharacters > MAX_EXTRACTED_CHARACTERS) {
              return res.status(413).json({
                error: "The extracted document text is too large.",
              });
            }

            paragraphs.push(
              new Paragraph({
                children: [new TextRun(line)],
              })
            );
          }

          currentLine = "";
        } else if (text && !text.endsWith(" ")) {
          currentLine += " ";
        }
      }

      const finalLine = currentLine.trim();

      if (finalLine) {
        totalCharacters += finalLine.length;

        if (totalCharacters > MAX_EXTRACTED_CHARACTERS) {
          return res.status(413).json({
            error: "The extracted document text is too large.",
          });
        }

        paragraphs.push(
          new Paragraph({
            children: [new TextRun(finalLine)],
          })
        );
      }

      await page.cleanup();
    }

    if (paragraphs.length === 0) {
      return res.status(422).json({
        error:
          "No selectable text was found. This may be a scanned PDF requiring OCR.",
      });
    }

    const wordDocument = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    const outputBuffer = await Packer.toBuffer(wordDocument);

    if (!outputBuffer || outputBuffer.length === 0) {
      return res.status(422).json({
        error: "The DOCX output could not be generated.",
      });
    }

    setDownloadHeaders(
      res,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      `${safeBaseName(originalName)}.docx`,
      outputBuffer.length
    );

    return res.send(outputBuffer);
    } catch (error) {
    console.error("PDF-to-DOCX conversion failed:", error.message);

    return res.status(422).json({
      error:
        "Could not extract text from this PDF. It may be encrypted, damaged, or unsupported.",
    });
  } finally {
    if (pdfDocument && typeof pdfDocument.cleanup === "function") {
      try {
        pdfDocument.cleanup();
      } catch (cleanupError) {
        console.warn("PDF.js cleanup warning:", cleanupError.message);
      }
    }
  }
}



/* -------------------------------------------------------
   Audio Lab — FFmpeg backend processing
------------------------------------------------------- */

const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";

const AUDIO_FORMATS = {
  ".mp3": {
    mime: "audio/mpeg",
    codec: ["-c:a", "libmp3lame", "-b:a", "192k"],
  },
  ".wav": {
    mime: "audio/wav",
    codec: ["-c:a", "pcm_s16le"],
  },
  ".flac": {
    mime: "audio/flac",
    codec: ["-c:a", "flac"],
  },
  ".ogg": {
    mime: "audio/ogg",
    codec: ["-c:a", "libvorbis", "-q:a", "5"],
  },
  ".oga": {
    mime: "audio/ogg",
    codec: ["-c:a", "libvorbis", "-q:a", "5"],
  },
  ".m4a": {
    mime: "audio/mp4",
    codec: ["-c:a", "aac", "-b:a", "192k"],
  },
  ".aac": {
    mime: "audio/aac",
    codec: ["-c:a", "aac", "-b:a", "192k"],
  },
  ".webm": {
    mime: "audio/webm",
    codec: ["-c:a", "libopus", "-b:a", "128k"],
  },
  ".aiff": {
    mime: "audio/aiff",
    codec: ["-c:a", "pcm_s16be"],
  },
  ".aif": {
    mime: "audio/aiff",
    codec: ["-c:a", "pcm_s16be"],
  },
};

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
    fields: 5,
    parts: 6,
  },
});

async function processAudio(req, res) {
  let workDir;

  try {
    const file = req.file;

    if (!file || !file.size) {
      return res.status(400).json({
        error: "Upload a non-empty audio file.",
      });
    }

    const originalName = path.basename(file.originalname || "audio.mp3");
    const inputExt = path.extname(originalName).toLowerCase();

    if (!Object.hasOwn(AUDIO_FORMATS, inputExt)) {
      return res.status(415).json({
        error: "Unsupported audio format.",
      });
    }

    const { action, outputFormat, startTime, endTime, volume } = req.body;

    if (!["trim", "volume"].includes(action)) {
      return res.status(400).json({
        error: "Choose trim or volume adjustment.",
      });
    }

    if (!["original", "mp3", "wav", "webm"].includes(outputFormat)) {
      return res.status(400).json({
        error: "Unsupported output format.",
      });
    }

    const start = Number(startTime);
    const end = Number(endTime);
    const gain = Number(volume);

    if (
      !Number.isFinite(gain) ||
      gain < 0 ||
      gain > 200
    ) {
      return res.status(400).json({
        error: "Volume must be between 0 and 200 percent.",
      });
    }

    if (
      action === "trim" &&
      (!Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end <= start)
    ) {
      return res.status(400).json({
        error: "Enter a valid start and end time.",
      });
    }

    const outputExt =
      outputFormat === "original"
        ? inputExt
        : `.${outputFormat}`;

    const format = AUDIO_FORMATS[outputExt];

    if (!format) {
      return res.status(415).json({
        error: "The requested output format is unsupported.",
      });
    }

    workDir = await fs.mkdtemp(
      path.join(tempRoot, `${randomUUID()}-`)
    );

    const inputPath = path.join(workDir, `input${inputExt}`);
    const outputPath = path.join(workDir, `output${outputExt}`);

    await fs.writeFile(inputPath, file.buffer, { flag: "wx" });

    const args = [
      "-nostdin",
      "-hide_banner",
      "-loglevel", "error",
      "-y",
    ];

    if (action === "trim") {
      args.push("-ss", String(start));
    }

    args.push("-i", inputPath, "-map", "0:a:0", "-vn");

    if (action === "trim") {
      args.push("-t", String(end - start));
    }

    if (action === "volume") {
      args.push("-af", `volume=${gain / 100}`);
    }

    args.push(
      ...format.codec,
      "-f",
      outputExt === ".m4a" ? "ipod" :
      outputExt === ".oga" ? "ogg" :
      outputExt === ".aiff" || outputExt === ".aif" ? "aiff" :
      outputExt.slice(1),
      outputPath
    );

    await execFileAsync(ffmpegPath, args, {
      timeout: CONVERSION_TIMEOUT_MS,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
    });

    const output = await fs.readFile(outputPath);

    if (!output.length) {
      return res.status(422).json({
        error: "FFmpeg produced an empty audio file.",
      });
    }

    const suffix = action === "trim" ? "trimmed" : "volume-adjusted";
    const filename = `${safeBaseName(originalName)}_${suffix}${outputExt}`;

    setDownloadHeaders(res, format.mime, filename, output.length);

    return res.send(output);
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(503).json({
        error: "FFmpeg was not found. Check FFMPEG_PATH in apps/api/.env.",
      });
    }

    if (
      error.killed ||
      error.signal === "SIGTERM" ||
      error.code === "ETIMEDOUT"
    ) {
      return res.status(504).json({
        error: "Audio processing timed out. Try a shorter or smaller file.",
      });
    }

    console.error("Audio processing failed:", error.message);

    return res.status(422).json({
      error: "Audio processing failed. Check that the input file is valid and contains an audio stream.",
    });
  } finally {
    if (workDir) {
      await fs.rm(workDir, {
        recursive: true,
        force: true,
      }).catch(() => {});
    }
  }
}

app.post(
  "/api/audio/process",
  audioUpload.single("file"),
  processAudio
);



/* -------------------------------------------------------
   Document conversion routes
------------------------------------------------------- */

app.post(
  "/api/documents/docx-to-pdf",
  upload.single("file"),
  convertDocxToPdf
);

app.post(
  "/api/documents/pdf-to-docx",
  upload.single("file"),
  convertPdfToDocx
);

/* -------------------------------------------------------
   Centralized error handling
------------------------------------------------------- */

app.use((err, _req, res, _next) => {
  if (err.message === "Origin not allowed by FileFluxa API") {
    return res.status(403).json({
      error: "This website origin is not allowed.",
    });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: `File exceeds the ${MAX_UPLOAD_MB} MB upload limit.`,
      });
    }

    return res.status(400).json({
      error: "Invalid file upload.",
    });
  }

  console.error("API error:", err.message);

  if (res.headersSent) {
    return;
  }

  return res.status(500).json({
    error: "Internal server error.",
  });
});

/* -------------------------------------------------------
   Start server
------------------------------------------------------- */

app.listen(port, "0.0.0.0", () => {
  console.log(`FileFluxa API listening on port ${port}`);
  console.log(`Upload limit: ${MAX_UPLOAD_MB} MB`);
  console.log(`LibreOffice executable: ${soffice}`);
});
