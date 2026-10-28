
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) {
            return 'react-vendor'
          }

          if (id.includes('/node_modules/react-router/')) {
            return 'router-vendor'
          }

          if (id.includes('/node_modules/framer-motion/')) {
            return 'motion-vendor'
          }

          if (id.includes('/node_modules/lucide-react/')) {
            return 'icons-vendor'
          }

          if (id.includes('/node_modules/xlsx/')) {
            return 'xlsx-vendor'
          }

          if (
            id.includes('/node_modules/pdfjs-dist/') ||
            id.includes('/node_modules/pdf-lib/')
          ) {
            return 'pdf-vendor'
          }

          if (
            id.includes('/node_modules/docx/') ||
            id.includes('/node_modules/mammoth/')
          ) {
            return 'document-vendor'
          }

          if (id.includes('/node_modules/jszip/')) {
            return 'zip-vendor'
          }
        },
      },
    },
  },
})
