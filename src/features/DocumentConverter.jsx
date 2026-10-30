import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileDropZone,
  FileQueue,
  ProcessingMachine,
  ResultPanel,
} from '../components/ProcessingComponents'
import { FileCode, FileText, ShieldCheck } from 'lucide-react'

const OPTIONS = [
  { id: 'csv-to-json', label: 'CSV to JSON', accepts: '.csv' },
  { id: 'json-to-csv', label: 'JSON to CSV', accepts: '.json' },
  { id: 'csv-to-xlsx', label: 'CSV to Excel (.xlsx)', accepts: '.csv' },
  { id: 'xlsx-to-csv', label: 'Excel to CSV', accepts: '.xlsx,.xls' },
  { id: 'xlsx-to-json', label: 'Excel to JSON', accepts: '.xlsx,.xls' },
  { id: 'json-to-xlsx', label: 'JSON to Excel (.xlsx)', accepts: '.json' },
  { id: 'txt-upper', label: 'Uppercase TXT / Markdown', accepts: '.txt,.md,.markdown' },
  { id: 'extract-docx', label: 'Extract text from DOCX', accepts: '.docx' },
  { id: 'extract-pdf', label: 'Extract text from PDF', accepts: '.pdf' },
  { id: 'txt-to-docx', label: 'TXT / Markdown to DOCX', accepts: '.txt,.md,.markdown' },
  { id: 'txt-to-pdf', label: 'TXT / Markdown to PDF', accepts: '.txt,.md,.markdown' },
  { id: 'docx-to-txt', label: 'DOCX to TXT', accepts: '.docx' },
  { id: 'pdf-to-txt', label: 'PDF to TXT', accepts: '.pdf' },
  { id: 'docx-to-pdf', label: 'DOCX to PDF', accepts: '.docx' },
  { id: 'pdf-to-docx', label: 'PDF to editable DOCX (text extraction)', accepts: '.pdf' },
  { id: 'rtf-to-txt', label: 'RTF to TXT (basic)', accepts: '.rtf' },
  { id: 'txt-to-rtf', label: 'TXT to RTF', accepts: '.txt,.md,.markdown' },
]

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function csvToRows(input) {
  const text = String(input ?? '').replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (quoted) {
        quoted = false
      } else if (cell.length === 0) {
        quoted = true
      } else {
        throw new Error('CSV contains a quote inside an unquoted field. Check the source file formatting.')
      }
    } else if (char === ',' && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(cell)
      if (row.some(value => value !== '')) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  if (quoted) throw new Error('CSV contains an unclosed quoted field.')
  row.push(cell)
  if (row.some(value => value !== '')) rows.push(row)
  return rows
}

function rowsToCsv(rows) {
  return rows
    .map(row =>
      row
        .map(value => {
          let text
          if (value == null) text = ''
          else if (typeof value === 'object') text = JSON.stringify(value)
          else text = String(value)

          return /[",\r\n]/.test(text)
            ? `"${text.replace(/"/g, '""')}"`
            : text
        })
        .join(','),
    )
    .join('\r\n')
}

function baseName(name) {
  return name.replace(/\.[^.]+$/, '') || 'document'
}

function rowsToRecords(rows) {
  if (!rows.length) throw new Error('The CSV file is empty.')

  const headers = rows[0].map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim(),
  )
  if (headers.some(header => !header)) {
    throw new Error('CSV contains an empty column heading. Add a name to every column.')
  }
  if (new Set(headers).size !== headers.length) {
    throw new Error('CSV contains duplicate column headings. Rename duplicate headings before converting.')
  }

  return rows.slice(1).map(row =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])),
  )
}

function normalizeRecords(data) {
  const records = Array.isArray(data) ? data : [data]
  if (
    !records.length ||
    records.some(
      item => !item || typeof item !== 'object' || Array.isArray(item),
    )
  ) {
    throw new Error('JSON must contain an object or an array of objects.')
  }
  return records
}

async function extractPdfText(file) {
  const pdfjsLib = await import('pdfjs-dist')
  const workerUrl = (
    await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ).default

  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

  const data = new Uint8Array(await file.arrayBuffer())
  if (!data.length) throw new Error('The selected PDF file is empty.')

  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    isEvalSupported: false,
  })

  let pdf = null

  try {
    pdf = await loadingTask.promise
    const pages = []
    let totalTextItems = 0
    let totalCharacters = 0

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)

      try {
        const content = await page.getTextContent({
          includeMarkedContent: false,
          disableNormalization: false,
        })

        const items = content.items.filter(
          item => typeof item.str === 'string' && item.str.length > 0,
        )
        totalTextItems += items.length

        // Preserve PDF.js's content order first. Sorting every item by exact
        // coordinates can scramble text in multi-column and tightly spaced PDFs.
        let pageText = ''
        let previousItem = null

        for (const item of items) {
          const value = item.str ?? ''
          if (!value) continue

          if (previousItem) {
            const currentY = item.transform?.[5]
            const previousY = previousItem.transform?.[5]
            const currentX = item.transform?.[4]
            const previousEndX =
              (previousItem.transform?.[4] ?? 0) + (previousItem.width ?? 0)

            const lineChanged =
              Number.isFinite(currentY) &&
              Number.isFinite(previousY) &&
              Math.abs(currentY - previousY) > 3
            const hasHorizontalGap =
              Number.isFinite(currentX) && currentX - previousEndX > 2

            if (previousItem.hasEOL || lineChanged) {
              pageText = pageText.trimEnd() + '\n'
            } else if (
              hasHorizontalGap &&
              !pageText.endsWith(' ') &&
              !pageText.endsWith('\n') &&
              !value.startsWith(' ')
            ) {
              pageText += ' '
            }
          }

          pageText += value
          previousItem = item
        }

        // If PDF.js returned text items but their positioning metadata was
        // unusual, fall back to joining their strings in the original order.
        pageText = pageText.trim()
        if (!pageText && items.length) {
          pageText = items.map(item => item.str).join(' ').trim()
        }

        totalCharacters += pageText.length
        pages.push(`--- Page ${pageNumber} ---\n${pageText}`)
      } finally {
        page.cleanup()
      }
    }

    const result = pages.join('\n\n').trim()
    const contentOnly = result.replace(/--- Page \d+ ---/g, '').trim()

    if (totalTextItems === 0 || totalCharacters === 0 || !contentOnly) {
      throw new Error(
        'PDF.js could not extract selectable text from this PDF. ' +
          'If you can select and copy text from the same file in a PDF reader, ' +
          'the document may use unusual text encoding or font mappings. ' +
          'This converter currently extracts embedded text; scanned/image-only PDFs require OCR.',
      )
    }

    return result
  } catch (error) {
    if (error instanceof Error && /could not extract selectable text/i.test(error.message)) {
      throw error
    }
    console.error('PDF text extraction failed:', error)
    throw new Error(
      `Could not read this PDF (${error?.message || 'unknown PDF.js error'}). ` +
        'Try opening and saving a fresh copy of the PDF, then try again.',
    )
  } finally {
    if (pdf && typeof pdf.destroy === 'function') {
      await pdf.destroy()
    } else if (typeof loadingTask.destroy === 'function') {
      await loadingTask.destroy()
    }
  }
}

function assertPdfCompatibleText(text) {
  // pdf-lib StandardFonts use WinAnsi encoding; fail clearly instead of silently
  // producing missing glyphs or a broken output for unsupported Unicode.
  const unsupported = [...text].find(char => {
    const code = char.codePointAt(0)
    return code > 255 && !'\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u20ac'.includes(char)
  })
  if (unsupported) {
    throw new Error(
      `This PDF generator cannot reliably render "${unsupported}" or some non-Latin characters with its built-in font. Use TXT → DOCX for Unicode text, or use a PDF workflow with an embedded Unicode font.`,
    )
  }
}

async function createPdf(inputText) {
  const text = String(inputText ?? '').replace(/\r\n?/g, '\n')
  if (!text.trim()) throw new Error('The source file contains no text to place in the PDF.')
  assertPdfCompatibleText(text)

  const { PDFDocument, StandardFonts } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 48
  const fontSize = 11
  const lineHeight = 15
  const maxWidth = pageWidth - margin * 2
  const lines = []

  for (const paragraph of text.split('\n')) {
    if (!paragraph) {
      lines.push('')
      continue
    }

    let current = ''
    for (const word of paragraph.split(/\s+/)) {
      // Wrap very long tokens too, so a long URL or unbroken string cannot
      // run beyond the page's right edge.
      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
        if (current) {
          lines.push(current)
          current = ''
        }
        let chunk = ''
        for (const char of word) {
          const candidate = chunk + char
          if (chunk && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
            lines.push(chunk)
            chunk = char
          } else {
            chunk = candidate
          }
        }
        current = chunk
        continue
      }

      const candidate = current ? `${current} ${word}` : word
      if (current && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
        lines.push(current)
        current = word
      } else {
        current = candidate
      }
    }
    lines.push(current)
  }

  const perPage = Math.floor((pageHeight - margin * 2) / lineHeight)
  for (let index = 0; index < Math.max(lines.length, 1); index += perPage) {
    const page = pdf.addPage([pageWidth, pageHeight])
    let y = pageHeight - margin
    for (const line of lines.slice(index, index + perPage)) {
      if (line) page.drawText(line, { x: margin, y, size: fontSize, font })
      y -= lineHeight
    }
  }

  const bytes = await pdf.save()
  if (!bytes?.length) throw new Error('PDF generation returned an empty file.')
  return new Blob([bytes], { type: 'application/pdf' })
}

async function makeDocx(text) {
  const { Document, Packer, Paragraph } = await import('docx')
  const normalized = String(text ?? '').replace(/\r\n?/g, '\n')
  if (!normalized.trim()) throw new Error('There is no text to put into the DOCX file.')

  const children = normalized.split('\n').map(line =>
    new Paragraph({ text: line || ' ' }),
  )
  const document = new Document({
    sections: [{ properties: {}, children }],
  })
  return Packer.toBlob(document)
}

function basicRtfToText(rtf) {
  // This is intentionally a conservative, basic RTF text reader. Full RTF
  // interpretation requires a dedicated parser.
  return rtf
    .replace(/\\par[d]?\b/g, '\n')
    .replace(/\\line\b/g, '\n')
    .replace(/\\tab\b/g, '\t')
    .replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/\\u(-?\d+)\??/g, (_, code) => {
      const value = Number(code)
      return String.fromCharCode(value < 0 ? value + 65536 : value)
    })
    .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
    .replace(/\\([{}\\])/g, '$1')
    .replace(/[{}]/g, '')
}

export function DocumentConverter() {
  const [files, setFiles] = useState([])
  const [action, setAction] = useState('csv-to-json')
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)

  const option = OPTIONS.find(item => item.id === action) || OPTIONS[0]

  useEffect(() => {
    return () => {
      if (result?.url) URL.revokeObjectURL(result.url)
    }
  }, [result])

  const resetState = () => {
    setFiles([])
    setResult(null)
    setStatus('idle')
    setProgress(0)
    setMessage('')
  }

  const handleProcess = async () => {
    if (!files.length || status === 'processing') return

    const file = files[0]
    const ext = file.name.includes('.')
      ? file.name.split('.').pop().toLowerCase()
      : ''

    if (!option.accepts.split(',').includes(`.${ext}`)) {
      setStatus('failed')
      setMessage(`This conversion does not support .${ext || 'unknown'} files.`)
      return
    }

    setStatus('processing')
    setProgress(10)
    setMessage('Reading file locally in your browser...')

    try {
      let blob
      let outputExt
      const name = baseName(file.name)

      if (action === 'csv-to-json') {
        const rows = csvToRows(await file.text())
        const records = rowsToRecords(rows)
        blob = new Blob([JSON.stringify(records, null, 2)], {
          type: 'application/json;charset=utf-8',
        })
        outputExt = 'json'
      } else if (action === 'json-to-csv') {
        const records = normalizeRecords(JSON.parse(await file.text()))
        const headers = [...new Set(records.flatMap(Object.keys))]
        if (!headers.length) throw new Error('No object fields were found in the JSON.')
        blob = new Blob(
          [rowsToCsv([headers, ...records.map(item => headers.map(key => item[key] ?? ''))])],
          { type: 'text/csv;charset=utf-8' },
        )
        outputExt = 'csv'
      } else if (
        ['csv-to-xlsx', 'xlsx-to-csv', 'xlsx-to-json', 'json-to-xlsx'].includes(action)
      ) {
        setMessage('Loading spreadsheet engine...')
        setProgress(30)
        const XLSX = await import('xlsx')

        if (action === 'csv-to-xlsx') {
          const rows = csvToRows(await file.text())
          if (!rows.length) throw new Error('The CSV file is empty.')
          const workbook = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
          blob = new Blob(
            [XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })],
            { type: XLSX_MIME },
          )
          outputExt = 'xlsx'
        } else if (action === 'xlsx-to-csv' || action === 'xlsx-to-json') {
          const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : null
          if (!sheet) throw new Error('The spreadsheet has no worksheets.')
          if (action === 'xlsx-to-csv') {
            const csv = XLSX.utils.sheet_to_csv(sheet)
            if (!csv.trim()) throw new Error('The first worksheet contains no data.')
            blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
            outputExt = 'csv'
          } else {
            const records = XLSX.utils.sheet_to_json(sheet, { defval: '' })
            if (!records.length) throw new Error('The first worksheet contains no data rows.')
            blob = new Blob([JSON.stringify(records, null, 2)], {
              type: 'application/json;charset=utf-8',
            })
            outputExt = 'json'
          }
        } else {
          const records = normalizeRecords(JSON.parse(await file.text()))
          const workbook = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(records), 'Sheet1')
          blob = new Blob(
            [XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })],
            { type: XLSX_MIME },
          )
          outputExt = 'xlsx'
        }
      } else if (action === 'rtf-to-txt') {
        const plain = basicRtfToText(await file.text())
        if (!plain.trim()) throw new Error('No readable text was found in the RTF file.')
        blob = new Blob([plain], { type: 'text/plain;charset=utf-8' })
        outputExt = 'txt'
      } else if (action === 'txt-to-rtf') {
        const text = await file.text()
        const escaped = text
          .replace(/\\/g, '\\\\')
          .replace(/{/g, '\\{')
          .replace(/}/g, '\\}')
          .replace(/\r\n?/g, '\n')
          .replace(/\n/g, '\\par\n')
        blob = new Blob([`{\\rtf1\\ansi\\deff0\\uc1 ${escaped}}`], {
          type: 'application/rtf;charset=utf-8',
        })
        outputExt = 'rtf'
      } else if (action === 'txt-upper') {
        const text = await file.text()
        if (!text.length) throw new Error('The source file is empty.')
        blob = new Blob([text.toUpperCase()], { type: 'text/plain;charset=utf-8' })
        outputExt = ext === 'markdown' ? 'md' : ext
      } else if (action === 'extract-docx' || action === 'docx-to-txt') {
        setProgress(35)
        const mammoth = await import('mammoth')
        const extracted = await mammoth.extractRawText({
          arrayBuffer: await file.arrayBuffer(),
        })
        if (!extracted.value.trim()) {
          throw new Error('No extractable paragraph text was found in this DOCX. It may contain only images or unsupported content.')
        }
        blob = new Blob([extracted.value], { type: 'text/plain;charset=utf-8' })
        outputExt = 'txt'
      } else if (action === 'extract-pdf' || action === 'pdf-to-txt') {
        setProgress(35)
        const text = await extractPdfText(file)
        blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
        outputExt = 'txt'

      } else if (action === 'docx-to-pdf' || action === 'pdf-to-docx') {
        const isDocxToPdf = action === 'docx-to-pdf'
        const endpoint = isDocxToPdf
          ? '/api/documents/docx-to-pdf'
          : '/api/documents/pdf-to-docx'

        outputExt = isDocxToPdf ? 'pdf' : 'docx'

        setProgress(20)
        setMessage('Preparing your document for server-side conversion...')

        const formData = new FormData()
        formData.append('file', file)

        const apiBaseUrl = (
          import.meta.env.VITE_API_BASE_URL || ''
        ).replace(/\/+$/, '')

        setProgress(30)
        setMessage('Uploading document securely to the conversion API...')

        const response = await fetch(`${apiBaseUrl}${endpoint}`, {
          method: 'POST',
          body: formData,
        })

        setProgress(75)
        setMessage('Processing document and preparing your download...')

        if (!response.ok) {
          let errorMessage = `Conversion failed (HTTP ${response.status}).`

          try {
            const errorData = await response.json()
            if (errorData?.error) errorMessage = errorData.error
          } catch {
            // Keep the HTTP error message if the response is not JSON.
          }

          throw new Error(errorMessage)
        }

        blob = await response.blob()

        if (!blob.size) {
          throw new Error('The conversion API returned an empty file.')
        }

      } else if (action === 'txt-to-docx') {
        blob = await makeDocx(await file.text())
        outputExt = 'docx'
      } else if (action === 'txt-to-pdf') {
        blob = await createPdf(await file.text())
        outputExt = 'pdf'
      } else {
        throw new Error('Unsupported conversion option.')
      }

      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error('The conversion produced an empty file. Check the source content and try again.')
      }

      const url = URL.createObjectURL(blob)
      setResult({
        name: `${name}_converted.${outputExt}`,
        size: blob.size,
        url,
        blob,
      })
      setProgress(100)
      setStatus('completed')
      setMessage(`Conversion completed. Output: ${(blob.size / 1024).toFixed(1)} KB.`)
    } catch (error) {
      console.error('Document conversion failed:', error)
      setProgress(0)
      setStatus('failed')
      setMessage(error?.message || 'Conversion failed. Please check the source file.')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="mx-auto w-full max-w-7xl space-y-6 pb-8"
    >
      <header>
        <div className="mb-2 flex items-center gap-3 text-cyan-700">
          <FileCode className="h-6 w-6" />
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Document &amp; Data Converter
          </h1>
        </div>
        <p className="text-sm text-slate-600">
          Convert TXT, Markdown, CSV, JSON, DOCX, spreadsheets, RTF and text-based PDFs locally.
        </p>
        <p className="mt-2 flex items-center gap-2 text-xs text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          Most conversions run in your browser. DOCX/PDF conversions upload your file to the FileFluxa conversion API for processing.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="min-w-0 space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <label
              htmlFor="document-action"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Conversion type
            </label>
            <select
              id="document-action"
              value={action}
              onChange={event => {
                setAction(event.target.value)
                resetState()
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-400"
            >
              {OPTIONS.map(item => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">Accepted input: {option.accepts}</p>
          </div>

          <FileDropZone
            key={action}
            accept={option.accepts}
            multiple={false}
            onFilesSelected={selected => {
              setFiles(selected)
              setResult(null)
              setStatus('idle')
              setProgress(0)
              setMessage('')
            }}
          />

          <FileQueue
            files={files}
            onRemove={() => {
              setFiles([])
              setResult(null)
              setStatus('idle')
              setProgress(0)
              setMessage('')
            }}
            onClear={() => {
              setFiles([])
              setResult(null)
              setStatus('idle')
              setProgress(0)
              setMessage('')
            }}
          />

          {files.length > 0 && status !== 'processing' && status !== 'completed' && (
            <button
              type="button"
              onClick={handleProcess}
              className="w-full rounded-xl bg-cyan-600 py-4 font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Convert Document
            </button>
          )}

          <ProcessingMachine status={status} progress={progress} message={message} />
          <ResultPanel
            result={result}
            onDownload={() => {
              if (!result?.url) return
              const anchor = document.createElement('a')
              anchor.href = result.url
              anchor.download = result.name
              document.body.appendChild(anchor)
              anchor.click()
              anchor.remove()
            }}
          />
        </section>

        <aside className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900">Supported conversions</h3>
          <div className="space-y-3 text-sm text-slate-700">
            <p className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" /> CSV ↔ JSON and Excel</p>
            <p className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" /> TXT / Markdown → PDF, DOCX, RTF</p>
            <p className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" /> DOCX → TXT / basic PDF</p>
            <p className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" /> PDF → TXT / editable DOCX</p>
            <p className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" /> Basic RTF → TXT</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200">
            DOCX/PDF conversions here are text-focused and do not preserve the full original layout, images or tables. Scanned PDFs need OCR. The built-in PDF font cannot render every Unicode script; unsupported text is reported instead of silently producing broken output.
          </div>
        </aside>
      </div>
    </motion.div>
  )
}
