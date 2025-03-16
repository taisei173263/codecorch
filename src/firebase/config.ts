// Firebase設定
// 本番環境では環境変数からロードすることを推奨

/**
 * 環境変数またはデフォルト値から設定を取得
 * 本番環境では.envファイルまたは環境変数に設定してください
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "codecoach-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "codecoach-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "codecoach-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "YOUR_MEASUREMENT_ID"
};

// 本番環境用に.envファイルまたは環境変数を設定してください
// 例: 
// VITE_FIREBASE_API_KEY=your-actual-api-key
// VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
// 以下同様に設定

// Firebaseの初期化は実際の値に置き換えてから行ってください
// このファイルは設定例です 