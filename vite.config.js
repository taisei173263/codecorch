const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')

// https://vitejs.dev/config/
module.exports = defineConfig({
  plugins: [react({
    // plugin-react のオプションを指定（必要に応じて）
    fastRefresh: true,
  })],
  server: {
    port: 5173,
    open: true
  },
  define: {
    'process.env': {},
    global: {}
  },
  resolve: {
    alias: {
      './runtimeConfig': './runtimeConfig.browser',
    }
  }
}) 