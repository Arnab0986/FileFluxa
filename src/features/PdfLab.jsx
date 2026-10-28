import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
   FileText,
   Layers,
   Scissors,
   RotateCw,
   ShieldCheck,
   AlertCircle,
   Plus,
   Trash2,
   Image as ImageIcon,
   ArrowUp,
   ArrowDown,
   RotateCcw,
} from 'lucide-react'
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
const safeBaseName = (name) =>
   name
      .replace(/\.pdf$/i, '')
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') || 'document'
const DEFAULT_CROP = {
   top: 0,
   bottom: 0,
   left: 0,
   right: 0,
}
async function prepareImageForPdf(file, rotationDegrees, cropSettings = DEFAULT_CROP) {
   const bitmap = await createImageBitmap(file)
   try {
      const top = Math.min(40, Math.max(0, Number(cropSettings.top) || 0)) / 100
      const bottom = Math.min(40, Math.max(0, Number(cropSettings.bottom) || 0)) / 100
      const left = Math.min(40, Math.max(0, Number(cropSettings.left) || 0)) / 100
      const right = Math.min(40, Math.max(0, Number(cropSettings.right) || 0)) / 100
      if (left + right >= 0.95 || top + bottom >= 0.95) {
         throw new Error('Crop values are too large. Reduce the crop percentage.')
      }
      const sx = Math.round(bitmap.width * left)
      const sy = Math.round(bitmap.height * top)
      const sw = Math.max(1, bitmap.width - sx - Math.round(bitmap.width * right))
      const sh = Math.max(1, bitmap.height - sy - Math.round(bitmap.height * bottom))
      const angle = ((Number(rotationDegrees) || 0) % 360 + 360) % 360
      const quarterTurn = angle === 90 || angle === 270
      const canvas = document.createElement('canvas')
      canvas.width = quarterTurn ? sh : sw
      canvas.height = quarterTurn ? sw : sh
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not prepare the image for PDF export.')
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((angle * Math.PI) / 180)
      ctx.drawImage(bitmap, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh)
      const blob = await new Promise((resolve, reject) => {
         canvas.toBlob(
            (value) => {
               if (value) resolve(value)
               else reject(new Error('Could not encode the edited image.'))
            },
            'image/png',
         )
      })
      return new Uint8Array(await blob.arrayBuffer())
   } finally {
      bitmap.close?.()
   }
}
function makeResult(blob, name) {
   if (!(blob instanceof Blob) || blob.size < 10 || blob.type !== 'application/pdf') {
      throw new Error('The generated PDF appears to be empty or invalid. Please try again.')
   }
   return {
      name,
      size: blob.size,
      url: URL.createObjectURL(blob),
      blob,
   }
}
function ImageCropCard({
   file,
   index,
   total,
   crop,
   onCropChange,
   onResetCrop,
   onRemove,
   onMove,
}) {
   const [previewUrl, setPreviewUrl] = useState('')
   useEffect(() => {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
   }, [file])
   const cropControls = [
      { key: 'top', label: 'Top' },
      { key: 'bottom', label: 'Bottom' },
      { key: 'left', label: 'Left' },
      { key: 'right', label: 'Right' },
   ]
   return (
      <motion.article
         layout
         initial={{ opacity: 0, y: 8 }}
         animate={{ opacity: 1, y: 0 }}
         className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
         <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
               <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                  <ImageIcon className="h-4 w-4" />
               </div>
               <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500">
                     Image {index + 1} of {total} · {formatBytes(file.size)}
                  </p>
               </div>
            </div>
            <div className="flex items-center gap-1">
               <button
                  type="button"
                  onClick={() => onMove(index, -1)}
                  disabled={index === 0}
                  aria-label="Move image up"
                  title="Move up"
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
               >
                  <ArrowUp className="h-4 w-4" />
               </button>
               <button
                  type="button"
                  onClick={() => onMove(index, 1)}
                  disabled={index === total - 1}
                  aria-label="Move image down"
                  title="Move down"
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
               >
                  <ArrowDown className="h-4 w-4" />
               </button>
               <button
                  type="button"
                  onClick={() => onResetCrop(index)}
                  title="Reset crop"
                  aria-label="Reset crop"
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
               >
                  <RotateCcw className="h-4 w-4" />
               </button>
               <button
                  type="button"
                  onClick={() => onRemove(index)}
                  title="Remove image"
                  aria-label="Remove image"
                  className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50"
               >
                  <Trash2 className="h-4 w-4" />
               </button>
            </div>
         </div>
         <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
               <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Crop preview
               </p>
               <div className="relative flex min-h-52 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {previewUrl && (
                     <div className="relative inline-block max-h-72 max-w-full overflow-hidden">
                        <img
                           src={previewUrl}
                           alt={`Preview of ${file.name}`}
                           className="block max-h-72 max-w-full object-contain"
                        />
                        {/* Dark overlays show which edges will be cropped. */}
                        <div
                           className="pointer-events-none absolute left-0 right-0 top-0 bg-slate-950/55"
                           style={{ height: `${crop.top}%` }}
                        />
                        <div
                           className="pointer-events-none absolute bottom-0 left-0 right-0 bg-slate-950/55"
                           style={{ height: `${crop.bottom}%` }}
                        />
                        <div
                           className="pointer-events-none absolute bottom-0 left-0 top-0 bg-slate-950/55"
                           style={{ width: `${crop.left}%` }}
                        />
                        <div
                           className="pointer-events-none absolute bottom-0 right-0 top-0 bg-slate-950/55"
                           style={{ width: `${crop.right}%` }}
                        />
                        <div
                           className="pointer-events-none absolute border-2 border-cyan-400"
                           style={{
                              top: `${crop.top}%`,
                              bottom: `${crop.bottom}%`,
                              left: `${crop.left}%`,
                              right: `${crop.right}%`,
                           }}
                        />
                     </div>
                  )}
               </div>
               <p className="mt-2 text-xs leading-5 text-slate-500">
                  The shaded areas will be removed from the exported PDF.
               </p>
            </div>
            <div>
               <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                     Crop edges
                  </p>
                  <span className="text-xs text-slate-500">0–40% each</span>
               </div>
               <div className="space-y-4">
                  {cropControls.map(({ key, label }) => (
                     <label key={key} className="block">
                        <span className="mb-2 flex items-center justify-between text-sm text-slate-700">
                           <span>{label}</span>
                           <span className="font-semibold tabular-nums">{crop[key]}%</span>
                        </span>
                        <input
                           type="range"
                           min="0"
                           max="40"
                           step="1"
                           value={crop[key]}
                           onChange={(event) => onCropChange(index, key, Number(event.target.value))}
                           className="w-full cursor-pointer accent-cyan-600"
                        />
                     </label>
                  ))}
               </div>
               <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
                  Crop values apply only to this image. Use the arrows above to change its PDF page order.
               </div>
            </div>
         </div>
      </motion.article>
   )
}
export function PdfLab() {
   const [files, setFiles] = useState([])
   const [action, setAction] = useState('merge')
   const [status, setStatus] = useState('idle')
   const [progress, setProgress] = useState(0)
   const [message, setMessage] = useState('')
   const [result, setResult] = useState(null)
   const [pageStart, setPageStart] = useState('1')
   const [pageEnd, setPageEnd] = useState('1')
   const [rotation, setRotation] = useState('90')
   const [imageRotation, setImageRotation] = useState('0')
   const [imageCrops, setImageCrops] = useState([])
   const [error, setError] = useState('')
   const addImagesInputRef = useRef(null)
   useEffect(() => {
      return () => {
         if (result?.url) URL.revokeObjectURL(result.url)
      }
   }, [result])
   const resetResult = () => {
      setResult((current) => {
         if (current?.url) URL.revokeObjectURL(current.url)
         return null
      })
      setError('')
      setStatus('idle')
      setProgress(0)
      setMessage('')
   }
   const chooseAction = (next) => {
      setAction(next)
      setFiles([])
      setImageCrops([])
      resetResult()
      setPageStart('1')
      setPageEnd('1')
   }
   const handleFiles = (selected) => {
      const isImageToPdf = action === 'image-to-pdf'
      const accepted = selected.filter((file) =>
         isImageToPdf
            ? (/\.(jpe?g|png)$/i.test(file.name) ||
                  ['image/jpeg', 'image/png'].includes(file.type))
            : file.type === 'application/pdf' || /\.pdf$/i.test(file.name),
      )
      if (!accepted.length) {
         setError(
            isImageToPdf
               ? 'Please select JPG, JPEG, or PNG images.'
               : 'Please select a PDF file.',
         )
         return
      }
      if (accepted.length !== selected.length) {
         setError(
            isImageToPdf
               ? 'Only JPG, JPEG, and PNG images are supported. Unsupported files were skipped.'
               : 'Only PDF files are supported. Unsupported files were skipped.',
         )
      } else {
         setError('')
      }
      if (action === 'merge' || isImageToPdf) {
         setFiles((current) => [...current, ...accepted])
         if (isImageToPdf) {
            setImageCrops((current) => [
               ...current,
               ...accepted.map(() => ({ ...DEFAULT_CROP })),
            ])
         }
      } else {
         setFiles([accepted[0]])
         setImageCrops([])
      }
      resetResult()
   }
   const updateCrop = (index, edge, value) => {
      setImageCrops((current) =>
         current.map((crop, cropIndex) =>
            cropIndex === index ? { ...crop, [edge]: value } : crop,
         ),
      )
      resetResult()
   }
   const resetImageCrop = (index) => {
      setImageCrops((current) =>
         current.map((crop, cropIndex) =>
            cropIndex === index ? { ...DEFAULT_CROP } : crop,
         ),
      )
      resetResult()
   }
   const removeImage = (index) => {
      setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))
      setImageCrops((current) => current.filter((_, cropIndex) => cropIndex !== index))
      resetResult()
   }
   const moveImage = (index, direction) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= files.length) return
      setFiles((current) => {
         const next = [...current]
         ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
         return next
      })
      setImageCrops((current) => {
         const next = [...current]
         ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
         return next
      })
      resetResult()
   }
   const handleProcess = async () => {
      if (!files.length || status === 'processing') return
      setStatus('processing')
      setProgress(10)
      setError('')
      setMessage('Checking selected files…')
      try {
         const { PDFDocument, degrees } = await import('pdf-lib')
         let outputBlob
         let outputName
         if (action === 'merge') {
            if (files.length < 2) throw new Error('Choose at least two PDFs to merge.')
            const merged = await PDFDocument.create()
            for (let i = 0; i < files.length; i += 1) {
               setProgress(15 + Math.round((i / files.length) * 55))
               setMessage(`Reading ${files[i].name} (${i + 1} of ${files.length})…`)
               const source = await PDFDocument.load(await files[i].arrayBuffer(), {
                  ignoreEncryption: false,
               })
               const pages = await merged.copyPages(source, source.getPageIndices())
               pages.forEach((page) => merged.addPage(page))
            }
            if (!merged.getPageCount()) {
               throw new Error('The selected PDFs contain no pages.')
            }
            setProgress(80)
            setMessage('Writing merged PDF…')
            outputBlob = new Blob([await merged.save()], { type: 'application/pdf' })
            outputName = 'filefluxa_merged.pdf'
         } else if (action === 'split') {
            const file = files[0]
            const source = await PDFDocument.load(await file.arrayBuffer())
            const count = source.getPageCount()
            const start = Number.parseInt(pageStart, 10)
            const end = Number.parseInt(pageEnd, 10)
            if (
               !Number.isInteger(start) ||
               !Number.isInteger(end) ||
               start < 1 ||
               end < start ||
               end > count
            ) {
               throw new Error(`Enter a valid page range from 1 to ${count}.`)
            }
            const output = await PDFDocument.create()
            const indices = Array.from(
               { length: end - start + 1 },
               (_, index) => start - 1 + index,
            )
            setProgress(55)
            setMessage(`Extracting ${indices.length} page${indices.length === 1 ? '' : 's'}…`)
            const pages = await output.copyPages(source, indices)
            pages.forEach((page) => output.addPage(page))
            setProgress(80)
            outputBlob = new Blob([await output.save()], { type: 'application/pdf' })
            outputName = `${safeBaseName(file.name)}_pages_${start}-${end}.pdf`
         } else if (action === 'image-to-pdf') {
            const output = await PDFDocument.create()
            const margin = 24
            for (let i = 0; i < files.length; i += 1) {
               const file = files[i]
               setProgress(15 + Math.round((i / files.length) * 60))
               setMessage(`Preparing image ${i + 1} of ${files.length}: ${file.name}`)
               const crop = imageCrops[i] || DEFAULT_CROP
               const bytes = await prepareImageForPdf(file, imageRotation, crop)
               const embedded = await output.embedPng(bytes)
               const pageWidth = 595.28
               const pageHeight = 841.89
               const scale = Math.min(
                  (pageWidth - margin * 2) / embedded.width,
                  (pageHeight - margin * 2) / embedded.height,
                  1,
               )
               const width = embedded.width * scale
               const height = embedded.height * scale
               const page = output.addPage([pageWidth, pageHeight])
               page.drawImage(embedded, {
                  x: (pageWidth - width) / 2,
                  y: (pageHeight - height) / 2,
                  width,
                  height,
               })
            }
            if (!output.getPageCount()) {
               throw new Error('No supported images were added.')
            }
            outputBlob = new Blob([await output.save()], { type: 'application/pdf' })
            outputName = 'filefluxa_images.pdf'
         } else {
            const file = files[0]
            const pdf = await PDFDocument.load(await file.arrayBuffer())
            if (!pdf.getPageCount()) throw new Error('This PDF contains no pages.')
            const angle = Number.parseInt(rotation, 10)
            if (![90, 180, 270].includes(angle)) {
               throw new Error('Choose a rotation of 90, 180, or 270 degrees.')
            }
            setProgress(55)
            setMessage(`Rotating ${pdf.getPageCount()} page(s)…`)
            pdf
               .getPages()
               .forEach((page) =>
                  page.setRotation(degrees((page.getRotation().angle + angle) % 360)),
               )
            setProgress(80)
            outputBlob = new Blob([await pdf.save()], { type: 'application/pdf' })
            outputName = `${safeBaseName(file.name)}_rotated_${angle}.pdf`
         }
         setProgress(95)
         setMessage('Validating generated PDF…')
         const check = await PDFDocument.load(await outputBlob.arrayBuffer())
         if (check.getPageCount() < 1) {
            throw new Error('Generated PDF contains no pages.')
         }
         const nextResult = makeResult(outputBlob, outputName)
         setResult(nextResult)
         setStatus('completed')
         setProgress(100)
         setMessage(
            `Complete — ${check.getPageCount()} page${check.getPageCount() === 1 ? '' : 's'} created (${formatBytes(outputBlob.size)}).`,
         )
      } catch (err) {
         console.error('PDF Lab processing failed:', err)
         setStatus('failed')
         setProgress(0)
         setMessage('')
         setError(
            err?.message ||
               'PDF processing failed. The file may be damaged or password-protected.',
         )
      }
   }
   const operations = [
      {
         id: 'merge',
         label: 'Merge PDFs',
         detail: 'Combine multiple files in order',
         icon: Layers,
      },
      {
         id: 'split',
         label: 'Extract pages',
         detail: 'Export a page range to a new PDF',
         icon: Scissors,
      },
      {
         id: 'rotate',
         label: 'Rotate pages',
         detail: 'Rotate every page by 90°, 180°, or 270°',
         icon: RotateCw,
      },
      {
         id: 'image-to-pdf',
         label: 'Images to PDF',
         detail: 'Crop and combine JPG / PNG images into a PDF',
         icon: FileText,
      },
   ]
   const removeFile = (index) => {
      if (action === 'image-to-pdf') {
         removeImage(index)
         return
      }
      setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))
      resetResult()
   }
   const clearFiles = () => {
      setFiles([])
      setImageCrops([])
      resetResult()
   }
   return (
      <div className="space-y-8">
         <motion.header
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
         >
            <div className="flex items-center gap-3">
               <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                  <FileText className="h-6 w-6" />
               </div>
               <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                     PDF Lab
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                     Organize, edit, and create PDFs in your browser.
                  </p>
               </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
               <ShieldCheck className="h-4 w-4" />
               Browser-based processing
            </div>
         </motion.header>
         <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
            <section className="min-w-0 space-y-5">
               <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                  <FileDropZone
                     key={action}
                     accept={
                        action === 'image-to-pdf'
                           ? '.jpg,.jpeg,.png,image/jpeg,image/png'
                           : 'application/pdf,.pdf'
                     }
                     multiple={action === 'merge' || action === 'image-to-pdf'}
                     onFilesSelected={handleFiles}
                  />
               </div>
               {action === 'image-to-pdf' && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                     <div>
                        <p className="font-semibold text-slate-800">Image selection</p>
                        <p className="mt-1 text-sm text-slate-500">
                           Add more images at any time. Each image becomes one PDF page.
                        </p>
                     </div>
                     <button
                        type="button"
                        onClick={() => addImagesInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-700"
                     >
                        <Plus className="h-4 w-4" />
                        Add More Images
                     </button>
                     <input
                        ref={addImagesInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                           const selected = Array.from(event.target.files || [])
                           if (selected.length) handleFiles(selected)
                           event.target.value = ''
                        }}
                     />
                  </div>
               )}
               {action === 'image-to-pdf' && files.length > 0 ? (
                  <div className="space-y-4">
                     <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                           <h2 className="text-lg font-bold text-slate-900">Images and crop settings</h2>
                           <p className="mt-1 text-sm text-slate-500">
                              Adjust each image separately. Shaded edges will be cropped.
                           </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                           {files.length} {files.length === 1 ? 'image' : 'images'}
                        </span>
                     </div>
                     <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <label className="block max-w-sm space-y-2 text-sm font-medium text-slate-700">
                           Rotate all images
                           <select
                              value={imageRotation}
                              onChange={(event) => {
                                 setImageRotation(event.target.value)
                                 resetResult()
                              }}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                           >
                              <option value="0">No rotation</option>
                              <option value="90">90° clockwise</option>
                              <option value="180">180°</option>
                              <option value="270">270° clockwise</option>
                           </select>
                        </label>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                           Rotation applies to all selected images. Crop controls below are individual.
                        </p>
                     </div>
                     {files.map((file, index) => (
                        <ImageCropCard
                           key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                           file={file}
                           index={index}
                           total={files.length}
                           crop={imageCrops[index] || DEFAULT_CROP}
                           onCropChange={updateCrop}
                           onResetCrop={resetImageCrop}
                           onRemove={removeImage}
                           onMove={moveImage}
                        />
                     ))}
                     <button
                        type="button"
                        onClick={clearFiles}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                     >
                        <Trash2 className="h-4 w-4" />
                        Clear all images
                     </button>
                  </div>
               ) : (
                  <FileQueue
                     files={files}
                     onRemove={removeFile}
                     onClear={clearFiles}
                  />
               )}
               {files.length > 0 && action !== 'image-to-pdf' && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                     <h3 className="mb-4 font-semibold text-slate-900">Operation settings</h3>
                     {action === 'merge' && (
                        <p className="text-sm leading-6 text-slate-600">
                           Files are merged in the order shown above. Add at least two PDF files.
                        </p>
                     )}
                     {action === 'split' && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                           <label className="space-y-2 text-sm text-slate-700">
                              First page
                              <input
                                 type="number"
                                 min="1"
                                 value={pageStart}
                                 onChange={(event) => setPageStart(event.target.value)}
                                 className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-cyan-500"
                              />
                           </label>
                           <label className="space-y-2 text-sm text-slate-700">
                              Last page
                              <input
                                 type="number"
                                 min="1"
                                 value={pageEnd}
                                 onChange={(event) => setPageEnd(event.target.value)}
                                 className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-cyan-500"
                              />
                           </label>
                           <p className="text-xs text-slate-500 sm:col-span-2">
                              Example: pages 2–5 creates one PDF containing pages 2, 3, 4, and 5.
                           </p>
                        </div>
                     )}
                     {action === 'rotate' && (
                        <label className="block max-w-sm space-y-2 text-sm text-slate-700">
                           Rotation
                           <select
                              value={rotation}
                              onChange={(event) => setRotation(event.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-cyan-500"
                           >
                              <option value="90">90° clockwise</option>
                              <option value="180">180°</option>
                              <option value="270">270° clockwise</option>
                           </select>
                        </label>
                     )}
                  </div>
               )}
               {error && (
                  <div
                     role="alert"
                     className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
                  >
                     <AlertCircle className="h-5 w-5 shrink-0" />
                     <span>{error}</span>
                  </div>
               )}
               <ProcessingMachine status={status} progress={progress} message={message} />
               {files.length > 0 && status !== 'processing' && (
                  <button
                     type="button"
                     onClick={handleProcess}
                     className="w-full rounded-xl bg-cyan-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-cyan-600/10 transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                     {status === 'completed'
                        ? 'Run again'
                        : action === 'image-to-pdf'
                           ? 'Create PDF from Images'
                           : 'Process PDF'}
                  </button>
               )}
               <ResultPanel
                  result={result}
                  onDownload={() => {
                     if (!result?.url) return
                     const link = document.createElement('a')
                     link.href = result.url
                     link.download = result.name
                     document.body.appendChild(link)
                     link.click()
                     link.remove()
                  }}
               />
            </section>
            <aside className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
               <h2 className="mb-4 text-lg font-bold text-slate-900">PDF tools</h2>
               {operations.map(({ id, label, detail, icon: Icon }) => (
                  <button
                     key={id}
                     type="button"
                     onClick={() => chooseAction(id)}
                     className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                        action === id
                           ? 'border-cyan-300 bg-cyan-50'
                           : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                     }`}
                  >
                     <span
                        className={`rounded-lg p-2 ${
                           action === id
                              ? 'bg-cyan-100 text-cyan-700'
                              : 'bg-slate-100 text-slate-500'
                        }`}
                     >
                        <Icon className="h-5 w-5" />
                     </span>
                     <span className="min-w-0">
                        <span
                           className={`block text-sm font-semibold ${
                              action === id ? 'text-cyan-800' : 'text-slate-800'
                           }`}
                        >
                           {label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                           {detail}
                        </span>
                     </span>
                  </button>
               ))}
               <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                  Files are processed locally in your browser. Password-protected PDFs or PDFs with
                  unsupported structures may not be editable.
               </div>
            </aside>
         </div>
      </div>
   )
}
