import React, { useState } from 'react'
import { AppShell } from '../components/AppShell'
import { FileDropZone, FileQueue, ProcessingMachine, ResultPanel } from '../components/ProcessingComponents'
import { FileText, Layers, Scissors, RotateCw } from 'lucide-react'
import { PDFDocument } from 'pdf-lib'

export function PdfLab() {
  const [files, setFiles] = useState([])
  const [action, setAction] = useState('merge') // merge, split, rotate
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)

  const handleProcess = async () => {
    if (files.length === 0) return
    setStatus('processing')
    setProgress(20)
    setMessage('Initializing PDF processing engine...')

    try {
      if (action === 'merge') {
        setProgress(40)
        setMessage('Loading PDF documents...')
        const mergedPdf = await PDFDocument.create()

        for (const file of files) {
          const arrayBuffer = await file.arrayBuffer()
          const pdfDoc = await PDFDocument.load(arrayBuffer)
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices())
          copiedPages.forEach((page) => mergedPdf.addPage(page))
        }

        setProgress(80)
        setMessage('Generating final PDF...')
        const pdfBytes = await mergedPdf.save()
        const blob = new Blob([pdfBytes], { type: 'application/pdf' })

        setResult({
          name: 'merged_document.pdf',
          size: blob.size,
          url: URL.createObjectURL(blob),
          blob
        })
        setStatus('completed')
        setProgress(100)
        setMessage('PDFs successfully merged!')
      } else if (action === 'split') {
        setProgress(40)
        setMessage('Loading source PDF...')
        const file = files[0]
        const arrayBuffer = await file.arrayBuffer()
        const pdfDoc = await PDFDocument.load(arrayBuffer)
        const subDoc = await PDFDocument.create()
        const [firstPage] = await subDoc.copyPages(pdfDoc, [0])
        subDoc.addPage(firstPage)

        setProgress(80)
        setMessage('Extracting first page...')
        const pdfBytes = await subDoc.save()
        const blob = new Blob([pdfBytes], { type: 'application/pdf' })

        setResult({
          name: `${file.name.replace('.pdf', '')}_page1.pdf`,
          size: blob.size,
          url: URL.createObjectURL(blob),
          blob
        })
        setStatus('completed')
        setProgress(100)
        setMessage('PDF page extracted successfully!')
      }
    } catch (err) {
      console.error(err)
      setStatus('failed')
      setMessage(err.message || 'PDF processing error.')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 text-cyan-400 mb-2">
          <FileText className="w-6 h-6" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white">PDF Lab</h1>
        </div>
        <p className="text-gray-400 text-sm">Merge, split, and manipulate PDF documents securely in your browser.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <FileDropZone
            accept="application/pdf"
            multiple={action === 'merge'}
            onFilesSelected={(selected) => {
              setFiles(action === 'merge' ? [...files, ...selected] : [selected[0]])
              setStatus('idle')
              setResult(null)
            }}
          />
          <FileQueue files={files} onRemove={(idx) => setFiles(files.filter((_, i) => i !== idx))} onClear={() => setFiles([])} />

          {files.length > 0 && status !== 'processing' && status !== 'completed' && (
            <button
              onClick={handleProcess}
              className="w-full py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold transition shadow-lg shadow-cyan-500/20"
            >
              Run PDF Operation
            </button>
          )}

          <ProcessingMachine status={status} progress={progress} message={message} />
          <ResultPanel result={result} onDownload={() => {
            const a = document.createElement('a')
            a.href = result.url
            a.download = result.name
            a.click()
          }} />
        </div>

        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-6">
          <h3 className="font-bold text-lg">PDF Lab Tools</h3>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase">Operation</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'merge', label: 'Merge PDFs' },
                { id: 'split', label: 'Extract Page 1' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setAction(opt.id)
                    setFiles([])
                    setResult(null)
                    setStatus('idle')
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                    action === opt.id
                      ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                      : 'bg-navy-950 border-navy-800 text-gray-400 hover:border-navy-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
