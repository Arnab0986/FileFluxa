
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
  { id: 'docx-to-pdf', label: 'DOCX to PDF (text only)', accepts: '.docx' },
  { id: 'pdf-to-docx', label: 'PDF to editable DOCX', accepts: '.pdf' },
  { id: 'rtf-to-txt', label: 'RTF to TXT (basic)', accepts: '.rtf' },
  { id: 'txt-to-rtf', label: 'TXT to RTF', accepts: '.txt,.md,.markdown' },
]

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function baseName(name) {
  return name.replace(/\.[^.]+$/, '') || 'document'
}

function csvToRows(input) {
  const text = String(input ?? '').replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"'
        i++
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++
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
  return rows.map(row =>
    row.map(value => {
      const text =
        value == null
          ? ''
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value)

      return /[",\r\n]/.test(text)
        ? `"${text.replace(/"/g, '""')}"`
        : text
    }).join(',')
  ).join('\r\n')
}

function csvToRecords(rows) {
  if (!rows.length) throw new Error('The CSV file is empty.')

  const headers = rows[0].map(value => String(value ?? '').trim())

  if (headers.some(header => !header)) {
    throw new Error('Every CSV column must have a heading.')
  }

  if (new Set(headers).size !== headers.length) {
    throw new Error('Duplicate CSV column headings are not supported.')
  }

  return rows.slice(1).map(row =>
    Object.fromEntries(
      headers.map((header, index) => [header, row[index] ?? ''])
    )
  )
}

function normalizeRecords(data) {
  const records = Array.isArray(data) ? data : [data]

  if (
    !records.length ||
    records.some(item => !item || typeof item !== 'object' || Array.isArray(item))
  ) {
    throw new Error('JSON must contain an object or an array of objects.')
  }

  return records
}

async function extractPdfText(file) {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')

  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  })
  const pdf = await loadingTask.promise
  const pages = []

  try {
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number)
      const content = await page.getTextContent()
      const lines = new Map()

      for (const item of content.items) {
        if (!item.str?.trim()) continue

        const y = Math.round(item.transform?.[5] ?? 0)
        if (!lines.has(y)) lines.set(y, [])
        lines.get(y).push({
          x: item.transform?.[4] ?? 0,
          width: item.width ?? 0,
          text: item.str,
        })
      }

      const text = [...lines.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, items]) => {
          items.sort((a, b) => a.x - b.x)
          let output = ''
          let previous = null

          for (const item of items) {
            if (
              previous &&
              item.x - (previous.x + previous.width) > 2 &&
              !output.endsWith(' ')
            ) {
              output += ' '
            }
            output += item.text
            previous = item
          }

          return output.trim()
        })
        .filter(Boolean)
        .join('\n')

      pages.push(`--- Page ${number} ---\n${text}`)
      page.cleanup()
    }

    const result = pages.join('\n\n').trim()

    if (!result.replace(/--- Page \d+ ---/g, '').trim()) {
      throw new Error(
        'No selectable text found. Scanned PDFs require OCR.'
      )
    }

    return result
  } finally {
    if (typeof pdf.destroy === 'function') await pdf.destroy()
    else if (typeof loadingTask.destroy === 'function') await loadingTask.destroy()
  }
}

async function makeDocx(text) {
  const { Document, Packer, Paragraph } = await import('docx')
  const normalized = String(text ?? '').replace(/\r\n?/g, '\n')

  if (!normalized.trim()) {
    throw new Error('The source file contains no text.')
  }

  const document = new Document({
    sections: [{
      properties: {},
      children: normalized.split('\n').map(line =>
        new Paragraph({ text: line || ' ' })
      ),
    }],
  })

  return Packer.toBlob(document)
}

async function makePdf(text) {
  const { PDFDocument, StandardFonts } = await import('pdf-lib')
  const normalized = String(text ?? '').replace(/\r\n?/g, '\n')

  if (!normalized.trim()) throw new Error('The source file contains no text.')

  const unsupported = [...normalized].find(char => char.codePointAt(0) > 255)

  if (unsupported) {
    throw new Error(
      'The built-in PDF font cannot render some Unicode characters. Try TXT to DOCX instead.'
    )
  }

  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 48
  const fontSize = 11
  const lineHeight = 15
  const maxWidth = pageWidth - margin * 2
  const lines = []

  for (const paragraph of normalized.split('\n')) {
    if (!paragraph) {
      lines.push('')
      continue
    }

    let current = ''

    for (const word of paragraph.split(/\s+/)) {
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

  const linesPerPage = Math.floor(
    (pageHeight - margin * 2) / lineHeight
  )

  for (let i = 0; i < lines.length; i += linesPerPage) {
    const page = pdf.addPage([pageWidth, pageHeight])
    let y = pageHeight - margin

    for (const line of lines.slice(i, i + linesPerPage)) {
      if (line) page.drawText(line, { x: margin, y, size: fontSize, font })
      y -= lineHeight
    }
  }

  return new Blob([await pdf.save()], { type: 'application/pdf' })
}

function rtfToText(rtf) {
  return rtf
    .replace(/\\par[d]?\b/g, '\n')
    .replace(/\\line\b/g, '\n')
    .replace(/\\tab\b/g, '\t')
    .replace(/\\'[0-9a-fA-F]{2}/g, '')
    .replace(/\\u(-?\d+)\??/g, (_, code) =>
      String.fromCharCode(Number(code) < 0 ? Number(code) + 65536 : Number(code))
    )
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

  function resetState() {
    setFiles([])
    setResult(null)
    setStatus('idle')
    setProgress(0)
    setMessage('')
  }

  async function handleProcess() {
    if (!files.length || status === 'processing') return

    const file = files[0]
    const ext = file.name.split('.').pop().toLowerCase()

    if (!option.accepts.split(',').includes(`.${ext}`)) {
      setStatus('failed')
      setMessage(`This conversion does not support .${ext} files.`)
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
        const records = csvToRecords(csvToRows(await file.text()))
        blob = new Blob([JSON.stringify(records, null, 2)], {
          type: 'application/json;charset=utf-8',
        })
        outputExt = 'json'
      } else if (action === 'json-to-csv') {
        const records = normalizeRecords(JSON.parse(await file.text()))
        const headers = [...new Set(records.flatMap(Object.keys))]
        if (!headers.length) throw new Error('No object fields were found.')

        blob = new Blob([
          rowsToCsv([headers, ...records.map(row => headers.map(key => row[key] ?? ''))]),
        ], { type: 'text/csv;charset=utf-8' })
        outputExt = 'csv'
      } else if ([
        'csv-to-xlsx',
        'xlsx-to-csv',
        'xlsx-to-json',
        'json-to-xlsx',
      ].includes(action)) {
        setMessage('Loading spreadsheet engine...')
        setProgress(35)

        const XLSX = await import('xlsx')

        if (action === 'csv-to-xlsx') {
          const rows = csvToRows(await file.text())
          if (!rows.length) throw new Error('The CSV file is empty.')

          const workbook = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(
            workbook,
            XLSX.utils.aoa_to_sheet(rows),
            'Sheet1'
          )

          blob = new Blob([
            XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }),
          ], { type: XLSX_MIME })
          outputExt = 'xlsx'
        } else if (action === 'xlsx-to-csv' || action === 'xlsx-to-json') {
          const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]

          if (!firstSheet) throw new Error('No worksheet found in the spreadsheet.')

          if (action === 'xlsx-to-csv') {
            const csv = XLSX.utils.sheet_to_csv(firstSheet)
            if (!csv.trim()) throw new Error('The worksheet contains no data.')
            blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
            outputExt = 'csv'
          } else {
            const records = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
            blob = new Blob([JSON.stringify(records, null, 2)], {
              type: 'application/json;charset=utf-8',
            })
            outputExt = 'json'
          }
        } else {
          const records = normalizeRecords(JSON.parse(await file.text()))
          const workbook = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(
            workbook,
            XLSX.utils.json_to_sheet(records),
            'Sheet1'
          )

          blob = new Blob([
            XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }),
          ], { type: XLSX_MIME })
          outputExt = 'xlsx'
        }
      } else if (action === 'txt-upper') {
        const text = await file.text()
        if (!text.length) throw new Error('The source file is empty.')

        blob = new Blob([text.toUpperCase()], {
          type: 'text/plain;charset=utf-8',
        })
        outputExt = ext === 'markdown' ? 'md' : ext
      } else if (action === 'extract-docx' || action === 'docx-to-txt') {
        setProgress(35)
        const mammoth = await import('mammoth')
        const extracted = await mammoth.extractRawText({
          arrayBuffer: await file.arrayBuffer(),
        })

        if (!extracted.value.trim()) {
          throw new Error('No extractable text was found in this DOCX file.')
        }

        blob = new Blob([extracted.value], {
          type: 'text/plain;charset=utf-8',
        })
        outputExt = 'txt'
      } else if (action === 'extract-pdf' || action === 'pdf-to-txt') {
        setProgress(35)
        blob = new Blob([await extractPdfText(file)], {
          type: 'text/plain;charset=utf-8',
        })
        outputExt = 'txt'
      } else if (action === 'txt-to-docx') {
        blob = await makeDocx(await file.text())
        outputExt = 'docx'
      } else if (action === 'txt-to-pdf') {
        blob = await makePdf(await file.text())
        outputExt = 'pdf'
      } else if (action === 'docx-to-pdf') {
        setProgress(30)
        setMessage('Extracting text. Original layout and images may not be preserved.')

        const mammoth = await import('mammoth')
        const extracted = await mammoth.extractRawText({
          arrayBuffer: await file.arrayBuffer(),
        })

        blob = await makePdf(extracted.value)
        outputExt = 'pdf'
      } else if (action === 'pdf-to-docx') {
        setProgress(30)
        setMessage('Extracting selectable PDF text...')
        blob = await makeDocx(await extractPdfText(file))
        outputExt = 'docx'
      } else if (action === 'rtf-to-txt') {
        const text = rtfToText(await file.text())
        if (!text.trim()) throw new Error('No readable text was found in the RTF file.')

        blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
        outputExt = 'txt'
      } else if (action === 'txt-to-rtf') {
        const text = (await file.text())
          .replace(/\\/g, '\\\\')
          .replace(/{/g, '\\{')
          .replace(/}/g, '\\}')
          .replace(/\r\n?/g, '\n')
          .replace(/\n/g, '\\par\n')

        blob = new Blob([`{\\rtf1\\ansi\\deff0\\uc1 ${text}}`], {
          type: 'application/rtf;charset=utf-8',
        })
        outputExt = 'rtf'
      } else {
        throw new Error('Unsupported conversion option.')
      }

      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error('Conversion produced an empty file.')
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
      setMessage(`Conversion completed. Output size: ${(blob.size / 1024).toFixed(1)} KB.`)
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
          Convert TXT, Markdown, CSV, JSON, DOCX, spreadsheets, RTF and text-based PDFs.
        </p>

        <p className="mt-2 flex items-center gap-2 text-xs text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          Files are processed locally in your browser.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="min-w-0 space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              {OPTIONS.map(item => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-slate-500">
              Accepted input: {option.accepts}
            </p>
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

          <ProcessingMachine
            status={status}
            progress={progress}
            message={message}
          />

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

        <aside className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">
            Supported conversions
          </h3>

          <div className="space-y-3 text-sm text-slate-700">
            {[
              'CSV ↔ JSON and Excel',
              'TXT / Markdown → PDF, DOCX, RTF',
              'DOCX → TXT / basic PDF',
              'PDF → TXT / editable DOCX',
              'Basic RTF → TXT',
            ].map(item => (
              <p key={item} className="flex items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
                {item}
              </p>
            ))}
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            DOCX and PDF conversions are text-focused. Original layouts, images
            and tables may not be preserved. Scanned PDFs require OCR. The
            built-in PDF font does not support every writing system.
          </div>
        </aside>
      </div>
    </motion.div>
  )
}

export default DocumentConverter
