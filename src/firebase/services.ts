import * as speakeasy from 'speakeasy';

// Window型を拡張してFirebaseインスタンスを持てるようにする
declare global {
  interface Window {
    _FIREBASE: any;
    _FIREBASE_AUTH: any;
    _FIREBASE_FIRESTORE: any;
    _FIREBASE_DATABASE: any;
    firebase?: any; // グローバルfirebaseへの参照も許可
  }
}

// Firebaseインスタンスを初期化/取得する関数
const getFirebaseInstance = () => {
  if (!window._FIREBASE) {
    console.log('Firebase instance not found in window._FIREBASE, trying alternatives');
    // Firebase SDKがロードされているがwindowにセットされていない場合の対応
    if (typeof firebase !== 'undefined') {
      console.log('Using global firebase variable as fallback');
      return firebase;
    } else if (typeof window.firebase !== 'undefined') {
      console.log('Using window.firebase variable as fallback');
      return window.firebase;
    }
    console.error('No Firebase instance available');
    return null;
  }
  return window._FIREBASE;
};

// Firebaseサービスを取得
const firebase = getFirebaseInstance();
console.log('Firebase instance obtained:', !!firebase);

// 認証サービスの初期化
let auth: any = null;
const initAuth = () => {
  if (auth) return auth; // 既に初期化されている場合

  try {
    // 優先度順に認証を取得
    if (window._FIREBASE_AUTH) {
      auth = window._FIREBASE_AUTH;
      console.log('Using window._FIREBASE_AUTH');
    } else if (firebase && typeof firebase.auth === 'function') {
      auth = firebase.auth();
      console.log('Using firebase.auth()');
      // グローバル変数にも設定
      window._FIREBASE_AUTH = auth;
    } else if (window.firebase && typeof window.firebase.auth === 'function') {
      auth = window.firebase.auth();
      console.log('Using window.firebase.auth()');
      // グローバル変数にも設定
      window._FIREBASE_AUTH = auth;
    } else {
      console.error('No Firebase auth available after all attempts');
      return null;
    }
    
    return auth;
  } catch (error) {
    console.error('Failed to initialize auth in initAuth():', error);
    return null;
  }
};

// Firestoreの初期化
let db: any = null;
const initFirestore = () => {
  if (db) return db; // 既に初期化されている場合

  try {
    // 優先度順にFirestoreを取得
    if (window._FIREBASE_FIRESTORE) {
      db = window._FIREBASE_FIRESTORE;
      console.log('Using window._FIREBASE_FIRESTORE');
    } else if (firebase && typeof firebase.firestore === 'function') {
      db = firebase.firestore();
      console.log('Using firebase.firestore()');
      // グローバル変数にも設定
      window._FIREBASE_FIRESTORE = db;
    } else if (window.firebase && typeof window.firebase.firestore === 'function') {
      db = window.firebase.firestore();
      console.log('Using window.firebase.firestore()');
      // グローバル変数にも設定
      window._FIREBASE_FIRESTORE = db;
    } else {
      console.error('No Firebase firestore available after all attempts');
      return null;
    }
    
    return db;
  } catch (error) {
    console.error('Failed to initialize firestore in initFirestore():', error);
    return null;
  }
};

// Realtime Databaseの初期化
let rtdb: any = null;
const initDatabase = () => {
  if (rtdb) return rtdb; // 既に初期化されている場合

  try {
    // 優先度順にDatabaseを取得
    if (window._FIREBASE_DATABASE) {
      rtdb = window._FIREBASE_DATABASE;
      console.log('Using window._FIREBASE_DATABASE');
    } else if (firebase && typeof firebase.database === 'function') {
      rtdb = firebase.database();
      console.log('Using firebase.database()');
      // グローバル変数にも設定
      window._FIREBASE_DATABASE = rtdb;
    } else if (window.firebase && typeof window.firebase.database === 'function') {
      rtdb = window.firebase.database();
      console.log('Using window.firebase.database()');
      // グローバル変数にも設定
      window._FIREBASE_DATABASE = rtdb;
    } else {
      console.error('No Firebase database available after all attempts');
      return null;
    }
    
    return rtdb;
  } catch (error) {
    console.error('Failed to initialize database in initDatabase():', error);
    return null;
  }
};

// 初期化の実行
auth = initAuth();
db = initFirestore();
rtdb = initDatabase();

// 開発環境の場合、Firebase Emulatorに接続
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_EMULATOR === 'true') {
  // Emulatorのホストとポートを設定
  const authEmulatorHost = process.env.REACT_APP_AUTH_EMULATOR_HOST || 'localhost:9099';
  const firestoreEmulatorHost = process.env.REACT_APP_FIRESTORE_EMULATOR_HOST || 'localhost:8080';
  const databaseEmulatorHost = process.env.REACT_APP_DATABASE_EMULATOR_HOST || 'localhost:9000';
  
  // Emulator接続設定
  if (auth) {
    auth.useEmulator(`http://${authEmulatorHost}`);
    console.log(`Firebase Auth Emulator connected at ${authEmulatorHost}`);
  }
  
  if (db) {
    db.useEmulator(
      firestoreEmulatorHost.split(':')[0], 
      parseInt(firestoreEmulatorHost.split(':')[1])
    );
    console.log(`Firestore Emulator connected at ${firestoreEmulatorHost}`);
  }
  
  if (rtdb) {
    rtdb.useEmulator(
      databaseEmulatorHost.split(':')[0], 
      parseInt(databaseEmulatorHost.split(':')[1])
    );
    console.log(`Realtime Database Emulator connected at ${databaseEmulatorHost}`);
  }
  
  console.log('Firebase Emulators enabled for development');
}

console.log('Firebase services.ts loaded, firebase instance:', !!firebase, 'auth:', !!auth, 'firestore:', !!db);

// 安全なFirebaseサービスの使用のためのヘルパー関数
const safeFirebaseOp = async <T>(
  operation: () => Promise<T>,
  serviceName: string,
  fallback: T
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    console.error(`Firebase ${serviceName} operation failed:`, error);
    return fallback;
  }
};

// 安全に認証状態を取得
export const getCurrentUser = () => {
  try {
    const currentAuth = initAuth();
    return currentAuth?.currentUser || null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
};

// Firebaseサービスをエクスポート
export { firebase, auth, db, rtdb };

// ユーザープロファイルをFirestoreに保存
export const saveUserToFirestore = async (user: any) => {
  const firestore = initFirestore();
  if (!user?.uid || !firestore) {
    console.error('Cannot save user to Firestore. User or DB not available.');
    return;
  }

  const userRef = firestore.collection('users').doc(user.uid);
  try {
    const docSnap = await userRef.get();

    if (!docSnap.exists) {
      // 新規ユーザー
      await userRef.set({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        twoFactorEnabled: false
      });
      console.log('User saved to Firestore:', user.uid);
    }
  } catch (error) {
    console.error('Error saving user to Firestore:', error);
  }
};

// 安全なユーザー認証状態の監視
export const subscribeToAuthChanges = (callback: (user: any | null) => void) => {
  try {
    const currentAuth = initAuth();
    if (!currentAuth) {
      console.error('Auth not available, cannot subscribe to auth changes');
      callback(null);
      return () => {}; // Noop unsubscribe function
    }
    
    return currentAuth.onAuthStateChanged(async (user: any) => {
    if (user) {
        const firestore = initFirestore();
        if (firestore) {
      try {
            const userRef = firestore.collection('users').doc(user.uid);
        const docSnap = await userRef.get();
        
        if (docSnap.exists) {
          const userData = docSnap.data();
          // カスタムプロパティを追加
          user.twoFactorEnabled = userData?.twoFactorEnabled || false;
        }
      } catch (error) {
        console.error('Error getting user 2FA settings:', error);
          }
      }
    }
    callback(user);
  });
  } catch (error) {
    console.error('Failed to subscribe to auth changes:', error);
    callback(null);
    return () => {}; // Noop unsubscribe function
  }
};

// ユーザープロファイルの更新
export const updateUserProfile = async (
  uid: string, 
  data: {
    experienceLevel?: string;
    learningGoals?: string[];
    learningLanguages?: string[];
    displayName?: string;
  }
) => {
  const firestore = initFirestore();
  if (!firestore) {
    return { success: false, error: 'Firestore not available' };
  }

  try {
    const userRef = firestore.collection('users').doc(uid);
    await userRef.update({ 
      ...data, 
      updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
    });
    return { success: true };
  } catch (error) {
    console.error('プロファイル更新エラー:', error);
    return { success: false, error };
  }
};

// ユーザープロファイル取得
export const getUserProfile = async (uid: string) => {
  try {
    const userRef = db.collection('users').doc(uid);
    const docSnap = await userRef.get();
    
    if (docSnap.exists) {
      return { success: true, profile: docSnap.data() };
    } else {
      return { success: false, error: 'ユーザーが見つかりません' };
    }
  } catch (error) {
    console.error('プロファイル取得エラー:', error);
    return { success: false, error };
  }
};

// ネットワーク接続を確認する関数
const checkNetworkConnection = async (): Promise<boolean> => {
  try {
    // Googleへの簡単なフェッチリクエストで接続を確認
    const response = await fetch('https://www.google.com/favicon.ico', {
      mode: 'no-cors',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    console.log('[services.ts] ネットワーク接続チェック成功');
    return true;
  } catch (error) {
    console.error('[services.ts] ネットワーク接続チェック失敗:', error);
    return false;
  }
};

// auth/network-request-failed エラーの詳細情報を取得
const getNetworkErrorDetails = async () => {
  try {
    // 現在のFirebaseプロジェクトの設定をログ出力
    console.log('[services.ts] Firebase設定確認:', {
      authDomain: firebase.app().options.authDomain,
      apiKey: firebase.app().options.apiKey ? '存在します' : 'ありません',
      projectId: firebase.app().options.projectId,
    });
    
    // CORSテスト（Firebaseドメインへのアクセス確認）
    try {
      const testUrl = `https://${firebase.app().options.authDomain}/favicon.ico`;
      console.log(`[services.ts] Firebase認証ドメインテスト: ${testUrl}`);
      const response = await fetch(testUrl, { 
        mode: 'no-cors',
        cache: 'no-store'
      });
      console.log('[services.ts] Firebase認証ドメインアクセス成功');
      return '接続テスト成功。認証ドメインにアクセスできます。';
    } catch (error: any) {
      console.error('[services.ts] Firebase認証ドメインアクセスエラー:', error);
      return `接続テスト失敗。認証ドメインへのアクセスができません: ${error.message}`;
    }
  } catch (error) {
    console.error('[services.ts] エラー詳細取得中のエラー:', error);
    return 'エラー詳細の取得に失敗しました';
  }
};

// 認証結果の型定義
interface AuthResult {
  success: boolean;
  user?: any;
  error?: any;
  message?: string;
  githubToken?: string;
  linked?: boolean;
  email?: string;
  methods?: string[];
  errorType?: string;
  errorDetails?: any;
}

// GitHub OAuth認証（改善版）
export const signInWithGithub = async (): Promise<AuthResult> => {
  try {
    // 認証の初期化状態を確認
    if (!auth && window._FIREBASE_AUTH) {
      console.log('Using window._FIREBASE_AUTH as fallback in signInWithGithub');
      auth = window._FIREBASE_AUTH;
    }

    // firebase instance再確認
    let firebaseInstance = firebase;
    if (!firebaseInstance) {
      if (window._FIREBASE) {
        console.log('Using window._FIREBASE as fallback in signInWithGithub');
        firebaseInstance = window._FIREBASE;
      } else if (typeof window.firebase !== 'undefined') {
        console.log('Using window.firebase as fallback in signInWithGithub');
        firebaseInstance = window.firebase;
      }
    }
    
    if (!auth || !firebaseInstance) {
      console.error('Firebase auth or firebase instance not available for GitHub auth');
      return { success: false, error: 'Firebase auth not available' };
    }
    
    console.log('GitHub auth starting with:', { authExists: !!auth, firebaseExists: !!firebaseInstance });
    
    // GitHub認証プロバイダの設定
    const provider = new firebaseInstance.auth.GithubAuthProvider();
    provider.addScope('repo');
    provider.setCustomParameters({
      allow_signup: 'true'
    });
    
    console.log('GitHub provider created, attempting sign in with popup');
    
    // GitHub認証を実行
      const result = await auth.signInWithPopup(provider);
      
    // ユーザー情報を取得
    const user = result.user;
    if (!user) {
      return { success: false, error: 'User information not available after authentication' };
    }
    
    // GitHubトークンを取得
    const credential = result.credential as any;
    const githubToken = credential?.accessToken;
    
    // Firestoreにユーザー情報を保存
    if (db) {
      await saveUserToFirestore(user);
      } else {
      console.warn('Firestore not available, user data not saved');
      }
      
      return {
        success: true,
      user,
      githubToken
      };
    } catch (error: any) {
    console.error('GitHub認証中に予期せぬエラーが発生:', error);
    
    // エラー詳細をログ
    console.log('GitHub認証エラー詳細:', {
      code: error.code,
      message: error.message,
      email: error.email,
      credential: error.credential,
      stack: error.stack
    });
    
    // エラー処理
    if (error.code === 'auth/account-exists-with-different-credential') {
      // 別の認証方法で登録済みの場合のエラー処理
      try {
        if (auth && error.email) {
          const methods = await auth.fetchSignInMethodsForEmail(error.email);
          return {
            success: false,
            error: error,
            message: `このメールアドレスは既に別の方法で登録されています。次の方法をお試しください: ${methods.join(', ')}`,
            email: error.email
          };
        }
        } catch (fetchError) {
            return { 
              success: false, 
          error: error,
          message: 'このメールアドレスは既に別の方法で登録されています。'
        };
      }
    }
    
    return {
      success: false,
      error: error,
      message: error.message || 'GitHub認証中にエラーが発生しました'
    };
  }
};

// Google認証
export const signInWithGoogle = async () => {
  try {
    console.log('[services.ts] Google認証を開始...');
    
    // ネットワーク接続を確認
    const isConnected = await checkNetworkConnection();
    if (!isConnected) {
      return { 
        success: false, 
        error: 'ネットワーク接続がありません。インターネット接続を確認してください。' 
      };
    }
    
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    
    // カスタムパラメータを設定（promptのみ）
    googleProvider.setCustomParameters({
      'prompt': 'select_account'
    });
    
    // Firebase設定の詳細をログ出力
    const firebaseConfig = firebase.app().options;
    console.log('[services.ts] Google認証のFirebase設定詳細:', {
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      apiKey: firebaseConfig.apiKey ? '存在します' : 'ありません'
    });
    
    try {
      // まずポップアップで試みる
      console.log('[services.ts] Googleポップアップ認証を開始します...');
      try {
        const result = await auth.signInWithPopup(googleProvider);
        console.log('[services.ts] Googleポップアップ認証成功:', result.user?.uid);
        console.log('[services.ts] Google認証結果の詳細:', {
          hasCredential: !!result.credential,
          hasUser: !!result.user,
          provider: result.additionalUserInfo?.providerId,
          isNewUser: result.additionalUserInfo?.isNewUser
        });
        
        if (result.user) {
          try {
            await saveUserToFirestore(result.user);
            console.log('[services.ts] Googleユーザー情報をFirestoreに保存しました');
          } catch (firestoreError) {
            console.error('[services.ts] Google認証: Firestoreへの保存エラー:', firestoreError);
            // エラーが発生してもユーザー情報は返す
          }
          
          // Google認証トークンも保存しておく
          if (result.credential) {
            const credential = result.credential as any;
            const token = credential.accessToken;
            
            if (token) {
              localStorage.setItem('google_token', token);
              console.log('[services.ts] Googleトークン保存成功:', token.substring(0, 8) + '...');
            }
          }
        }
        
        return { success: true, user: result.user };
      } catch (popupError) {
        console.error('[services.ts] Googleポップアップ認証失敗:', popupError);
        
        // ポップアップがブロックされたか閉じられた場合はリダイレクト認証にフォールバック
        if (popupError && typeof popupError === 'object' && 'code' in popupError) {
          const code = (popupError as any).code;
          console.error('[services.ts] Googleポップアップエラーコード:', code);
          
          if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
            console.log('[services.ts] Googleポップアップ失敗のためリダイレクト認証に切り替えます...');
            // セッションストレージにリダイレクトフラグを設定
            sessionStorage.setItem('auth_redirect_attempted', 'true');
            // リダイレクト認証を実行
            await auth.signInWithRedirect(googleProvider);
            return { success: true, message: 'Googleリダイレクト認証を開始しました' };
          } else if (code === 'auth/network-request-failed') {
            // ネットワークエラー時の詳細情報を取得
            const errorDetails = await getNetworkErrorDetails();
            return { 
              success: false, 
              error: popupError,
              errorDetails
            };
          }
        }
        
        // その他のエラーの場合はそのまま返す
        return { success: false, error: popupError };
      }
    } catch (error) {
      console.error('[services.ts] Google認証全体のエラー:', error);
      return { success: false, error };
    }
  } catch (error) {
    console.error('[services.ts] Google認証エラー:', error);
    
    // より詳細なエラー情報をログに出力
    if (error instanceof Error) {
      console.error('[services.ts] エラーの詳細:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return { success: false, error: error instanceof Error ? error.message : '認証エラーが発生しました' };
  }
};

// メールアドレスでの登録
export const registerWithEmail = async (email: string, password: string) => {
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    if (result.user) {
      await saveUserToFirestore(result.user);
    }
    return { success: true, user: result.user };
  } catch (error) {
    console.error('メール登録エラー:', error);
    return { success: false, error };
  }
};

// メールアドレスでのログイン
export const loginWithEmail = async (email: string, password: string) => {
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('メールログインエラー:', error);
    return { success: false, error };
  }
};

// ログアウト
export const logoutUser = async () => {
  try {
    await auth.signOut();
    return { success: true };
  } catch (error) {
    console.error('ログアウトエラー:', error);
    return { success: false, error };
  }
};

// 2FAの設定を保存
export const enableTwoFactorAuth = async (uid: string, secret: string) => {
  try {
    const userRef = db.collection('users').doc(uid);
    await userRef.update({
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('2FA設定エラー:', error);
    return { success: false, error };
  }
};

// 2FAの設定を無効化
export const disableTwoFactorAuth = async (uid: string) => {
  try {
    const userRef = db.collection('users').doc(uid);
    await userRef.update({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('2FA無効化エラー:', error);
    return { success: false, error };
  }
};

// 2FAの検証
export const verifyTwoFactorCode = async (uid: string, code: string) => {
  try {
    const userRef = db.collection('users').doc(uid);
    const docSnap = await userRef.get();
    
    if (!docSnap.exists) {
      return { success: false, error: 'ユーザーが見つかりません' };
    }

    const userData = docSnap.data();
    if (!userData?.twoFactorEnabled || !userData?.twoFactorSecret) {
      return { success: false, error: '2FAが設定されていません' };
    }

    // TOTP検証
    const isValid = speakeasy.totp.verify({
      secret: userData.twoFactorSecret,
      encoding: 'base32',
      token: code
    });

    if (isValid) {
      return { success: true };
    } else {
      return { success: false, error: '無効な認証コードです' };
    }
  } catch (error) {
    console.error('2FA検証エラー:', error);
    return { success: false, error };
  }
};

// リダイレクト認証の結果を処理する関数
export const handleRedirectResult = async () => {
  try {
    // リダイレクト認証からの結果を取得
    console.log('処理リダイレクト認証結果...');
    
    // getRedirectResultを待機
    const result = await auth.getRedirectResult();
    console.log('リダイレクト結果:', result);
    
    // 認証が成功し、ユーザーが存在する場合
    if (result && result.user) {
      console.log('リダイレクト認証成功:', result.user.uid);
      await saveUserToFirestore(result.user);
      
      // 認証プロバイダーの情報を取得
      if (result.credential) {
        console.log('認証プロバイダー:', result.additionalUserInfo?.providerId);
        
        // GitHubの認証情報を処理
        if (result.additionalUserInfo?.providerId === 'github.com') {
          const credential = result.credential as any;
          const token = credential.accessToken;
          
          if (token) {
            localStorage.setItem('github_token', token);
            console.log('GitHub token saved:', !!token);
          }
        }
      }
      
      return { success: true, user: result.user };
    } else {
      // 認証結果はあるが、ユーザー情報がない場合
      // 通常、初回アクセス時やリダイレクトがまだ完了していない場合
      console.log('認証結果レスポンス:', result ? 'あり' : 'なし');
      
      // Firebase v8では、リダイレクト結果が空でもエラーではない（初回アクセス時）
      if (result) {
        console.log('リダイレクト結果詳細:', JSON.stringify({
          user: !!result.user,
          credential: !!result.credential,
          additionalUserInfo: !!result.additionalUserInfo,
          operationType: result.operationType
        }));
        
        // ユーザーがいない場合はリダイレクト前の可能性
        return { success: false, error: 'No user in authentication result' };
      }
      
      // 初回アクセスなど、リダイレクト結果がない場合は正常
      return { success: true, message: 'No pending redirect' };
    }
  } catch (error) {
    console.error('リダイレクト認証結果処理エラー:', error);
    
    // エラーの詳細情報をログに出力
    if (error instanceof Error) {
      console.error('エラー詳細:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    
    // Firebase特有のエラーコードとメッセージを出力
    let errorCode = '';
    let errorMessage = '';
    
    if (error && typeof error === 'object' && 'code' in error) {
      errorCode = (error as any).code;
      errorMessage = (error as any).message;
      console.error('Firebaseエラー:', {
        code: errorCode,
        message: errorMessage
      });
    }
    
    return { success: false, error };
  }
};

// アカウントリンク用のヘルパー関数 - 既存アカウントに新しい認証方法を追加
export const linkAccountWithProvider = async (provider: firebase.auth.AuthProvider) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { 
        success: false, 
        error: 'ユーザーがログインしていません。先にログインしてください。' 
      };
    }
    
    console.log(`[services.ts] アカウント(${currentUser.email})にプロバイダーをリンクします...`);
    const result = await currentUser.linkWithPopup(provider);
    
    console.log('[services.ts] アカウントリンク成功:', result);
    return { success: true, user: currentUser, credential: result.credential };
  } catch (error) {
    console.error('[services.ts] アカウントリンクエラー:', error);
    
    let errorMessage = 'アカウントのリンクに失敗しました。';
    let errorType = 'unknown';
    
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as any).code;
      
      if (code === 'auth/credential-already-in-use') {
        errorType = 'credential-already-in-use';
        errorMessage = 'この認証情報は既に別のアカウントで使用されています。';
      } else if (code === 'auth/email-already-in-use') {
        errorType = 'email-already-in-use';
        errorMessage = 'このメールアドレスは既に使用されています。';
      } else if (code === 'auth/provider-already-linked') {
        errorType = 'provider-already-linked';
        errorMessage = 'このプロバイダーは既にアカウントにリンクされています。';
      } else if (code === 'auth/operation-not-allowed') {
        errorType = 'operation-not-allowed';
        errorMessage = 'この操作は許可されていません。';
      }
    }
    
    return { 
      success: false, 
      error, 
      errorType,
      message: errorMessage
    };
  }
}; 