
import React, { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Upload,
  X,
  File,
  AlertCircle,
  Download,
  CheckCircle2,
  RefreshCw,
  Eye,
  FileText,
  Image as ImageIcon,
  Music,
  ExternalLink,
  ShieldCheck,
  FileArchive,
} from 'lucide-react'

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const panelClass =
  'rounded-2xl border border-slate-200 bg-white shadow-sm'

export function FileDropZone({
  onFilesSelected,
  accept = '*',
  multiple = true,
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const reduceMotion = useReducedMotion()

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragOver(false)

    const droppedFiles = Array.from(event.dataTransfer?.files || [])
    if (droppedFiles.length) {
      onFilesSelected?.(multiple ? droppedFiles : droppedFiles.slice(0, 1))
    }
  }

  const handleFileInput = (event) => {
    const selected = Array.from(event.target.files || [])
    if (selected.length) {
      onFilesSelected?.(multiple ? selected : selected.slice(0, 1))
    }

    // Let the user select the same file again later.
    event.target.value = ''
  }

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsDragOver(false)
        }
      }}
      onDrop={handleDrop}
      className={`relative flex min-h-64 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-6 text-center transition-colors duration-200 sm:p-9 ${
        isDragOver
          ? 'border-cyan-500 bg-cyan-50 ring-4 ring-cyan-100'
          : 'border-slate-300 bg-slate-50 hover:border-cyan-400 hover:bg-cyan-50/50'
      }`}
    >
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleFileInput}
        aria-label="Choose files to process"
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      />

      <motion.div
        animate={
          reduceMotion
            ? {}
            : { y: isDragOver ? -3 : 0, scale: isDragOver ? 1.04 : 1 }
        }
        className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border transition-colors ${
          isDragOver
            ? 'border-cyan-200 bg-white text-cyan-700'
            : 'border-cyan-100 bg-white text-cyan-600 shadow-sm'
        }`}
      >
        <Upload className="h-7 w-7" />
      </motion.div>

      <h3 className="text-lg font-bold text-slate-900 sm:text-xl">
        {isDragOver ? 'Drop your files here' : 'Drag and drop your files here'}
      </h3>

      <p className="mt-2 text-sm text-slate-500">
        or click to browse from your device
      </p>

      <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700">
        <ShieldCheck className="h-3.5 w-3.5" />
        Client-side processing · Secure and private
      </span>

      <p className="mt-3 text-xs text-slate-400">
        {multiple ? 'Select one or more files' : 'Select one file'}
      </p>
    </motion.div>
  )
}

export function FileQueue({ files, onRemove, onClear }) {
  const reduceMotion = useReducedMotion()

  if (!files?.length) return null

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-5 space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            Selected files
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            {files.length} file{files.length === 1 ? '' : 's'} ready for processing
          </p>
        </div>

        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {files.map((file, index) => (
          <motion.div
            layout={!reduceMotion}
            key={`${file.name}-${file.size}-${index}`}
            className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-100 bg-cyan-50 text-cyan-700">
                <File className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {file.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatBytes(file.size)}
                </p>
              </div>
            </div>

            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Remove ${file.name}`}
                title="Remove file"
                className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}

export function ProcessingMachine({
  status,
  progress = 0,
  message,
}) {
  const reduceMotion = useReducedMotion()

  if (!status || status === 'idle') return null

  const safeProgress = Math.max(
    0,
    Math.min(100, Number(progress) || 0)
  )

  const failed = status === 'failed'
  const completed = status === 'completed'

  const statusLabel = failed
    ? 'Processing failed'
    : completed
      ? 'Processing complete'
      : 'Processing your files'

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${panelClass} my-5 p-5 sm:p-6`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              failed
                ? 'bg-rose-50 text-rose-600'
                : completed
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-cyan-50 text-cyan-700'
            }`}
          >
            {failed ? (
              <AlertCircle className="h-5 w-5" />
            ) : completed ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <RefreshCw
                className={`h-5 w-5 ${reduceMotion ? '' : 'animate-spin'}`}
              />
            )}
          </div>

          <div className="min-w-0 pt-0.5">
            <h3 className="font-bold text-slate-900">{statusLabel}</h3>
            {message && (
              <p className="mt-1 break-words text-sm leading-5 text-slate-500">
                {message}
              </p>
            )}
          </div>
        </div>

        <span
          className={`shrink-0 text-sm font-bold tabular-nums ${
            failed
              ? 'text-rose-600'
              : completed
                ? 'text-emerald-600'
                : 'text-cyan-700'
          }`}
        >
          {safeProgress}%
        </span>
      </div>

      <div
        className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Processing progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeProgress}
      >
        <motion.div
          initial={false}
          animate={{ width: `${safeProgress}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.3 }}
          className={`h-full rounded-full ${
            failed
              ? 'bg-rose-500'
              : completed
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
          }`}
        />
      </div>
    </motion.section>
  )
}

export function ResultPanel({ result, onDownload }) {
  const [showPreview, setShowPreview] = useState(true)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    setShowPreview(true)
  }, [result?.url])

  if (!result) return null

  const name = result.name || 'processed-file'
  const size = Number(result.size) || result.blob?.size || 0
  const previewUrl = result.url
  const extension = name.split('.').pop()?.toLowerCase() || ''
  const mimeType = result.blob?.type || ''

  const isImage =
    mimeType.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(name)

  const isPdf =
    mimeType === 'application/pdf' || extension === 'pdf'

  const isAudio =
    mimeType.startsWith('audio/') ||
    /\.(mp3|wav|ogg|oga|m4a|aac|flac|webm|aiff?)$/i.test(name)

  const isVideo =
    mimeType.startsWith('video/') ||
    /\.(mp4|webm|mov|ogv)$/i.test(name)

  const isText =
    mimeType.startsWith('text/') ||
    /\.(txt|csv|json|xml|md|markdown|html|css|js|rtf)$/i.test(name)

  const isArchive =
    /\.(zip|7z|rar|tar|gz)$/i.test(name) ||
    mimeType.includes('zip') ||
    mimeType.includes('compressed')

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-6 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <h4 className="font-bold text-slate-900">Your file is ready</h4>
            <p
              className="mt-1 truncate text-sm text-slate-600"
              title={name}
            >
              {name}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatBytes(size)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview((current) => !current)}
            aria-expanded={showPreview}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Hide preview' : 'Preview'}
          </button>

          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-100"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            {isImage ? (
              <ImageIcon className="h-4 w-4 text-cyan-700" />
            ) : isAudio ? (
              <Music className="h-4 w-4 text-cyan-700" />
            ) : isArchive ? (
              <FileArchive className="h-4 w-4 text-cyan-700" />
            ) : (
              <FileText className="h-4 w-4 text-cyan-700" />
            )}
            Output preview
          </div>

          <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4">
            {previewUrl && isImage && (
              <img
                src={previewUrl}
                alt={`Preview of ${name}`}
                className="max-h-[480px] max-w-full rounded-lg object-contain"
              />
            )}

            {previewUrl && isPdf && (
              <iframe
                src={previewUrl}
                title={`PDF preview: ${name}`}
                className="h-[480px] w-full rounded-lg border border-slate-200 bg-white"
              />
            )}

            {previewUrl && isAudio && (
              <div className="w-full max-w-xl space-y-3">
                <div className="flex items-center gap-3 text-slate-700">
                  <Music className="h-8 w-8 shrink-0 text-cyan-700" />
                  <span className="break-all text-sm font-medium">{name}</span>
                </div>
                <audio
                  controls
                  preload="metadata"
                  src={previewUrl}
                  className="w-full"
                >
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}

            {previewUrl && isVideo && (
              <video
                controls
                preload="metadata"
                src={previewUrl}
                className="max-h-[480px] max-w-full rounded-lg"
              >
                Your browser does not support video playback.
              </video>
            )}

            {previewUrl && isText && (
              <div className="w-full text-center">
                <FileText className="mx-auto mb-3 h-8 w-8 text-cyan-700" />
                <p className="break-all text-sm font-semibold text-slate-800">
                  {name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Open the generated file to inspect its contents.
                </p>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                >
                  Open file <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}

            {!isImage && !isPdf && !isAudio && !isVideo && !isText && (
              <div className="max-w-sm text-center">
                {isArchive ? (
                  <FileArchive className="mx-auto mb-3 h-9 w-9 text-cyan-700" />
                ) : (
                  <File className="mx-auto mb-3 h-9 w-9 text-cyan-700" />
                )}
                <p className="break-all text-sm font-semibold text-slate-800">
                  {name}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  A visual preview is not available for this file type.
                  You can still download the generated file.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.section>
  )
}
