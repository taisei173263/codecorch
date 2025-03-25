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

// GitHub OAuth認証
export const signInWithGithub = async () => {
  try {
    const githubProvider = new firebase.auth.GithubAuthProvider();
    githubProvider.addScope('repo');
    githubProvider.addScope('read:user');
    githubProvider.addScope('user:email');
    
    // 認証リダイレクトURLを明示的に設定
    const currentUrl = window.location.origin;
    githubProvider.setCustomParameters({
      'redirect_uri': `${currentUrl}/__/auth/handler`
    });
    
    // ポップアップウィンドウの代わりにリダイレクトを使用するオプション
    // COOP (Cross-Origin-Opener-Policy)の問題を回避するため
    const useRedirect = false; // 必要に応じてtrueに変更
    
    let result;
    if (useRedirect) {
      // リダイレクト認証を使用
      await auth.signInWithRedirect(githubProvider);
      // 注: この後リダイレクトするため、以下のコードは実行されません
      // リダイレクト後に結果を取得するロジックを別途追加する必要があります
      return { success: true }; // リダイレクト前の仮の戻り値
    } else {
      // ポップアップ認証を使用
      result = await auth.signInWithPopup(githubProvider);
    }
    
    if (result.user) {
      await saveUserToFirestore(result.user);
      
      // GitHubアクセストークンを保存
      if (result.credential) {
        // credentialオブジェクトから直接アクセストークンを取得
        const credential = result.credential as any;
        const token = credential.accessToken;
        
        if (token) {
          // トークンをローカルストレージに保存し、デバッグ用にログ出力
          localStorage.setItem('github_token', token);
          console.log('GitHub token saved successfully:', !!token);
          
          // トークンを検証するために簡単な呼び出しを実行
          try {
            const response = await fetch('https://api.github.com/user', {
              headers: {
                Authorization: `token ${token}`
              }
            });
            if (response.ok) {
              console.log('GitHub token verified successfully');
            } else {
              console.error('GitHub token verification failed:', response.status);
            }
          } catch (verifyError) {
            console.error('Error verifying GitHub token:', verifyError);
          }
        } else {
          console.error('GitHub token not found in credentials');
        }
      } else {
        console.error('GitHub credentials not found in auth result');
      }
    }
    return { success: true, user: result.user };
  } catch (error) {
    console.error('GitHub認証エラー:', error);
    return { success: false, error };
  }
};

// Google認証
export const signInWithGoogle = async () => {
  try {
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    
    // ポップアップウィンドウの代わりにリダイレクトを使用するオプション
    // COOP (Cross-Origin-Opener-Policy)の問題を回避するため
    const useRedirect = false; // 必要に応じてtrueに変更
    
    let result;
    if (useRedirect) {
      // リダイレクト認証を使用
      await auth.signInWithRedirect(googleProvider);
      // 注: この後リダイレクトするため、以下のコードは実行されません
      // リダイレクト後に結果を取得するロジックを別途追加する必要があります
      return { success: true }; // リダイレクト前の仮の戻り値
    } else {
      // ポップアップ認証を使用
      result = await auth.signInWithPopup(googleProvider);
    }
    
    if (result.user) {
      await saveUserToFirestore(result.user);
    }
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Google認証エラー:', error);
    return { success: false, error };
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
    const result = await auth.getRedirectResult();
    
    // 認証が成功し、ユーザーが存在する場合
    if (result.user) {
      await saveUserToFirestore(result.user);
      
      // GitHubプロバイダーからの認証の場合
      if (result.credential && result.additionalUserInfo?.providerId === 'github.com') {
        const credential = result.credential as any;
        const token = credential.accessToken;
        
        if (token) {
          localStorage.setItem('github_token', token);
          console.log('GitHub token saved from redirect result');
        }
      }
      
      return { success: true, user: result.user };
    }
    
    return { success: false, error: 'No authentication result' };
  } catch (error) {
    console.error('リダイレクト認証結果処理エラー:', error);
    return { success: false, error };
  }
}; 