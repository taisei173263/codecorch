// processポリフィルをインポート
import './process-browser-polyfill';

// メインエントリポイント
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'  // CSSを先にインポート
import App from './App'

// Windowインターフェース拡張
declare global {
  interface Window {
    _FIREBASE: any;
    _FIREBASE_AUTH: any;
    _FIREBASE_FIRESTORE: any;
    _FIREBASE_DATABASE: any;
  }
}

// デバッグ用コンソールログ
console.log('main.tsx loaded, environment:', import.meta.env.MODE);
console.log('Environment variables loaded:', {
  hasFirebaseApiKey: Boolean(import.meta.env.VITE_FIREBASE_API_KEY),
  hasFirebaseAuthDomain: Boolean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  hasFirebaseProjectId: Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID),
});

// レンダリング関数
const renderApp = () => {
  // Firebaseサービスを動的インポート
  import('./firebase/services').then((module) => {
    console.log('Firebase services loaded successfully');
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error('Root element not found! Check your index.html');
      return;
    }
    
    // Initialize dark mode based on user preference
    const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (userPrefersDark) {
      document.documentElement.classList.add('dark');
    }
    
    console.log('Rendering React application...');
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  }).catch(error => {
    console.error('Failed to import Firebase services:', error);
    document.body.innerHTML = '<div style="color: red; margin: 20px;">Firebaseサービスの読み込みに失敗しました。ページを更新してください。</div>';
  });
};

// Firebase初期化完了イベントをリッスン
if (window._FIREBASE) {
  console.log('Firebase already initialized, rendering app immediately');
  renderApp();
} else {
  console.log('Waiting for Firebase initialization...');
  window.addEventListener('firebase-initialized', () => {
    console.log('Firebase initialization event received, rendering app');
    renderApp();
  });
  
  // 5秒後のタイムアウト
  setTimeout(() => {
    if (!window._FIREBASE) {
      console.error('Firebase initialization timed out');
      document.body.innerHTML = '<div style="color: red; margin: 20px;">Firebase初期化がタイムアウトしました。ページを更新してください。</div>';
    }
  }, 5000);
} 