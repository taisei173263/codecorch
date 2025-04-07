import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'

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

// カスタムプラグイン: ビルド後にファイルをコピー
const copyPublicFiles = () => {
  return {
    name: 'copy-public-files',
    closeBundle() {
      const publicDir = 'public';
      const distDir = 'dist';
      
      // firebase-init.jsファイルをコピー
      const sourceFile = path.join(publicDir, 'firebase-init.js');
      const targetFile = path.join(distDir, 'firebase-init.js');
      
      if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, targetFile);
        console.log(`Copied ${sourceFile} to ${targetFile}`);
      } else {
        console.error(`Source file ${sourceFile} not found!`);
      }
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    htmlEnvPlugin(), // HTML環境変数置換プラグインを追加
    copyPublicFiles() // 静的ファイルコピープラグインを追加
  ],
  server: {
    port: 5173,
    open: true,
    hmr: {
      overlay: false // エラーオーバーレイを無効化
    }
  },
  define: {
    'process.env': process.env,
    global: 'window'
  },
  resolve: {
    alias: [
      { find: 'process', replacement: 'process/browser' },
      { find: 'util', replacement: 'util/' },
      {
        find: '#minpath',
        replacement: 'minpath'
      }
    ]
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('markdown') || id.includes('remark')) {
              return 'vendor-markdown';
            }
            return 'vendor'; // その他のnode_modules
          }
        },
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      },
      external: ['#minpath', '#minproc', '#minurl']
    }
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/database']
  },
  // base: '/codecoach/', // NetlifyにデプロイするためコメントアウトもしくはPRODUCTION_MODEに応じて変更
}) 