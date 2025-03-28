// Firebase設定 - 環境変数から値を取得
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

export { firebaseConfig };

// デバッグログ
console.log('Config loaded from environment variables:', {
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

// 注: .env.local ファイルに以下の環境変数を設定してください:
// VITE_FIREBASE_API_KEY=your-api-key
// VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
// VITE_FIREBASE_PROJECT_ID=your-project-id
// VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
// VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
// VITE_FIREBASE_APP_ID=your-app-id
// VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
// VITE_FIREBASE_DATABASE_URL=your-database-url

// 本番環境用に.envファイルまたは環境変数を設定してください
// 例: 
// VITE_FIREBASE_API_KEY=your-actual-api-key
// VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
// 以下同様に設定

// Firebaseの初期化は実際の値に置き換えてから行ってください
// このファイルは設定例です 