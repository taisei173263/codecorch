import firebase from 'firebase/app';
import { auth } from '../firebase/firebase';

// GitHub認証
export const signInWithGithub = async () => {
  const provider = new firebase.auth.GithubAuthProvider();
  provider.addScope('repo');
  try {
    const result = await auth.signInWithPopup(provider);
    // GitHubのアクセストークンを取得 (APIリクエスト用)
    const credential = result.credential as firebase.auth.OAuthCredential;
    const token = credential.accessToken;
    
    // ユーザー情報と一緒にトークンを返す
    return { 
      user: result.user,
      token
    };
  } catch (error) {
    console.error('GitHub authentication error:', error);
    throw error;
  }
};

// Google認証
export const signInWithGoogle = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    return result.user;
  } catch (error) {
    console.error('Google authentication error:', error);
    throw error;
  }
};

// メールとパスワードでログイン
export const signInWithEmailAndPassword = async (email: string, password: string) => {
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    return result.user;
  } catch (error) {
    console.error('Email/password authentication error:', error);
    throw error;
  }
};

// メールとパスワードで新規登録
export const createUserWithEmailAndPassword = async (email: string, password: string, name: string) => {
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    
    // ユーザー名を更新
    if (result.user) {
      await result.user.updateProfile({
        displayName: name
      });
    }
    
    return result.user;
  } catch (error) {
    console.error('User creation error:', error);
    throw error;
  }
};

// 認証状態の監視
export const onAuthStateChanged = (callback: (user: firebase.User | null) => void) => {
  return auth.onAuthStateChanged(callback);
};

// ログアウト
export const signOut = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// 現在のユーザーを取得
export const getUser = (): Promise<firebase.User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      resolve(user);
      unsubscribe();
    });
  });
}; 