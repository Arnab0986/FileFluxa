import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
  react(),
  visualizer({
    filename: './stats.html',
    template: 'treemap',
    gzipSize: true,
    brotliSize: true,
    open: true,
  }),
],

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

          if (id.includes('/node_modules/jszip/')) {
            return 'zip-vendor'
          }
        },
      },
    },
  },
})
