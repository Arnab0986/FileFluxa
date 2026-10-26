import React, { useState } from 'react'
import { AppShell } from '../components/AppShell'
import { FileDropZone, FileQueue, ProcessingMachine, ResultPanel } from '../components/ProcessingComponents'
import { Headphones, Volume2, Scissors, FastForward, Play, Pause } from 'lucide-react'

export function AudioLab() {
  const [files, setFiles] = useState([])
  const [action, setAction] = useState('trim') // trim, volume, speed
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(10)
  const [volume, setVolume] = useState(1)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)

  const handleProcess = async () => {
    if (files.length === 0) return
    setStatus('processing')
    setProgress(30)
    setMessage('Decoding audio buffer via Web Audio API...')

    try {
      const file = files[0]
      const arrayBuffer = await file.arrayBuffer()
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

      setProgress(60)
      setMessage('Applying transformations...')

      const sampleRate = audioBuffer.sampleRate
      const startSample = Math.floor(startTime * sampleRate)
      const endSample = Math.min(Math.floor(endTime * sampleRate), audioBuffer.length)
      const frameCount = Math.max(0, endSample - startSample)

      if (frameCount <= 0) {
        throw new Error('Invalid trim duration.')
      }

      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        frameCount,
        sampleRate
      )

      const source = offlineCtx.createBufferSource()
      source.buffer = audioBuffer

      const gainNode = offlineCtx.createGain()
      gainNode.gain.value = volume

      source.connect(gainNode)
      gainNode.connect(offlineCtx.destination)

      source.start(0, startTime, endTime - startTime)

      const renderedBuffer = await offlineCtx.startRendering()

      setProgress(85)
      setMessage('Encoding WAV output...')

      // Convert AudioBuffer to WAV Blob
      const wavBlob = audioBufferToWavBlob(renderedBuffer)

      setResult({
        name: `${file.name.substring(0, file.name.lastIndexOf('.')) || file.name}_processed.wav`,
        size: wavBlob.size,
        url: URL.createObjectURL(wavBlob),
        blob: wavBlob
      })

      setStatus('completed')
      setProgress(100)
      setMessage('Audio processing complete!')
    } catch (err) {
      console.error(err)
      setStatus('failed')
      setMessage(err.message || 'Audio processing failed.')
    }
  }

  // Helper to encode AudioBuffer to WAV Blob
  const audioBufferToWavBlob = (buffer) => {
    const numOfChan = buffer.numberOfChannels
    const length = buffer.length * numOfChan * 2 + 44
    const out = new DataView(new ArrayBuffer(length))
    let channels = []
    let sampleRate = buffer.sampleRate
    let offset = 0
    let pos = 0

    function writeString(str) {
      for (let i = 0; i < str.length; i++) {
        out.setUint8(pos++, str.charCodeAt(i))
      }
    }

    writeString('RIFF')
    out.setUint32(pos, length - 8, true); pos += 4
    writeString('WAVE')
    writeString('fmt ')
    out.setUint32(pos, 16, true); pos += 4
    out.setUint16(pos, 1, true); pos += 2
    out.setUint16(pos, numOfChan, true); pos += 2
    out.setUint32(pos, sampleRate, true); pos += 4
    out.setUint32(pos, sampleRate * 2 * numOfChan, true); pos += 4
    out.setUint16(pos, numOfChan * 2, true); pos += 2
    out.setUint16(pos, 16, true); pos += 2
    writeString('data')
    out.setUint32(pos, length - pos - 4, true); pos += 4

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i))
    }

    while (offset < buffer.length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]))
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0
        out.setInt16(pos, sample, true)
        pos += 2
      }
      offset++
    }

    return new Blob([out.buffer], { type: 'audio/wav' })
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 text-cyan-400 mb-2">
          <Headphones className="w-6 h-6" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Audio Lab</h1>
        </div>
        <p className="text-gray-400 text-sm">Trim, adjust volume, and convert audio locally in your browser using the Web Audio API.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <FileDropZone
            accept="audio/*"
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
              Process Audio
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
          <h3 className="font-bold text-lg">Audio Settings</h3>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase">Action</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'trim', label: 'Trim Audio' },
                { id: 'volume', label: 'Volume' }
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

          {action === 'trim' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Start Time (seconds)</label>
                <input
                  type="number"
                  step="0.1"
                  value={startTime}
                  onChange={(e) => setStartTime(parseFloat(e.target.value) || 0)}
                  className="w-full bg-navy-950 border border-navy-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">End Time (seconds)</label>
                <input
                  type="number"
                  step="0.1"
                  value={endTime}
                  onChange={(e) => setEndTime(parseFloat(e.target.value) || 10)}
                  className="w-full bg-navy-950 border border-navy-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          )}

          {action === 'volume' && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-gray-400 uppercase">
                <span>Volume Gain</span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
