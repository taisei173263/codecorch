import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// カスタムプラグイン: HTMLのプレースホルダーを.envからの値に置き換え
const htmlEnvPlugin = () => {
  return {
    name: 'html-env-plugin',
    transformIndexHtml(html: string) {
      // %VITE_XXX%形式の変数を環境変数から取得した値に置き換え
      return html.replace(/%VITE_\w+%/g, (match) => {
        const key = match.slice(1, -1); // %を除去
        return process.env[key] || '';
      });
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    htmlEnvPlugin() // HTML環境変数置換プラグインを追加
  ],
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