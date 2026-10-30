
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const apiTarget =
    env.VITE_API_PROXY_TARGET || 'http://localhost:5000'

  return {
    plugins: [
      react(),

      visualizer({
        filename: './stats.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
    ],

    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/health': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },

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
  }
})
