// Firebase認証ヘルパー関数

declare global {
  interface Window {
    _FIREBASE: any;
    _FIREBASE_AUTH: any;
    _FIREBASE_FIRESTORE: any;
    firebase?: any;
  }
}

// Firebase認証インスタンスの取得と初期化確認
const getAuthInstance = () => {
  // 初期化済みのインスタンスを探す（優先順位順）
  if (window._FIREBASE_AUTH) {
    console.log('Using existing window._FIREBASE_AUTH');
    return window._FIREBASE_AUTH;
  }
  
  // Firebaseインスタンスを取得して初期化
  const firebase = window._FIREBASE || window.firebase;
  if (firebase && typeof firebase.auth === 'function') {
    try {
      const auth = firebase.auth();
      console.log('Created new firebase.auth() instance');
      window._FIREBASE_AUTH = auth; // グローバル変数に保存
      return auth;
    } catch (error) {
      console.error('Failed to create auth instance:', error);
    }
  }
  
  console.error('No Firebase auth instance available');
  return null;
};

// Firebase認証プロバイダーの作成
const createGithubProvider = () => {
  const firebase = window._FIREBASE || window.firebase;
  if (!firebase || !firebase.auth || !firebase.auth.GithubAuthProvider) {
    console.error('GitHub provider cannot be created - Firebase not initialized properly');
    return null;
  }
  
  try {
    const provider = new firebase.auth.GithubAuthProvider();
    provider.addScope('repo');
    provider.setCustomParameters({
      allow_signup: 'true'
    });
    return provider;
  } catch (error) {
    console.error('Failed to create GitHub provider:', error);
    return null;
  }
};

// GitHub認証の実行
export const signInWithGithub = async () => {
  try {
    console.log('Beginning GitHub authentication process...');
    
    // 認証インスタンスの取得
    const auth = getAuthInstance();
    if (!auth) {
      return { 
        success: false, 
        error: 'Firebase auth not available',
        message: 'Firebase認証サービスが利用できません。ページを再読み込みするか、別のブラウザで試してください。'
      };
    }
    
    // Githubプロバイダーの作成
    const provider = createGithubProvider();
    if (!provider) {
      return { 
        success: false, 
        error: 'GitHub provider creation failed',
        message: 'GitHub認証プロバイダーの作成に失敗しました。'
      };
    }
    
    console.log('GitHub auth setup complete, calling signInWithPopup...');
    
    // 認証実行
    const result = await auth.signInWithPopup(provider);
    console.log('GitHub auth successful:', !!result.user);
    
    // 認証成功時の処理
    if (result.user) {
      return {
        success: true,
        user: result.user,
        githubToken: result.credential?.accessToken,
        message: 'GitHub認証が成功しました。'
      };
    } else {
      return {
        success: false,
        error: 'No user returned',
        message: 'ユーザー情報が返されませんでした。'
      };
    }
  } catch (error) {
    console.error('GitHub authentication error:', error);
    
    let errorMessage = '認証中にエラーが発生しました。';
    // エラーをany型にキャストして処理
    const firebaseError = error as any;
    if (firebaseError.code === 'auth/account-exists-with-different-credential') {
      errorMessage = 'このメールアドレスは既に別の方法で登録されています。';
    } else if (firebaseError.code === 'auth/popup-blocked') {
      errorMessage = 'ポップアップがブロックされました。ポップアップを許可してください。';
    } else if (firebaseError.code === 'auth/popup-closed-by-user') {
      errorMessage = '認証ポップアップが閉じられました。もう一度お試しください。';
    } else if (firebaseError.message) {
      errorMessage = firebaseError.message;
    }
    
    return {
      success: false,
      error: firebaseError,
      message: errorMessage
    };
  }
}; 