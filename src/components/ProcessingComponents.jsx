import React, { useState } from 'react'
import { Upload, X, File, AlertCircle, Download, CheckCircle2, RefreshCw } from 'lucide-react'

export function FileDropZone({ onFilesSelected, accept = '*', multiple = true }) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files))
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition duration-300 relative cursor-pointer flex flex-col items-center justify-center ${
        isDragOver
          ? 'border-cyan-400 bg-cyan-500/10'
          : 'border-navy-800 bg-navy-900/60 hover:border-navy-700 hover:bg-navy-900'
      }`}
    >
      <input
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleFileInput}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
      />
      <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
        <Upload className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold">Drag and drop your files here</h3>
      <p className="text-sm text-gray-400 mt-1">or click to browse from your device</p>
      <span className="inline-block mt-4 text-xs font-semibold px-3 py-1 rounded-full bg-navy-800 text-gray-300 border border-navy-700">
        100% Client-Side Processing • Secure & Private
      </span>
    </div>
  )
}

export function FileQueue({ files, onRemove, onClear }) {
  if (!files || files.length === 0) return null

  return (
    <div className="space-y-3 mt-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-300">Selected Files ({files.length})</h4>
        <button
          onClick={onClear}
          className="text-xs text-red-400 hover:text-red-300 font-medium transition"
        >
          Clear All
        </button>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="flex items-center justify-between p-3 rounded-xl bg-navy-900 border border-navy-800 text-sm"
          >
            <div className="flex items-center gap-3 truncate">
              <div className="p-2 rounded-lg bg-navy-800 text-cyan-400">
                <File className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="font-medium truncate">{file.name}</div>
                <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
            <button
              onClick={() => onRemove(index)}
              className="p-1 rounded-lg text-gray-400 hover:text-red-400 hover:bg-navy-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProcessingMachine({ status, progress, message }) {
  if (status === 'idle') return null

  return (
    <div className="p-6 rounded-2xl bg-navy-900 border border-navy-800 space-y-4 my-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {status === 'processing' && <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />}
          {status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {status === 'failed' && <AlertCircle className="w-5 h-5 text-red-400" />}
          <span className="font-bold capitalize">{status === 'processing' ? 'Processing File...' : status}</span>
        </div>
        <span className="text-sm font-semibold text-cyan-400">{progress}%</span>
      </div>

      <div className="w-full h-2 rounded-full bg-navy-950 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            status === 'failed' ? 'bg-red-500' : status === 'completed' ? 'bg-emerald-400' : 'bg-cyan-400'
          }`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {message && <p className="text-xs text-gray-400">{message}</p>}
    </div>
  )
}

export function ResultPanel({ result, onDownload }) {
  if (!result) return null

  return (
    <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-4 my-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          <div>
            <h4 className="font-bold text-emerald-300">Processing Complete!</h4>
            <p className="text-xs text-gray-300">Output ready: {result.name} ({(result.size / 1024).toFixed(1)} KB)</p>
          </div>
        </div>
        <button
          onClick={onDownload}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-bold transition shadow-lg shadow-emerald-500/20"
        >
          <Download className="w-4 h-4" />
          <span>Download Output</span>
        </button>
      </div>
    </div>
  )
}
