import * as speakeasy from 'speakeasy';

// Window型を拡張してFirebaseインスタンスを持てるようにする
declare global {
  interface Window {
    _FIREBASE: any;
    _FIREBASE_AUTH: any;
    _FIREBASE_FIRESTORE: any;
    _FIREBASE_DATABASE: any;
  }
}

// グローバル変数からFirebaseインスタンスを取得
const firebase = window._FIREBASE;
const auth = window._FIREBASE_AUTH;
const db = window._FIREBASE_FIRESTORE;
const rtdb = window._FIREBASE_DATABASE;

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

console.log('Firebase services.ts loaded, firebase instance:', !!firebase);

// Firebaseサービスをエクスポート
export { firebase, auth, db, rtdb };

// ユーザープロファイルをFirestoreに保存
export const saveUserToFirestore = async (user: any) => {
  if (!user?.uid || !db) {
    console.error('Cannot save user to Firestore. User or DB not available.');
    return;
  }

  const userRef = db.collection('users').doc(user.uid);
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

// 認証状態の監視
export const subscribeToAuthChanges = (callback: (user: any | null) => void) => {
  return auth.onAuthStateChanged(async (user: any) => {
    if (user) {
      try {
        const userRef = db.collection('users').doc(user.uid);
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
    callback(user);
  });
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
  try {
    const userRef = db.collection('users').doc(uid);
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

// GitHub OAuth認証
export const signInWithGithub = async (): Promise<AuthResult> => {
  console.log('GitHub認証を開始します');
  
  try {
    // ネットワーク接続の確認
    if (!navigator.onLine) {
      console.error('ネットワーク接続がありません');
      return { 
        success: false, 
        error: new Error('インターネット接続がありません。ネットワーク設定を確認してください。'),
        message: 'インターネット接続がありません'
      };
    }

    // 認証プロバイダ設定
    const GithubAuthProvider = firebase.auth.GithubAuthProvider;
    const provider = new GithubAuthProvider();
    provider.addScope('repo');
    
    // 明示的にリダイレクトURLを設定
    const netlifyURL = 'https://codecoach2025.netlify.app/';
    provider.setCustomParameters({
      redirect_uri: netlifyURL
    });
    
    // ログインの状態をコンソールに出力
    const beforeAuth = await auth.currentUser;
    console.log('認証前のユーザー状態:', beforeAuth ? 'ログイン中' : '未ログイン');
    
    // ポップアップ認証を試みる
    try {
      console.log('ポップアップでGitHub認証を試みます...');
      const result = await auth.signInWithPopup(provider);
      
      // 認証結果からGitHubのトークンを取得
      const credential = result.credential;
      const token = credential ? (credential as any).accessToken : null;
            
            if (token) {
        console.log('GitHub認証成功: アクセストークンを保存します');
              localStorage.setItem('github_token', token);
        localStorage.setItem('last_github_login', new Date().toISOString());
      } else {
        console.error('GitHub認証は成功しましたが、トークンが取得できませんでした');
      }
      
      return {
        success: true,
        user: result.user,
        githubToken: token
      };
    } catch (error: any) {
      console.error('ポップアップでのGitHub認証に失敗:', error);
      
      // エラーコードに基づいて処理
      if (error.code === 'auth/popup-blocked') {
        console.log('ポップアップがブロックされました。リダイレクト認証に切り替えます...');
        
        try {
          // リダイレクト認証に切り替え
          await auth.signInWithRedirect(provider);
              return { 
            success: true,
            message: 'GitHubログインページにリダイレクトしています。認証後に自動的に戻ります。'
          };
        } catch (redirectError) {
          console.error('リダイレクト認証の設定に失敗:', redirectError);
              return {
                success: false,
            error: redirectError,
            message: 'GitHubログインページへのリダイレクトに失敗しました。'
          };
        }
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        // 同じメールアドレスが別の認証方法で既に使用されている場合の処理
        console.log('アカウントが別の認証方法で既に存在します。', error);
        
        try {
          // エラーからメールアドレスを取得
          const email = error.customData?.email;
          if (!email) {
            throw new Error('アカウント連携に必要なメールアドレスが取得できませんでした。');
          }
          
          // このメールアドレスに関連付けられた認証方法を確認
          const methods = await auth.fetchSignInMethodsForEmail(email);
          console.log(`メール「${email}」の既存の認証方法:`, methods);
          
          return {
            success: false,
            error: error,
            message: `このGitHubアカウントのメールアドレス(${email})は既に別の認証方法(${methods.join(', ')})で登録されています。現在のアカウントにGitHubを連携するには、まず既存の方法でログインしてください。`,
            email: email,
            methods: methods
          };
        } catch (fetchError) {
          console.error('認証方法の取得中にエラー:', fetchError);
            return { 
              success: false, 
            error: fetchError,
            message: '認証に関する情報が取得できませんでした。別の認証方法をお試しください。'
          };
        }
      }
      
      // その他のエラー
      return {
        success: false,
        error: error
      };
    }
  } catch (error) {
    console.error('GitHub認証中に予期せぬエラーが発生:', error);
    return {
      success: false,
      error: error,
      message: '予期せぬエラーが発生しました'
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