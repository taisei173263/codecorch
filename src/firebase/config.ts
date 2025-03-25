// Firebase設定 - ハードコードした値を使用
const firebaseConfig = {
  apiKey: "AIzaSyB-hTYnbPzKioEN02HBqGPnS04NqvJXryY",
  authDomain: "codecoach-61d26.firebaseapp.com",
  projectId: "codecoach-61d26",
  storageBucket: "codecoach-61d26.appspot.com",
  messagingSenderId: "313757336409",
  appId: "1:313757336409:web:b73f3d69835f848975c248",
  measurementId: "G-DCBS6YVDZK",
  databaseURL: "https://codecoach-61d26-default-rtdb.asia-southeast1.firebasedatabase.app"
};

export { firebaseConfig };

// デバッグログ
console.log('Config loaded with fixed values:', {
  projectId: firebaseConfig.projectId,
  hasApiKey: Boolean(firebaseConfig.apiKey),
  hasAuthDomain: Boolean(firebaseConfig.authDomain),
});

// 設定が有効かチェック
if (!firebaseConfig.apiKey) {
  console.error(
    'Firebase API key is not set. Please check your .env file and ensure VITE_FIREBASE_API_KEY is properly configured.'
  );
  console.log('Current environment variables:', {
    apiKey: Boolean(firebaseConfig.apiKey),
    authDomain: Boolean(firebaseConfig.authDomain),
    projectId: Boolean(firebaseConfig.projectId),
    databaseURL: Boolean(firebaseConfig.databaseURL),
  });
} else {
  console.log('Firebase API キーが正しく読み込まれました');
}

// 本番環境用に.envファイルまたは環境変数を設定してください
// 例: 
// VITE_FIREBASE_API_KEY=your-actual-api-key
// VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
// 以下同様に設定

// Firebaseの初期化は実際の値に置き換えてから行ってください
// このファイルは設定例です 