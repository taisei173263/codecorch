// ESMモジュールの互換性問題を回避するための初期化スクリプト
// Node.js v18におけるトップレベルawaitの問題を解決します

// Source Map Supportを静的にインストール
try {
  require('source-map-support').install();
} catch (e) {
  console.warn('Source map support not available');
}

// polyfillを追加
global.process = global.process || { env: {} };
global.Buffer = global.Buffer || { isBuffer: () => false };
global.global = global;

// Viteの起動をログ出力
console.log('\n🚀 Starting Vite development server...\n');
