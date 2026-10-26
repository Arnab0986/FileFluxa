import React, { useState } from 'react'
import { AppShell } from '../components/AppShell'
import { FileDropZone, FileQueue, ProcessingMachine, ResultPanel } from '../components/ProcessingComponents'
import { Archive, Package } from 'lucide-react'
import JSZip from 'jszip'

export function ArchiveTools() {
  const [files, setFiles] = useState([])
  const [action, setAction] = useState('create') // create, extract
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)

  const handleProcess = async () => {
    if (files.length === 0) return
    setStatus('processing')
    setProgress(30)
    setMessage('Initializing archive...')

    try {
      if (action === 'create') {
        const zip = new JSZip()
        for (const file of files) {
          zip.file(file.name, file)
        }
        setProgress(70)
        setMessage('Compressing files...')
        const blob = await zip.generateAsync({ type: 'blob' })

        setResult({
          name: 'archive.zip',
          size: blob.size,
          url: URL.createObjectURL(blob),
          blob
        })
        setStatus('completed')
        setProgress(100)
        setMessage('Archive created successfully!')
      } else {
        setMessage('Extraction feature is under development.')
        setStatus('failed')
      }
    } catch (err) {
      console.error(err)
      setStatus('failed')
      setMessage(err.message || 'Operation failed.')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 text-cyan-400 mb-2">
          <Archive className="w-6 h-6" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Archive Tools</h1>
        </div>
        <p className="text-gray-400 text-sm">Create and extract ZIP archives securely in your browser.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <FileDropZone
            multiple={true}
            onFilesSelected={(selected) => {
              setFiles([...files, ...selected])
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
              Create Archive
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
      </div>
    </div>
  )
}
