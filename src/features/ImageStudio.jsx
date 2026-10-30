

import React, { useEffect, useMemo, useState } from 'react'

import { motion } from 'framer-motion'

import {

  Image as ImageIcon,

  FileImage,

  RefreshCw,

  Scissors,

  Download,

  AlertCircle,

  Ruler,

  CheckCircle2,

  Sparkles,

  ArrowRight,

  FileCheck2,

} from 'lucide-react'

import {

  FileDropZone,

  FileQueue,

  ProcessingMachine,

} from '../components/ProcessingComponents'



const FORMATS = [

  { mime: 'original', label: 'Original (recommended)', ext: 'original', lossy: false },

  { mime: 'auto', label: 'Auto (recommended)', ext: 'auto', lossy: false },

  { mime: 'image/jpeg', label: 'JPEG', ext: 'jpg', lossy: true },

  { mime: 'image/png', label: 'PNG', ext: 'png', lossy: false },

  { mime: 'image/webp', label: 'WebP', ext: 'webp', lossy: true },

]



const panelClass =

  'rounded-2xl border border-slate-200 bg-white shadow-sm'



const inputClass =

  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60'



const labelClass =

  'text-xs font-bold uppercase tracking-wider text-slate-500'



function detectImageType(file) {

  const ext = file.name.split('.').pop()?.toLowerCase() || ''



  const extensions = {

    jpg: 'image/jpeg',

    jpeg: 'image/jpeg',

    png: 'image/png',

    webp: 'image/webp',

    gif: 'image/gif',

    bmp: 'image/bmp',

    avif: 'image/avif',

    tif: 'image/tiff',

    tiff: 'image/tiff',

    svg: 'image/svg+xml',

    ico: 'image/x-icon',

  }



  const mime = file.type || extensions[ext] || 'unknown'



  return {

    mime,

    ext,

    label: mime.startsWith('image/')

      ? mime.replace('image/', '').toUpperCase()

      : 'Unknown',

  }

}



function resolveOutputFormat(selected, detectedMime) {

  if (selected === 'original') {

    if (

      ['image/jpeg', 'image/png', 'image/webp'].includes(

        detectedMime,

      )

    ) {

      return FORMATS.find(item => item.mime === detectedMime) || FORMATS[3]

    }



    return FORMATS[3]

  }



  if (selected !== 'auto') {

    return FORMATS.find(item => item.mime === selected) || FORMATS[3]

  }



  if (

    ['image/jpeg', 'image/png', 'image/webp'].includes(

      detectedMime,

    )

  ) {

    return FORMATS.find(item => item.mime === detectedMime) || FORMATS[3]

  }



  return FORMATS[2]

}



function canvasToBlob(canvas, type, quality) {

  return new Promise((resolve, reject) => {

    canvas.toBlob(

      blob => {

        if (!blob) {

          reject(

            new Error(

              `Your browser could not encode this image as ${type}. Try PNG, JPEG, or WebP.`,

            ),

          )

        } else {

          resolve(blob)

        }

      },

      type,

      quality,

    )

  })

}



function formatBytes(bytes) {

  if (!Number.isFinite(bytes)) return 'Unknown size'

  if (bytes < 1024) return `${bytes} B`



  if (bytes < 1024 * 1024) {

    return `${(bytes / 1024).toFixed(1)} KB`

  }



  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`

}



function toPixels(value, unit, dpi) {

  const numeric = Number(value)



  if (!Number.isFinite(numeric) || numeric <= 0) {

    return NaN

  }



  if (unit === 'in') return numeric * dpi

  if (unit === 'cm') return (numeric / 2.54) * dpi



  return numeric

}



export function ImageStudio() {

  const [files, setFiles] = useState([])

  const [action, setAction] = useState('compress')

  const [targetFormat, setTargetFormat] = useState('original')

  const [quality, setQuality] = useState(0.82)



  const [resizeWidth, setResizeWidth] = useState('1200')

  const [resizeHeight, setResizeHeight] = useState('800')

  const [keepRatio, setKeepRatio] = useState(true)

  const [dimensionUnit, setDimensionUnit] = useState('px')

  const [dpi, setDpi] = useState('300')



  const [targetSize, setTargetSize] = useState('250')

  const [targetUnit, setTargetUnit] = useState('KB')



  const [status, setStatus] = useState('idle')

  const [progress, setProgress] = useState(0)

  const [message, setMessage] = useState('')

  const [error, setError] = useState('')

  const [result, setResult] = useState(null)



  const file = files[0]



  const detected = useMemo(

    () => (file ? detectImageType(file) : null),

    [file],

  )



  const selectedOutput = resolveOutputFormat(

    targetFormat,

    detected?.mime,

  )



  const targetBytes =

    Math.max(1, Number(targetSize) || 1) *

    (targetUnit === 'MB' ? 1024 * 1024 : 1024)



  useEffect(() => {

    return () => {

      if (result?.url) {

        URL.revokeObjectURL(result.url)

      }

    }

  }, [result])



  const resetOutput = () => {

    setResult(null)

    setError('')

    setStatus('idle')

    setProgress(0)

    setMessage('')

  }



  const selectFiles = selected => {

    setFiles(selected.slice(0, 1))

    resetOutput()



    if (selected[0]) {

      createImageBitmap(selected[0])

        .then(bitmap => {

          setResizeWidth(String(bitmap.width))

          setResizeHeight(String(bitmap.height))

          bitmap.close?.()

        })

        .catch(() => {})

    }

  }



  const changeAction = nextAction => {
    if (nextAction === 'convert') {
      setTargetFormat(current =>
        current === 'original' ? 'auto' : current,
      )
    } else {
      setTargetFormat('original')
    }

    setAction(nextAction)
    resetOutput()
  }


  const handleResizeWidthChange = value => {
    setResizeWidth(value)
    const numeric = Number(value)
    if (keepRatio && Number.isFinite(numeric) && numeric > 0 && sourceAspectRatio > 0) {
      const pairedHeight = numeric / sourceAspectRatio
      setResizeHeight(dimensionUnit === 'px' ? String(Math.max(1, Math.round(pairedHeight))) : String(Number(pairedHeight.toFixed(2))))
    }
  }

  const handleResizeHeightChange = value => {
    setResizeHeight(value)
    const numeric = Number(value)
    if (keepRatio && Number.isFinite(numeric) && numeric > 0 && sourceAspectRatio > 0) {
      const pairedWidth = numeric * sourceAspectRatio
      setResizeWidth(dimensionUnit === 'px' ? String(Math.max(1, Math.round(pairedWidth))) : String(Number(pairedWidth.toFixed(2))))
    }
  }

  const handleDimensionUnitChange = nextUnit => {
    if (nextUnit === dimensionUnit) return
    const selectedDpi = Math.min(1200, Math.max(1, Number(dpi) || 300))
    const currentWidthPx = toPixels(resizeWidth, dimensionUnit, selectedDpi)
    const currentHeightPx = toPixels(resizeHeight, dimensionUnit, selectedDpi)
    const fromPixels = pixels => {
      if (nextUnit === 'in') return Number((pixels / selectedDpi).toFixed(2))
      if (nextUnit === 'cm') return Number(((pixels * 2.54) / selectedDpi).toFixed(2))
      return Math.round(pixels)
    }
    if (Number.isFinite(currentWidthPx) && currentWidthPx > 0) setResizeWidth(String(fromPixels(currentWidthPx)))
    if (Number.isFinite(currentHeightPx) && currentHeightPx > 0) setResizeHeight(String(fromPixels(currentHeightPx)))
    setDimensionUnit(nextUnit)
  }

  const handleProcess = async () => {
    if (!file || status === 'processing') return

    // Do not claim compression when the requested target is not smaller than the source.
    if (action === 'compress') {
      const requested = Number(targetSize)
      if (!Number.isFinite(requested) || requested <= 0) {
        setStatus('failed')
        setProgress(0)
        setResult(null)
        setError('Enter a valid target file size greater than zero.')
        setMessage('No output was created. Correct the target size and try again.')
        return
      }
      if (targetBytes >= file.size) {
        setStatus('failed')
        setProgress(0)
        setResult(null)
        setError(`Your target (${formatBytes(targetBytes)}) is equal to or larger than the original file (${formatBytes(file.size)}). No compression was performed. Enter a smaller target size.`)
        setMessage('No compressed file was created because the requested size would not reduce the original file.')
        return
      }
    }

    setStatus('processing')
    setProgress(5)
    setError('')
    setMessage('Detecting image format and decoding source...')
    setResult(null)

    let bitmap
    let canvasesToClean = []

    try {
      if (
        !file.type.startsWith('image/') &&
        !/\.(jpe?g|png|webp|gif|bmp|avif|tiff?|svg|ico)$/i.test(file.name)
      ) {
        throw new Error('This file does not appear to be a supported image. Choose an image file.')
      }

      bitmap = await createImageBitmap(file)
      if (!bitmap.width || !bitmap.height) throw new Error('The image has invalid dimensions.')
      setProgress(15)

      let width = bitmap.width
      let height = bitmap.height
      const selectedDpi = Math.min(1200, Math.max(1, Number(dpi) || 300))

      if (action === 'resize') {
        const requestedWidth = toPixels(resizeWidth, dimensionUnit, selectedDpi)
        const requestedHeight = toPixels(resizeHeight, dimensionUnit, selectedDpi)
        if (!Number.isFinite(requestedWidth) || !Number.isFinite(requestedHeight) || requestedWidth <= 0 || requestedHeight <= 0) {
          throw new Error('Enter valid positive width and height values.')
        }
        if (requestedWidth > 20000 || requestedHeight > 20000) {
          throw new Error('The output width and height must each be 20,000 pixels or less.')
        }
        if (keepRatio) {
          // The input fields are synchronized; fit within both requested bounds without stretching.
          const scale = Math.min(requestedWidth / bitmap.width, requestedHeight / bitmap.height)
          width = Math.max(1, Math.round(bitmap.width * scale))
          height = Math.max(1, Math.round(bitmap.height * scale))
        } else {
          width = Math.max(1, Math.round(requestedWidth))
          height = Math.max(1, Math.round(requestedHeight))
        }
      }

      const outputFormat = resolveOutputFormat(targetFormat, detected?.mime)
      const makeCanvas = (canvasWidth, canvasHeight) => {
        const canvas = document.createElement('canvas')
        canvas.width = canvasWidth
        canvas.height = canvasHeight
        const ctx = canvas.getContext('2d', { alpha: outputFormat.mime !== 'image/jpeg' })
        if (!ctx) throw new Error('Your browser could not create an image canvas.')
        if (outputFormat.mime === 'image/jpeg') {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvasWidth, canvasHeight)
        }
        ctx.drawImage(bitmap, 0, 0, canvasWidth, canvasHeight)
        canvasesToClean.push(canvas)
        return canvas
      }

      setProgress(25)
      setMessage(
        action === 'compress'
          ? 'Testing image quality and dimensions against your target size...'
          : action === 'resize'
            ? 'Resizing image to the requested dimensions...'
            : 'Converting image to the selected output format...',
      )

      let blob = null
      let actualQuality = quality

      if (action === 'compress') {
        // Try the largest dimensions first. If quality alone is insufficient, downscale
        // gradually while preserving the aspect ratio. Never report success unless under target.
        const scales = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.42, 0.35, 0.29, 0.24, 0.2, 0.16, 0.13, 0.1]
        let foundTarget = false
        let smallestObserved = null
        const lossy = outputFormat.lossy

        for (let index = 0; index < scales.length; index += 1) {
          const scale = scales[index]
          const candidateWidth = Math.max(1, Math.round(bitmap.width * scale))
          const candidateHeight = Math.max(1, Math.round(bitmap.height * scale))
          width = candidateWidth
          height = candidateHeight
          const canvas = makeCanvas(width, height)

          if (lossy) {
            const minimumQualityBlob = await canvasToBlob(canvas, outputFormat.mime, 0.05)
            if (!smallestObserved || minimumQualityBlob.size < smallestObserved.blob.size) {
              smallestObserved = { blob: minimumQualityBlob, width, height, quality: 0.05 }
            }

            if (minimumQualityBlob.size <= targetBytes) {
              // Binary-search for the best quality that still meets the requested size.
              let low = 0.05
              let high = Math.max(0.05, quality)
              let best = { blob: minimumQualityBlob, quality: 0.05 }
              for (let attempt = 0; attempt < 10; attempt += 1) {
                const mid = (low + high) / 2
                const candidate = await canvasToBlob(canvas, outputFormat.mime, mid)
                if (candidate.size <= targetBytes) {
                  best = { blob: candidate, quality: mid }
                  low = mid
                } else {
                  high = mid
                }
                setProgress(Math.min(92, 35 + Math.round(((index * 10 + attempt + 1) / (scales.length * 10)) * 55)))
              }
              blob = best.blob
              actualQuality = best.quality
              foundTarget = true
              break
            }
          } else {
            const candidate = await canvasToBlob(canvas, outputFormat.mime, quality)
            if (!smallestObserved || candidate.size < smallestObserved.blob.size) {
              smallestObserved = { blob: candidate, width, height, quality }
            }
            if (candidate.size <= targetBytes) {
              blob = candidate
              actualQuality = quality
              foundTarget = true
              break
            }
          }

          setProgress(Math.min(90, 30 + Math.round(((index + 1) / scales.length) * 55)))
        }

        if (!foundTarget || !blob || blob.size > targetBytes) {
          const smallestSize = smallestObserved?.blob?.size
          throw new Error(
            `The requested target (${formatBytes(targetBytes)}) could not be reached. The smallest tested output was ${smallestSize ? formatBytes(smallestSize) : 'unavailable'}. No compressed file was provided. Try a larger target or choose JPEG/WebP for better size reduction.`,
          )
        }
      } else {
        const canvas = makeCanvas(width, height)
        blob = await canvasToBlob(canvas, outputFormat.mime, quality)
      }

      if (!blob?.size) throw new Error('The browser generated an empty output file.')
      if (blob.type && blob.type !== outputFormat.mime) {
        throw new Error(`The browser encoded ${blob.type} instead of ${outputFormat.mime}. Choose another output format.`)
      }

      const actual = FORMATS.find(item => item.mime === blob.type) || outputFormat
      const stem = file.name.replace(/\.[^.]+$/, '') || 'image'
      const outputName = `${stem}_${action}.${actual.ext}`
      const url = URL.createObjectURL(blob)
      const sizeMet = action !== 'compress' || blob.size <= targetBytes

      setResult({
        name: outputName,
        size: blob.size,
        url,
        blob,
        sourceSize: file.size,
        width,
        height,
        sourceWidth: bitmap.width,
        sourceHeight: bitmap.height,
        format: actual.label,
        quality: actualQuality,
        targetBytes,
        sizeMet,
      })

      setProgress(100)
      setStatus('completed')
      setMessage(
        action === 'compress'
          ? `Compression successful: ${formatBytes(file.size)} → ${formatBytes(blob.size)} (${Math.round((1 - blob.size / file.size) * 100)}% smaller).`
          : 'Image processed successfully. Preview it below or download the finished file.',
      )
    } catch (err) {
      console.error('Image Studio processing error:', err)
      setStatus('failed')
      setProgress(0)
      setResult(null)
      setError(err?.message || 'Image processing failed.')
      setMessage('No output was created. Review the error and try another setting.')
    } finally {
      for (const canvas of canvasesToClean) {
        canvas.width = 0
        canvas.height = 0
      }
      bitmap?.close?.()
    }
  }

  const downloadResult = () => {

    if (!result?.url) return



    const anchor = document.createElement('a')

    anchor.href = result.url

    anchor.download = result.name



    document.body.appendChild(anchor)

    anchor.click()

    anchor.remove()

  }



  const changeFormat = value => {

    setTargetFormat(value)

    resetOutput()

  }



  return (

    <motion.div

      initial={{ opacity: 0, y: 12 }}

      animate={{ opacity: 1, y: 0 }}

      transition={{ duration: 0.28, ease: 'easeOut' }}

      className="mx-auto w-full max-w-7xl space-y-7 pb-10 text-slate-800"

    >

      <header className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50 to-sky-50 p-6 shadow-sm sm:p-8">

        <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-indigo-200/30 blur-3xl" />



        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1.5 text-xs font-bold text-indigo-700">

              <Sparkles className="h-3.5 w-3.5" />

              FILEFLUXA IMAGE LAB

            </div>



            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">

              Image Studio

            </h1>



            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">

              Convert, compress and resize images with precise controls,

              an output preview and private in-browser processing.

            </p>

          </div>



          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">

            <ImageIcon className="h-8 w-8" />

          </div>

        </div>

      </header>



      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-3">

        <section className="min-w-0 space-y-5 xl:col-span-2">

          <div className={`${panelClass} p-4 sm:p-5`}>

            <p className={`${labelClass} mb-3`}>Choose an action</p>



            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">

              {[

                {

                  id: 'convert',

                  label: 'Convert format',

                  description: 'Change file type',

                  icon: FileImage,

                },

                {

                  id: 'compress',

                  label: 'Compress image',

                  description: 'Reduce file size',

                  icon: Scissors,

                },

                {

                  id: 'resize',

                  label: 'Resize image',

                  description: 'Adjust dimensions',

                  icon: Ruler,

                },

              ].map(item => {

                const Icon = item.icon

                const active = action === item.id



                return (

                  <button

                    type="button"

                    key={item.id}

                    aria-pressed={active}

                    onClick={() => changeAction(item.id)}

                    className={`rounded-xl border p-3 text-left transition duration-200 ${

                      active

                        ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100'

                        : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'

                    }`}

                  >

                    <span

                      className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${

                        active

                          ? 'bg-indigo-600 text-white'

                          : 'bg-slate-100 text-slate-600'

                      }`}

                    >

                      <Icon className="h-4 w-4" />

                    </span>



                    <span className="block text-sm font-bold text-slate-800">

                      {item.label}

                    </span>



                    <span className="mt-0.5 block text-xs text-slate-500">

                      {item.description}

                    </span>

                  </button>

                )

              })}

            </div>

          </div>



          <div className={`${panelClass} p-4 sm:p-5`}>

            <div className="mb-4">

              <h2 className="font-bold text-slate-900">

                Upload your image

              </h2>

              <p className="mt-1 text-sm text-slate-500">

                Choose one image to process. Your file stays in your browser.

              </p>

            </div>



            <FileDropZone

              accept="image/*,.avif,.bmp,.tif,.tiff,.ico,.svg"

              multiple={false}

              onFilesSelected={selectFiles}

            />



            <div className="mt-4">

              <FileQueue

                files={files}

                onRemove={() => selectFiles([])}

                onClear={() => selectFiles([])}

              />

            </div>



            {file && detected && (

              <motion.div

                initial={{ opacity: 0, y: 5 }}

                animate={{ opacity: 1, y: 0 }}

                className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"

              >

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">

                  <FileImage className="h-5 w-5" />

                </div>



                <div className="min-w-0 flex-1">

                  <p className="truncate text-sm font-bold text-slate-800">

                    {file.name}

                  </p>

                  <p className="mt-1 text-xs text-slate-500">

                    {detected.label} · {formatBytes(file.size)}

                  </p>

                </div>



                <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 sm:inline-flex">

                  {detected.mime}

                </span>

              </motion.div>

            )}



            {file && (

              <motion.button

                whileHover={{ y: -1 }}

                whileTap={{ scale: 0.99 }}

                type="button"

                disabled={status === 'processing'}

                onClick={handleProcess}

                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"

              >

                <RefreshCw

                  className={`h-4 w-4 ${

                    status === 'processing' ? 'animate-spin' : ''

                  }`}

                />



                {status === 'processing'

                  ? 'Processing image...'

                  : action === 'compress'

                    ? 'Compress image'

                    : action === 'resize'

                      ? 'Resize image'

                      : 'Convert image'}



                {status !== 'processing' && (

                  <ArrowRight className="h-4 w-4" />

                )}

              </motion.button>

            )}

          </div>



          <div className={`${panelClass} p-4 sm:p-5`}>

            <ProcessingMachine

              status={status}

              progress={progress}

              message={message}

            />



            {error && (

              <div

                role="alert"

                className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"

              >

                <AlertCircle className="h-5 w-5 shrink-0" />

                <span>{error}</span>

              </div>

            )}

          </div>



          {result && (

            <motion.section

              initial={{ opacity: 0, y: 10 }}

              animate={{ opacity: 1, y: 0 }}

              className={`${panelClass} overflow-hidden`}

            >

              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">

                <div className="flex items-center gap-3">

                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">

                    <FileCheck2 className="h-5 w-5" />

                  </span>



                  <div>

                    <h2 className="font-bold text-slate-900">

                      Your image is ready

                    </h2>

                    <p className="text-xs text-slate-500">

                      Preview the processed image before downloading.

                    </p>

                  </div>

                </div>



                <button

                  type="button"

                  onClick={downloadResult}

                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"

                >

                  <Download className="h-4 w-4" />

                  Download

                </button>

              </div>



              <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_220px]">

                <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4">

                  <img

                    src={result.url}

                    alt={`Preview of ${result.name}`}

                    className="max-h-[480px] max-w-full rounded-lg object-contain shadow-sm"

                  />

                </div>



                <div className="space-y-3">

                  <div className="rounded-xl bg-slate-50 p-3">

                    <p className="text-xs font-semibold text-slate-500">

                      Output size

                    </p>

                    <p className="mt-1 text-lg font-black text-slate-900">

                      {formatBytes(result.size)}

                    </p>

                    <p

                      className={`mt-1 text-xs font-semibold ${

                        result.size < result.sourceSize

                          ? 'text-emerald-700'

                          : 'text-slate-500'

                      }`}

                    >

                      {result.size < result.sourceSize

                        ? `${Math.round(

                            (1 - result.size / result.sourceSize) * 100,

                          )}% smaller`

                        : result.size > result.sourceSize

                          ? 'Larger than original'

                          : 'Same size as original'}

                    </p>

                  </div>



                  <div className="rounded-xl bg-slate-50 p-3">

                    <p className="text-xs font-semibold text-slate-500">

                      Dimensions

                    </p>

                    <p className="mt-1 font-bold text-slate-900">

                      {result.width} × {result.height} px

                    </p>

                    <p className="mt-1 text-xs text-slate-500">

                      Format: {result.format}

                    </p>

                  </div>



                  <div

                    className={`rounded-xl border p-3 text-sm ${

                      result.sizeMet

                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'

                        : 'border-amber-200 bg-amber-50 text-amber-800'

                    }`}

                  >

                    <p className="flex items-center gap-2 font-bold">

                      {result.sizeMet ? (

                        <CheckCircle2 className="h-4 w-4" />

                      ) : (

                        <AlertCircle className="h-4 w-4" />

                      )}



                      {result.sizeMet

                        ? 'Processing complete'

                        : 'Target size not reached'}

                    </p>



                    {action === 'compress' && (

                      <p className="mt-1 text-xs leading-5">

                        Target: {formatBytes(result.targetBytes)}

                        {selectedOutput.lossy

                          ? ` · Quality ${Math.round(result.quality * 100)}%`

                          : ''}

                      </p>

                    )}



                    {!result.sizeMet && (

                      <p className="mt-1 text-xs leading-5">

                        Try WebP or JPEG, reduce image dimensions, or

                        increase the target size.

                      </p>

                    )}

                  </div>



                  <p className="break-all text-xs leading-5 text-slate-500">

                    {result.name}

                  </p>

                </div>

              </div>

            </motion.section>

          )}

        </section>



        <aside className={`${panelClass} min-w-0 p-4 sm:p-5 xl:sticky xl:top-5`}>

          <div className="mb-5">

            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">

              Configuration

            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">

              Studio settings

            </h2>

            <p className="mt-1 text-sm text-slate-500">

              Fine-tune the output to fit your needs.

            </p>

          </div>



          <div className="space-y-5">

            <div className="space-y-2">

              <label className={labelClass}>Action</label>



              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">

                {[

                  { id: 'convert', label: 'Convert' },

                  { id: 'compress', label: 'Compress' },

                  { id: 'resize', label: 'Resize' },

                ].map(item => (

                  <button

                    key={item.id}

                    type="button"

                    onClick={() => changeAction(item.id)}

                    className={`rounded-lg px-2 py-2.5 text-xs font-bold transition ${

                      action === item.id

                        ? 'bg-white text-indigo-700 shadow-sm'

                        : 'text-slate-500 hover:text-slate-800'

                    }`}

                  >

                    {item.label}

                  </button>

                ))}

              </div>

            </div>



            <div className="space-y-2">

              <label htmlFor="image-output-format" className={labelClass}>

                Output format

              </label>



              <select

                id="image-output-format"

                value={targetFormat}

                onChange={event => changeFormat(event.target.value)}

                className={inputClass}

              >

                {FORMATS.filter(output =>
                  action === 'convert'
                    ? output.mime !== 'original'
                    : output.mime !== 'auto',
                ).map(output => (
                  <option key={output.mime} value={output.mime}>
                    {output.mime === 'original'
                      ? 'Original (recommended)'
                      : output.mime === 'auto'
                        ? 'Auto (recommended)'
                        : `${output.label} (.${output.ext})`}
                    {output.mime === 'original' || output.mime === 'auto'
                      ? ''
                      : output.lossy
                        ? ' · quality adjustable'
                        : ' · lossless encoding'}
                  </option>
                ))}

              </select>



              <p className="text-xs leading-5 text-slate-500">
                {action === 'convert'
                  ? 'Choose the output format. Auto preserves JPEG, PNG or WebP where possible; other formats default to JPEG.'
                  : 'Original (recommended) preserves the source format when the browser supports it. Unsupported source formats may be exported as PNG.'}
              </p>

            </div>



            {(action === 'compress' || action === 'convert') &&

              selectedOutput.lossy && (

                <div className="space-y-2">

                  <div className="flex items-center justify-between">

                    <label htmlFor="image-quality" className={labelClass}>

                      Quality

                    </label>

                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">

                      {Math.round(quality * 100)}%

                    </span>

                  </div>



                  <input

                    id="image-quality"

                    type="range"

                    min="0.05"

                    max="1"

                    step="0.01"

                    value={quality}

                    onChange={event =>

                      setQuality(Number(event.target.value))

                    }

                    className="w-full cursor-pointer accent-indigo-600"

                  />



                  <div className="flex justify-between text-xs text-slate-400">

                    <span>Smaller file</span>

                    <span>Higher quality</span>

                  </div>

                </div>

              )}



            {action === 'compress' && (

              <div className="space-y-2">

                <label htmlFor="target-size" className={labelClass}>

                  Target file size

                </label>



                <div className="flex w-full min-w-0 items-stretch gap-2">
                  <input
                    id="target-size"
                    aria-label="Target file size"
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="any"
                    value={targetSize}
                    onChange={event => setTargetSize(event.target.value)}
                    className={`${inputClass} !w-0 min-w-0 flex-1 text-left tabular-nums text-slate-900`}
                  />

                  <select
                    aria-label="Target size unit"
                    value={targetUnit}
                    onChange={event => setTargetUnit(event.target.value)}
                    className={`${inputClass} !w-28 shrink-0 text-slate-900`}
                  >
                    <option value="KB">KB</option>
                    <option value="MB">MB</option>
                  </select>
                </div>



                <p className="text-xs leading-5 text-slate-500">

                  Compression tests both quality and smaller dimensions. If the target cannot be reached, no output file is offered.

                  For smaller targets, try JPEG or WebP; PNG is lossless.

                </p>

              </div>

            )}



            {action === 'resize' && (

              <div className="space-y-4">

                <div className="flex items-center gap-2">

                  <Ruler className="h-4 w-4 text-indigo-600" />

                  <p className={labelClass}>Resize dimensions</p>

                </div>



                <div className="grid grid-cols-2 gap-3">

                  <div className="space-y-1.5">

                    <label

                      htmlFor="resize-width"

                      className="text-xs font-semibold text-slate-500"

                    >

                      Width ({dimensionUnit})

                    </label>

                    <input

                      id="resize-width"

                      type="number"

                      min="0.01"

                      max="20000"

                      value={resizeWidth}

                      onChange={event => handleResizeWidthChange(event.target.value)}

                      className={inputClass}

                    />

                  </div>



                  <div className="space-y-1.5">

                    <label

                      htmlFor="resize-height"

                      className="text-xs font-semibold text-slate-500"

                    >

                      Height ({dimensionUnit})

                    </label>

                    <input

                      id="resize-height"

                      type="number"

                      min="0.01"

                      max="20000"

                      value={resizeHeight}

                      onChange={event => handleResizeHeightChange(event.target.value)}

                      disabled={keepRatio}

                      className={inputClass}

                    />

                  </div>

                </div>



                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600">

                  <input

                    type="checkbox"

                    checked={keepRatio}

                    onChange={event => setKeepRatio(event.target.checked)}

                    className="mt-0.5 accent-indigo-600"

                  />

                  <span>

                    <span className="font-semibold text-slate-800">

                      Keep aspect ratio

                    </span>

                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">

                      Fit the image within the dimensions without stretching.

                    </span>

                  </span>

                </label>



                <div className="grid grid-cols-2 gap-3">

                  <div className="space-y-1.5">

                    <label

                      htmlFor="dimension-unit"

                      className="text-xs font-semibold text-slate-500"

                    >

                      Unit

                    </label>

                    <select

                      id="dimension-unit"

                      value={dimensionUnit}

                      onChange={event => handleDimensionUnitChange(event.target.value)}

                      className={inputClass}

                    >

                      <option value="px">Pixels</option>

                      <option value="in">Inches</option>

                      <option value="cm">Centimeters</option>

                    </select>

                  </div>



                  <div className="space-y-1.5">

                    <label

                      htmlFor="resize-dpi"

                      className="text-xs font-semibold text-slate-500"

                    >

                      DPI / PPI

                    </label>

                    <input

                      id="resize-dpi"

                      type="number"

                      min="1"

                      max="1200"

                      value={dpi}

                      onChange={event => setDpi(event.target.value)}

                      disabled={dimensionUnit === 'px'}

                      className={inputClass}

                    />

                  </div>

                </div>



                <p className="text-xs leading-5 text-slate-500">

                  Inches and centimeters convert to pixels using DPI/PPI.

                  Exported image dimensions are always stored in pixels.

                </p>

              </div>

            )}



            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5">

              <div className="mb-1.5 flex items-center gap-2 text-sm font-bold text-indigo-900">

                <Scissors className="h-4 w-4" />

                Private, local processing

              </div>

              <p className="text-xs leading-5 text-indigo-900/70">

                Your image is processed in this browser. Converting may

                remove metadata or animation. SVG input is rasterized;

                editable vector output is not supported.

              </p>

            </div>

          </div>

        </aside>

      </div>

    </motion.div>

  )

}



export default ImageStudio
