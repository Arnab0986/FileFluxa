import React, { useState } from 'react'
import { AppShell } from '../components/AppShell'
import { FileDropZone, FileQueue, ProcessingMachine, ResultPanel } from '../components/ProcessingComponents'
import { Image, Sliders, RefreshCw, Scissors } from 'lucide-react'

export function ImageStudio() {
  const [files, setFiles] = useState([])
  const [action, setAction] = useState('convert') // convert, compress, resize
  const [targetFormat, setTargetFormat] = useState('image/jpeg')
  const [quality, setQuality] = useState(0.85)
  const [resizeWidth, setResizeWidth] = useState(800)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)

  const handleProcess = async () => {
    if (files.length === 0) return
    setStatus('processing')
    setProgress(20)
    setMessage('Loading image into canvas...')

    try {
      const file = files[0]
      const bitmap = await createImageBitmap(file)
      setProgress(50)
      setMessage('Applying transformations...')

      const canvas = document.createElement('canvas')
      let width = bitmap.width
      let height = bitmap.height

      if (action === 'resize' && resizeWidth) {
        const ratio = resizeWidth / width
        width = resizeWidth
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(bitmap, 0, 0, width, height)

      setProgress(80)
      setMessage('Encoding output file...')

      canvas.toBlob((blob) => {
        if (!blob) {
          setStatus('failed')
          setMessage('Failed to encode image.')
          return
        }

        const ext = targetFormat.split('/')[1] === 'jpeg' ? 'jpg' : targetFormat.split('/')[1]
        const outputName = `${file.name.substring(0, file.name.lastIndexOf('.')) || file.name}_processed.${ext}`
        const outputResult = {
          name: outputName,
          size: blob.size,
          url: URL.createObjectURL(blob),
          blob
        }

        setResult(outputResult)
        setStatus('completed')
        setProgress(100)
        setMessage('Image successfully processed!')
      }, targetFormat, quality)

    } catch (err) {
      console.error(err)
      setStatus('failed')
      setMessage(err.message || 'An error occurred during image processing.')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 text-cyan-400 mb-2">
          <Image className="w-6 h-6" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Image Studio</h1>
        </div>
        <p className="text-gray-400 text-sm">Convert, compress, and resize images locally in your browser with zero quality loss.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <FileDropZone
            accept="image/*"
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
              Process Image Now
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
          <h3 className="font-bold text-lg">Studio Settings</h3>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase">Action</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'convert', label: 'Convert' },
                { id: 'compress', label: 'Compress' },
                { id: 'resize', label: 'Resize' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setAction(opt.id)}
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

          {(action === 'convert' || action === 'compress') && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase">Target Format</label>
              <select
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value)}
                className="w-full bg-navy-950 border border-navy-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="image/jpeg">JPEG (.jpg)</option>
                <option value="image/png">PNG (.png)</option>
                <option value="image/webp">WebP (.webp)</option>
              </select>
            </div>
          )}

          {(action === 'compress' || action === 'convert') && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-gray-400 uppercase">
                <span>Quality</span>
                <span>{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          )}

          {action === 'resize' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase">Target Width (px)</label>
              <input
                type="number"
                value={resizeWidth}
                onChange={(e) => setResizeWidth(parseInt(e.target.value) || 800)}
                className="w-full bg-navy-950 border border-navy-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
