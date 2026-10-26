import React, { useState } from 'react'
import { AppShell } from '../components/AppShell'
import { FileDropZone, FileQueue, ProcessingMachine, ResultPanel } from '../components/ProcessingComponents'
import { FileCode, RefreshCw } from 'lucide-react'

export function DocumentConverter() {
  const [files, setFiles] = useState([])
  const [action, setAction] = useState('csv-to-json')
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)

  const handleProcess = async () => {
    if (files.length === 0) return
    setStatus('processing')
    setProgress(30)
    setMessage('Reading document content...')

    try {
      const file = files[0]
      const text = await file.text()
      setProgress(60)
      setMessage('Transforming data format...')

      let outputText = ''
      let ext = 'json'

      if (action === 'csv-to-json') {
        const lines = text.split(/\r?\n/).filter(Boolean)
        if (lines.length === 0) throw new Error('Empty CSV file.')
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
        const records = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
          const obj = {}
          headers.forEach((h, i) => { obj[h] = values[i] || '' })
          return obj
        })
        outputText = JSON.stringify(records, null, 2)
        ext = 'json'
      } else if (action === 'json-to-csv') {
        const data = JSON.parse(text)
        const array = Array.isArray(data) ? data : [data]
        if (array.length === 0) throw new Error('Empty JSON array.')
        const keys = Object.keys(array[0])
        const csvLines = [
          keys.join(','),
          ...array.map(row => keys.map(k => JSON.stringify(row[k] || '')).join(','))
        ]
        outputText = csvLines.join('\n')
        ext = 'csv'
      } else {
        outputText = text.toUpperCase()
        ext = 'txt'
      }

      setProgress(90)
      setMessage('Finalizing output...')
      const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' })
      const outputName = `${file.name.substring(0, file.name.lastIndexOf('.')) || file.name}_converted.${ext}`

      setResult({
        name: outputName,
        size: blob.size,
        url: URL.createObjectURL(blob),
        blob
      })
      setStatus('completed')
      setProgress(100)
      setMessage('Document converted successfully!')
    } catch (err) {
      console.error(err)
      setStatus('failed')
      setMessage(err.message || 'Conversion failed.')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 text-cyan-400 mb-2">
          <FileCode className="w-6 h-6" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Document & Data Converter</h1>
        </div>
        <p className="text-gray-400 text-sm">Convert CSV, JSON, and structured documents securely in your browser.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <FileDropZone
            accept=".csv,.json,.txt,.md"
            multiple={false}
            onFilesSelected={(selected) => {
              setFiles(selected)
              setStatus('idle')
              setResult(null)
            }}
          />
          <FileQueue files={files} onRemove={() => setFiles([])} onClear={() => setFiles([])} />

          {files.length > 0 && status !== 'processing' && status !== 'completed' && (
            <button
              onClick={handleProcess}
              className="w-full py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold transition shadow-lg shadow-cyan-500/20"
            >
              Convert Document
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
          <h3 className="font-bold text-lg">Conversion Type</h3>

          <div className="space-y-2">
            {[
              { id: 'csv-to-json', label: 'CSV to JSON' },
              { id: 'json-to-csv', label: 'JSON to CSV' },
              { id: 'txt-upper', label: 'Uppercase Text' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  setAction(opt.id)
                  setResult(null)
                  setStatus('idle')
                }}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold border transition text-left ${
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
  )
}
