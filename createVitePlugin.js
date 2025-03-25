// Node.jsの互換性問題を回避するプラグイン
const fs = require('fs');
const path = require('path');

module.exports = function createNodeCompatPlugin() {
  const virtualModuleId = 'virtual:node-polyfills';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  return {
    name: 'vite-plugin-node-polyfills',
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `
          // Node.js polyfills
          window.process = window.process || { env: {} };
          window.Buffer = window.Buffer || { isBuffer: () => false };
          window.global = window;
        `;
      }
    },
    configureServer(server) {
      // サーバー起動時にログを出力
      server.httpServer?.once('listening', () => {
        const address = server.httpServer.address();
        const hostname = address.address === '::' ? 'localhost' : address.address;
        const port = address.port;
        console.log(`\n  🚀 Server running at http://${hostname}:${port}\n`);
      });
    }
  };
};
