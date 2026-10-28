import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Headphones, Volume2, Scissors, ShieldCheck, AlertCircle, AudioLines, Clock3 } from 'lucide-react'
import { FileDropZone, FileQueue, ProcessingMachine, ResultPanel } from '../components/ProcessingComponents'

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

const safeBaseName = (name) => name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') || 'audio'

function audioBufferToWavBlob(buffer) {
  const channels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const frames = buffer.length
  const bytesPerSample = 2
  const dataSize = frames * channels * bytesPerSample
  const output = new ArrayBuffer(44 + dataSize)
  const view = new DataView(output)
  let offset = 0

  const writeString = (value) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset++, value.charCodeAt(i))
  }

  writeString('RIFF')
  view.setUint32(offset, 36 + dataSize, true); offset += 4
  writeString('WAVE')
  writeString('fmt ')
  view.setUint32(offset, 16, true); offset += 4
  view.setUint16(offset, 1, true); offset += 2
  view.setUint16(offset, channels, true); offset += 2
  view.setUint32(offset, sampleRate, true); offset += 4
  view.setUint32(offset, sampleRate * channels * bytesPerSample, true); offset += 4
  view.setUint16(offset, channels * bytesPerSample, true); offset += 2
  view.setUint16(offset, 16, true); offset += 2
  writeString('data')
  view.setUint32(offset, dataSize, true); offset += 4

  const channelData = Array.from({ length: channels }, (_, index) => buffer.getChannelData(index))
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([output], { type: 'audio/wav' })
}

async function encodeBufferToWebM(buffer) {
  if (!window.MediaRecorder) {
    throw new Error('This browser does not support WebM audio export. Choose WAV instead.')
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  const context = new AudioContextClass()
  try {
    const destination = context.createMediaStreamDestination()
    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(destination)
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm'].find(type =>
      MediaRecorder.isTypeSupported(type),
    )
    if (!mimeType) throw new Error('Your browser does not support WebM/Opus export. Choose WAV instead.')

    const chunks = []
    const recorder = new MediaRecorder(destination.stream, { mimeType })
    const completed = new Promise((resolve, reject) => {
      recorder.ondataavailable = event => {
        if (event.data?.size) chunks.push(event.data)
      }
      recorder.onerror = () => reject(new Error('The browser failed to encode WebM audio.'))
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
    })
    recorder.start()
    source.start()
    await new Promise(resolve => { source.onended = resolve })
    recorder.stop()
    const blob = await completed
    destination.stream.getTracks().forEach(track => track.stop())
    if (!blob.size) throw new Error('WebM encoding returned an empty file.')
    return blob
  } finally {
    if (context.state !== 'closed') await context.close()
  }
}

export function AudioLab() {
  const [files, setFiles] = useState([])
  const [action, setAction] = useState('trim')
  const [startTime, setStartTime] = useState('0')
  const [endTime, setEndTime] = useState('10')
  const [volume, setVolume] = useState(100)
  const [outputFormat, setOutputFormat] = useState('wav')
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [duration, setDuration] = useState(null)

  useEffect(() => () => {
    if (result?.url) URL.revokeObjectURL(result.url)
  }, [result])

  const clearResult = () => {
    if (result?.url) URL.revokeObjectURL(result.url)
    setResult(null)
    setStatus('idle')
    setProgress(0)
    setMessage('')
    setError('')
  }

  const handleFiles = (selected) => {
    const file = selected.find((item) => item.type.startsWith('audio/') || /\.(mp3|wav|ogg|oga|m4a|aac|flac|webm|aiff?)$/i.test(item.name))
    if (!file) {
      setError('Choose a supported audio file, such as MP3, WAV, M4A, OGG, FLAC, or WebM. Support depends on your browser.')
      return
    }
    setFiles([file])
    setDuration(null)
    setStartTime('0')
    setEndTime('10')
    clearResult()
    setError('')
    const audio = new Audio()
    const objectUrl = URL.createObjectURL(file)
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration)
        setEndTime(String(Math.max(0.1, Math.round(audio.duration * 10) / 10)))
      }
      URL.revokeObjectURL(objectUrl)
    }
    audio.onerror = () => URL.revokeObjectURL(objectUrl)
    audio.src = objectUrl
  }

  const handleProcess = async () => {
    if (!files.length || status === 'processing') return
    setStatus('processing')
    setProgress(10)
    setMessage('Reading audio file…')
    setError('')
    let audioContext

    try {
      const file = files[0]
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass || !window.OfflineAudioContext) {
        throw new Error('Your browser does not support offline audio processing. Try a recent version of Chrome, Edge, or Firefox.')
      }

      const bytes = await file.arrayBuffer()
      audioContext = new AudioContextClass()
      const decoded = await audioContext.decodeAudioData(bytes)
      const fullDuration = decoded.duration
      setDuration(fullDuration)
      setProgress(35)
      setMessage('Validating edit settings…')

      const start = action === 'trim' ? Number(startTime) : 0
      const end = action === 'trim' ? Number(endTime) : fullDuration
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > fullDuration + 0.001) {
        throw new Error(`Enter a valid time range between 0 and ${fullDuration.toFixed(2)} seconds. End time must be greater than start time.`)
      }
      if (!Number.isFinite(volume) || volume < 0 || volume > 200) {
        throw new Error('Volume must be between 0% and 200%.')
      }

      const safeStart = Math.min(start, fullDuration)
      const safeEnd = Math.min(end, fullDuration)
      const frameCount = Math.max(1, Math.round((safeEnd - safeStart) * decoded.sampleRate))
      const offline = new OfflineAudioContext(decoded.numberOfChannels, frameCount, decoded.sampleRate)
      const source = offline.createBufferSource()
      source.buffer = decoded
      const gain = offline.createGain()
      gain.gain.value = action === 'volume' ? volume / 100 : 1
      source.connect(gain)
      gain.connect(offline.destination)

      setProgress(55)
      setMessage(action === 'trim' ? 'Rendering selected audio segment…' : 'Applying volume to the full audio track…')
      source.start(0, safeStart, safeEnd - safeStart)
      const rendered = await offline.startRendering()

      setProgress(85)
      setMessage(outputFormat === 'webm' ? 'Encoding WebM/Opus output…' : 'Encoding PCM WAV output…')
      const blob = outputFormat === 'webm'
        ? await encodeBufferToWebM(rendered)
        : audioBufferToWavBlob(rendered)
      const outputExt = outputFormat === 'webm' ? 'webm' : 'wav'
      if (!blob.size || (outputFormat === 'wav' && (blob.size <= 44 || blob.type !== 'audio/wav'))) {
        throw new Error('The audio encoder returned an empty or invalid file.')
      }
      const output = {
        name: `${safeBaseName(file.name)}_${action === 'trim' ? 'trimmed' : 'volume-adjusted'}.${outputExt}`,
        size: blob.size,
        url: URL.createObjectURL(blob),
        blob,
      }
      setResult(output)
      setStatus('completed')
      setProgress(100)
      setMessage(`Finished — ${formatTime(rendered.duration)} of audio exported as ${outputFormat.toUpperCase()}.`)
    } catch (err) {
      console.error('Audio Lab processing failed:', err)
      setStatus('failed')
      setProgress(0)
      setMessage('')
      setError(err?.message || 'Audio processing failed. The file may use an unsupported codec or be damaged.')
    } finally {
      if (audioContext && audioContext.state !== 'closed') {
        try { await audioContext.close() } catch { /* no-op: context cleanup */ }
      }
    }
  }

  const options = [
    { id: 'trim', title: 'Trim audio', description: 'Keep a selected time range', Icon: Scissors },
    { id: 'volume', title: 'Adjust volume', description: 'Change loudness without trimming', Icon: Volume2 },
  ]

  return (
    <div className="space-y-8">
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <div className="mb-2 flex items-center gap-3 text-cyan-700">
          <Headphones className="h-7 w-7" />
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Audio Lab</h1>
        </div>
        <p className="max-w-2xl text-sm text-slate-600">Trim audio or adjust volume, then export as WAV or browser-supported WebM/Opus. Processing happens locally in your browser.</p>
        <div className="flex items-center gap-2 text-xs text-emerald-300"><ShieldCheck className="h-4 w-4" /> Files stay on your device</div>
      </motion.header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <section className="min-w-0 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <FileDropZone accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.webm" multiple={false} onFilesSelected={handleFiles} />
          </div>
          <FileQueue files={files} onRemove={() => { setFiles([]); setDuration(null); clearResult() }} onClear={() => { setFiles([]); setDuration(null); clearResult() }} />

          {files.length > 0 && (
            <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="rounded-lg bg-cyan-50 p-3 text-cyan-700"><AudioLines className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{files[0].name}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-600"><Clock3 className="h-3.5 w-3.5" />{duration === null ? 'Reading duration…' : formatTime(duration)} · {(files[0].size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="audio-output-format">Output format</label>
            <select id="audio-output-format" value={outputFormat} onChange={e => setOutputFormat(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-cyan-400">
              <option value="wav">WAV (PCM, widely compatible)</option>
              <option value="webm">WebM / Opus (browser support required)</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">The original input container cannot always be preserved after editing. WAV and WebM/Opus are the available export formats; WebM support depends on the browser.</p>
          </div>
          {error && <div role="alert" className="flex gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200"><AlertCircle className="h-5 w-5 shrink-0" /><span>{error}</span></div>}
          <ProcessingMachine status={status} progress={progress} message={message} />
          {files.length > 0 && status !== 'processing' && (
            <button onClick={handleProcess} className="w-full rounded-xl bg-cyan-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-cyan-500/10 transition hover:bg-cyan-700">
              {status === 'completed' ? 'Process again' : 'Process audio'}
            </button>
          )}
          <ResultPanel result={result} onDownload={() => {
            if (!result?.url) return
            const link = document.createElement('a')
            link.href = result.url
            link.download = result.name
            document.body.appendChild(link)
            link.click()
            link.remove()
          }} />
        </section>

        <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-bold text-slate-900">Audio settings</h2>
          <div className="space-y-3">
            {options.map(({ id, title, description, Icon }) => (
              <button key={id} onClick={() => { setAction(id); clearResult() }} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${action === id ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                <span className={`rounded-lg p-2 ${action === id ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600'}`}><Icon className="h-5 w-5" /></span>
                <span><span className={`block text-sm font-semibold ${action === id ? 'text-cyan-800' : 'text-slate-900'}`}>{title}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span></span>
              </button>
            ))}
          </div>

          {action === 'trim' && (
            <div className="space-y-4 border-t border-slate-200 pt-4">
              <label className="block space-y-2 text-sm text-slate-700">Start time (seconds)
                <input type="number" min="0" max={duration ?? undefined} step="0.1" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-cyan-400" />
              </label>
              <label className="block space-y-2 text-sm text-slate-700">End time (seconds)
                <input type="number" min="0.1" max={duration ?? undefined} step="0.1" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-cyan-400" />
              </label>
              <p className="text-xs leading-5 text-slate-500">The exported WAV contains only the selected time range.</p>
            </div>
          )}

          {action === 'volume' && (
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between text-sm text-slate-700"><label htmlFor="audio-volume">Output volume</label><span className="font-semibold tabular-nums text-cyan-700">{volume}%</span></div>
              <input id="audio-volume" type="range" min="0" max="200" step="5" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-full accent-cyan-400" />
              <div className="flex justify-between text-xs text-slate-500"><span>Mute (0%)</span><span>Original (100%)</span><span>200%</span></div>
              <p className="text-xs leading-5 text-slate-500">Volume adjustment processes the full track. Higher settings may cause clipping if the original audio is already loud.</p>
            </div>
          )}

          <p className="border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">Export format: WAV (uncompressed PCM). Input codec support depends on your browser.</p>
        </aside>
      </div>
    </div>
  )
}
