// Firebase初期化スクリプト
// このファイルはHTMLから直接読み込まれます

// Firebase v8のXMLHttpRequest問題対策
(function() {
  // XHRのバックアップと検証
  const originalXHR = window.XMLHttpRequest;
  
  // XMLHttpRequestが存在するが適切に機能していない場合のポリフィル
  try {
    // 存在チェック
    if (!window.XMLHttpRequest) {
      console.warn('XMLHttpRequest not found, creating polyfill');
      window.XMLHttpRequest = function() {
        return {
          open: function() {},
          send: function() {},
          setRequestHeader: function() {},
          onreadystatechange: null,
          readyState: 0,
          status: 200,
          responseText: ""
        };
      };
    }
    
    // global.XMLHttpRequestもブラウザ版を使用
    window.global = window.global || window;
    window.global.XMLHttpRequest = window.XMLHttpRequest;
    
  } catch (e) {
    console.error('Failed to polyfill XMLHttpRequest:', e);
  }
})();

// Node.js polyfills
window.global = window;
window.process = window.process || { env: {} };

// Firebase設定を環境変数から読み込むよう修正
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 環境変数から設定を取得
// 注: 実際にはindex.htmlで<script>タグを使って環境変数を注入する必要があります
const firebaseConfig = window.ENV_CONFIG?.FIREBASE || {
  apiKey: "AIzaSyB-hTYnbPzKioEN02HBqGPnS04NqvJXryY",
  authDomain: "codecoach-61d26.firebaseapp.com",
  projectId: "codecoach-61d26",
  storageBucket: "codecoach-61d26.appspot.com",
  messagingSenderId: "313757336409",
  appId: "1:313757336409:web:b73f3d69835f848975c248",
  measurementId: "G-DCBS6YVDZK",
  databaseURL: "https://codecoach-61d26.firebaseio.com"
};

console.log('[firebase-init.js] Using authDomain:', firebaseConfig.authDomain);

// Firebase初期化
try {
  // 既存のFirebaseアプリをチェック
  if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
    console.log('[firebase-init.js] Firebase already initialized, using existing app');
    
    // グローバルオブジェクトにFirebaseのインスタンスを設定
    window._FIREBASE = firebase;
    window._FIREBASE_AUTH = firebase.auth();
    window._FIREBASE_FIRESTORE = firebase.firestore();
    window._FIREBASE_DATABASE = firebase.database();
    
    // 初期化完了イベントを発行
    const event = new CustomEvent('firebase-initialized');
    window.dispatchEvent(event);
  } else {
    // Firebaseのロードを確認
    if (typeof firebase === 'undefined') {
      console.error('[firebase-init.js] Firebase SDK not loaded');
      // Firebaseのスクリプトが読み込まれるのを待つ簡易ポーリング
      const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined') {
          clearInterval(checkFirebase);
          console.log('[firebase-init.js] Firebase SDK loaded, initializing...');
          try {
            firebase.initializeApp(firebaseConfig);
            
            window._FIREBASE = firebase;
            window._FIREBASE_AUTH = firebase.auth();
            window._FIREBASE_FIRESTORE = firebase.firestore();
            window._FIREBASE_DATABASE = firebase.database();
            
            const event = new CustomEvent('firebase-initialized');
            window.dispatchEvent(event);
            
            console.log('[firebase-init.js] Firebase initialized successfully through polling');
          } catch (initError) {
            console.error('[firebase-init.js] Firebase initialization error in polling:', initError);
          }
        }
      }, 100);
    } else {
      console.log('[firebase-init.js] Initializing Firebase...');
      firebase.initializeApp(firebaseConfig);
      console.log('[firebase-init.js] Firebase initialized successfully');
      
      try {
        // グローバルオブジェクトにFirebaseのインスタンスを設定
        window._FIREBASE = firebase;
        window._FIREBASE_AUTH = firebase.auth();
        window._FIREBASE_FIRESTORE = firebase.firestore();
        window._FIREBASE_DATABASE = firebase.database();
        
        // 初期化完了イベントを発行
        const event = new CustomEvent('firebase-initialized');
        window.dispatchEvent(event);
      } catch (serviceError) {
        console.error('[firebase-init.js] Error setting up Firebase services:', serviceError);
      }
    }
  }
} catch (error) {
  console.error('[firebase-init.js] Firebase initialization error:', error);
  
  // エラー詳細の診断情報
  console.log('[firebase-init.js] Firebase diagnostic info:', {
    firebaseDefined: typeof firebase !== 'undefined',
    firebaseApps: typeof firebase !== 'undefined' ? firebase.apps : 'undefined',
    windowEnvConfig: !!window.ENV_CONFIG,
    browserUserAgent: navigator.userAgent
  });
} 