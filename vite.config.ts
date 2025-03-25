import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  },
  define: {
    'process.env': process.env,
    global: 'window',
    'global.XMLHttpRequest': 'window.XMLHttpRequest'
  },
  resolve: {
    alias: {
      'xmlhttprequest': resolve(__dirname, './node_modules/xmlhttprequest'),
      util: 'util',
      process: 'process/browser'
    }
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis'
      }
    },
    include: ['util', 'process/browser', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/database']
  }
}) 