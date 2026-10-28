import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Home } from './components/Home'
import './index.css'

const ImageStudio = lazy(() =>
  import('./features/ImageStudio').then(module => ({
    default: module.ImageStudio,
  }))
)

const PdfLab = lazy(() =>
  import('./features/PdfLab').then(module => ({
    default: module.PdfLab,
  }))
)

const DocumentConverter = lazy(() =>
  import('./features/DocumentConverter').then(module => ({
    default: module.DocumentConverter,
  }))
)

const ArchiveTools = lazy(() =>
  import('./features/ArchiveTools').then(module => ({
    default: module.ArchiveTools,
  }))
)

const AudioLab = lazy(() =>
  import('./features/AudioLab').then(module => ({
    default: module.AudioLab,
  }))
)

function LoadingFallback() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center"
      role="status"
      aria-live="polite"
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-navy-700 border-t-cyan-400"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-cyan-300">
        Preparing your workspace...
      </p>
      <p className="text-xs text-gray-500">
        Processing stays in your browser.
      </p>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AppShell>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/image-studio" element={<ImageStudio />} />
            <Route path="/pdf-lab" element={<PdfLab />} />
            <Route
              path="/document-converter"
              element={<DocumentConverter />}
            />
            <Route path="/archive-tools" element={<ArchiveTools />} />
            <Route path="/audio-lab" element={<AudioLab />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </AppShell>
    </HashRouter>
  </React.StrictMode>,
)
