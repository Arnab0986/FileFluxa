
import express from "express";
import multer from "multer";
import JSZip from "jszip";
import path from "node:path";

const router = express.Router();

const MAX_UPLOAD_MB = Math.min(
  Math.max(Number(process.env.MAX_UPLOAD_MB || 25), 1),
  100
);

const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const MAX_FILES = 20;
const MAX_EXTRACTED_FILES = 200;
const MAX_EXTRACTED_BYTES = 100 * 1024 * 1024;

const createUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: MAX_FILES,
    fields: 0,
    parts: MAX_FILES,
  },
});

const extractUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
    fields: 0,
    parts: 1,
  },
});

function safeName(name) {
  const base = path.posix.basename(
    String(name || "file").replace(/\\/g, "/")
  );

  return base
    .replace(/[\r\n"]/g, "_")
    .replace(/[^\w.\- ()]/g, "_")
    .slice(0, 140) || "file";
}

function isZip(buffer) {
  return Buffer.isBuffer(buffer) &&
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (
      (buffer[2] === 0x03 && buffer[3] === 0x04) ||
      (buffer[2] === 0x05 && buffer[3] === 0x06) ||
      (buffer[2] === 0x07 && buffer[3] === 0x08)
    );
}

function safeArchivePath(name) {
  if (!name || name.includes("\0")) return null;

  const normalized = name.replace(/\\/g, "/");

  if (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split("/").includes("..")
  ) {
    return null;
  }

  const parts = normalized
    .split("/")
    .filter((part) => part && part !== ".")
    .map((part) =>
      part.replace(/[\x00-\x1f<>:"|?*]/g, "_").trim()
    )
    .filter(Boolean);

  return parts.length ? parts.join("/") : null;
}

function sendZip(res, filename, buffer) {
  res.set({
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${safeName(filename)}"`,
    "Content-Length": String(buffer.length),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });

  return res.send(buffer);
}

// POST /api/archives/create
// Form-data: files (multiple file fields)
router.post(
  "/create",
  createUpload.array("files", MAX_FILES),
  async (req, res, next) => {
    try {
      const files = req.files || [];

      if (!files.length) {
        return res.status(400).json({
          error: "Upload at least one file using the files field.",
        });
      }

      const zip = new JSZip();
      const usedNames = new Set();

      for (const file of files) {
        if (!file.buffer?.length) continue;

        const original = safeName(file.originalname);
        const parsed = path.posix.parse(original);
        let name = original;
        let suffix = 2;

        while (usedNames.has(name.toLowerCase())) {
          name = `${parsed.name}_${suffix++}${parsed.ext}`;
        }

        usedNames.add(name.toLowerCase());
        zip.file(name, file.buffer);
      }

      if (!usedNames.size) {
        return res.status(400).json({
          error: "The uploaded files are empty.",
        });
      }

      const output = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      return sendZip(res, "filefluxa_archive.zip", output);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/archives/extract
// Form-data: file (one ZIP archive)
// Returns a new ZIP containing the extracted files.
router.post(
  "/extract",
  extractUpload.single("file"),
  async (req, res, next) => {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          error: "Upload one ZIP using the file field.",
        });
      }

      if (!isZip(file.buffer)) {
        return res.status(400).json({
          error: "The uploaded file is not a valid ZIP archive.",
        });
      }

      let archive;

      try {
        archive = await JSZip.loadAsync(file.buffer, {
          checkCRC32: true,
          createFolders: false,
        });
      } catch {
        return res.status(400).json({
          error: "The ZIP archive is invalid or corrupted.",
        });
      }

      const entries = Object.values(archive.files).filter(
        (entry) => !entry.dir
      );

      if (!entries.length) {
        return res.status(400).json({
          error: "The ZIP archive contains no files.",
        });
      }

      if (entries.length > MAX_EXTRACTED_FILES) {
        return res.status(413).json({
          error: "The archive contains too many files.",
        });
      }

      const outputZip = new JSZip();
      let declaredTotal = 0;
      let actualTotal = 0;
      const names = new Set();

      for (const entry of entries) {
        const name = safeArchivePath(entry.name);

        if (!name) {
          return res.status(400).json({
            error: "The archive contains an unsafe file path.",
          });
        }

        const permissions = entry.unixPermissions;
        const fileType =
          typeof permissions === "number"
            ? (permissions >> 12) & 0xf
            : 0;

        if (fileType === 0xa) {
          return res.status(400).json({
            error: "Symbolic links are not allowed in ZIP archives.",
          });
        }

        const size = Number(entry._data?.uncompressedSize);

        if (!Number.isFinite(size) || size < 0) {
          return res.status(400).json({
            error: "The archive contains invalid size metadata.",
          });
        }

        declaredTotal += size;

        if (declaredTotal > MAX_EXTRACTED_BYTES) {
          return res.status(413).json({
            error: "Extracted content exceeds the 100 MB limit.",
          });
        }

        if (names.has(name.toLowerCase())) {
          return res.status(400).json({
            error: "The archive contains duplicate file paths.",
          });
        }

        names.add(name.toLowerCase());

        const data = await entry.async("nodebuffer");

        actualTotal += data.length;

        if (actualTotal > MAX_EXTRACTED_BYTES) {
          return res.status(413).json({
            error: "Extracted content exceeds the 100 MB limit.",
          });
        }

        outputZip.file(name, data);
      }

      const output = await outputZip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const base = safeName(file.originalname || "archive.zip")
        .replace(/\.zip$/i, "") || "archive";

      return sendZip(res, `${base}_extracted.zip`, output);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
