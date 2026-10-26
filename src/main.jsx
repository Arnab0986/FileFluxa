import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Home } from './components/Home'
import { ImageStudio } from './features/ImageStudio'
import { PdfLab } from './features/PdfLab'
import { DocumentConverter } from './features/DocumentConverter'
import { ArchiveTools } from './features/ArchiveTools'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/image-studio" element={<ImageStudio />} />
          <Route path="/pdf-lab" element={<PdfLab />} />
          <Route path="/document-converter" element={<DocumentConverter />} />
          <Route path="/archive-tools" element={<ArchiveTools />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </AppShell>
    </HashRouter>
  </React.StrictMode>,
)
