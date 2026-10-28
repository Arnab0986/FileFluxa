
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Archive,
  Package,
  ShieldCheck,
  FileArchive,
  FolderOpen,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import JSZip from 'jszip'
import {
  FileDropZone,
  FileQueue,
  ProcessingMachine,
  ResultPanel,
} from '../components/ProcessingComponents'

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function ArchiveTools() {
  const [files, setFiles] = useState([])
  const [action, setAction] = useState('create')
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [extractedFiles, setExtractedFiles] = useState([])

  useEffect(() => {
    return () => {
      if (result?.url) URL.revokeObjectURL(result.url)
      extractedFiles.forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url)
      })
    }
  }, [result, extractedFiles])

  const resetOutput = () => {
    setResult(null)
    setExtractedFiles([])
    setStatus('idle')
    setProgress(0)
    setMessage('')
    setError('')
  }

  const handleFilesSelected = (selected) => {
    const accepted =
      action === 'create'
        ? selected
        : selected.filter(
            (file) =>
              file.name.toLowerCase().endsWith('.zip') ||
              file.type === 'application/zip' ||
              file.type === 'application/x-zip-compressed'
          )

    if (!accepted.length) {
      setError('Choose a valid ZIP archive to extract.')
      return
    }

    setFiles((current) =>
      action === 'create'
        ? [...current, ...accepted]
        : [accepted[0]]
    )
    resetOutput()
  }

  const handleActionChange = (nextAction) => {
    setAction(nextAction)
    setFiles([])
    resetOutput()
  }

  const handleProcess = async () => {
    if (!files.length || status === 'processing') return

    setStatus('processing')
    setProgress(5)
    setError('')
    setMessage(
      action === 'create'
        ? 'Preparing files for compression...'
        : 'Reading ZIP archive...'
    )

    try {
      if (action === 'create') {
        const zip = new JSZip()

        files.forEach((file) => {
          zip.file(file.name, file)
        })

        const blob = await zip.generateAsync(
          {
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
          },
          (metadata) => {
            setProgress(Math.min(95, Math.round(metadata.percent)))
            setMessage(`Compressing files... ${Math.round(metadata.percent)}%`)
          }
        )

        const output = {
          name: 'filefluxa_archive.zip',
          size: blob.size,
          url: URL.createObjectURL(blob),
          blob,
        }

        setResult(output)
        setProgress(100)
        setMessage('Your ZIP archive is ready to download.')
        setStatus('completed')
      } else {
        const archive = await JSZip.loadAsync(files[0])
        const entries = Object.values(archive.files).filter(
          (entry) => !entry.dir
        )

        if (!entries.length) {
          throw new Error('This ZIP archive does not contain any files.')
        }

        const outputs = []

        for (let index = 0; index < entries.length; index += 1) {
          const entry = entries[index]

          setProgress(Math.round(((index + 1) / entries.length) * 90))
          setMessage(`Extracting ${entry.name}...`)

          const blob = await entry.async('blob')
          outputs.push({
            name: entry.name,
            size: blob.size,
            url: URL.createObjectURL(blob),
            blob,
          })
        }

        setExtractedFiles(outputs)
        setProgress(100)
        setMessage(`Extracted ${outputs.length} file(s) successfully.`)
        setStatus('completed')
      }
    } catch (err) {
      console.error('Archive operation failed:', err)
      setStatus('failed')
      setProgress(0)
      setMessage('')
      setError(
        err?.message ||
          'The archive operation failed. Check the selected files and try again.'
      )
    }
  }

  const downloadFile = (file) => {
    if (!file?.url) return
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.name.split('/').pop() || 'download'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 text-cyan-700">
            <Archive className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Archive Tools
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create and extract ZIP archives directly in your browser.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Files are processed locally on your device.
        </div>
      </motion.header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <section className="min-w-0 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleActionChange('create')}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                  action === 'create'
                    ? 'border-cyan-300 bg-cyan-50 ring-2 ring-cyan-100'
                    : 'border-slate-200 bg-white hover:border-cyan-200 hover:bg-slate-50'
                }`}
              >
                <span className={`rounded-xl p-2 ${
                  action === 'create'
                    ? 'bg-white text-cyan-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  <Package className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-900">
                    Create ZIP
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Compress multiple files
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleActionChange('extract')}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                  action === 'extract'
                    ? 'border-cyan-300 bg-cyan-50 ring-2 ring-cyan-100'
                    : 'border-slate-200 bg-white hover:border-cyan-200 hover:bg-slate-50'
                }`}
              >
                <span className={`rounded-xl p-2 ${
                  action === 'extract'
                    ? 'bg-white text-cyan-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  <FolderOpen className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-900">
                    Extract ZIP
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Unpack a ZIP archive
                  </span>
                </span>
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <p className="mb-3 text-sm font-semibold text-slate-800">
                {action === 'create'
                  ? 'Select files to add to your archive'
                  : 'Select a ZIP archive to extract'}
              </p>
              <FileDropZone
                accept={action === 'extract' ? '.zip,application/zip' : undefined}
                multiple={action === 'create'}
                onFilesSelected={handleFilesSelected}
              />
            </div>
          </div>

          {files.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-bold text-slate-900">
                  Selected files
                </h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {files.length} file{files.length === 1 ? '' : 's'}
                </span>
              </div>
              <FileQueue
                files={files}
                onRemove={(index) => {
                  setFiles((current) =>
                    current.filter((_, i) => i !== index)
                  )
                  resetOutput()
                }}
                onClear={() => {
                  setFiles([])
                  resetOutput()
                }}
              />

              <button
                type="button"
                onClick={handleProcess}
                disabled={status === 'processing'}
                className="mt-4 w-full rounded-xl bg-cyan-600 px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'processing'
                  ? 'Processing...'
                  : action === 'create'
                    ? 'Create ZIP archive'
                    : 'Extract archive'}
              </button>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <ProcessingMachine
              status={status}
              progress={progress}
              message={message}
            />
          </div>

          {result && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{result.name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    ZIP archive · {formatBytes(result.size)}
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadFile(result)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-cyan-700"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}

          {extractedFiles.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4">
                <h2 className="font-bold text-slate-900">
                  Extracted files
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Download files individually to your device.
                </p>
              </div>
              <div className="space-y-2">
                {extractedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                  >
                    <FileArchive className="h-5 w-5 shrink-0 text-cyan-700" />
                    <div className="min-w-0 flex-1">
                      <p className="break-all text-sm font-semibold text-slate-800">
                        {file.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadFile(file)}
                      aria-label={`Download ${file.name}`}
                      className="rounded-lg border border-slate-200 p-2 text-cyan-700 transition hover:bg-cyan-50"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Archive workspace
          </h2>

          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                <Package className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  ZIP compression
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Combine selected files into a single ZIP archive.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <FolderOpen className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  ZIP extraction
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Read an archive and download its files separately.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-sm font-semibold">Privacy first</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-emerald-800">
              Archive processing runs in your browser. Extracted files are
              made available for download without uploading them to a server.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
