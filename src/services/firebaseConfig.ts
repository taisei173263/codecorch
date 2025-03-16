/**
 * Firebase接続設定
 * Firebaseとの接続を管理し、Firestoreやユーザー認証機能を提供します
 */
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

// Firebaseの構成オブジェクト
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDummy123456789",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "codecoach-dummy.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "codecoach-dummy",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "codecoach-dummy.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:123456789012:web:abcdef1234567890"
};

// アプリケーションでFirebaseが初期化されていない場合は初期化
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} 

// Firestoreデータベースのインスタンスをエクスポート
export const db = firebase.firestore();

// Firebase認証オブジェクトをエクスポート
export const auth = firebase.auth();

// Githubプロバイダーを作成
export const githubProvider = new firebase.auth.GithubAuthProvider();
githubProvider.addScope('repo'); // リポジトリ読み取り権限を要求

// Googleプロバイダーを作成
export const googleProvider = new firebase.auth.GoogleAuthProvider();

/**
 * Firebase認証を用いてGithubでサインイン
 */
export const signInWithGithub = async (): Promise<firebase.auth.UserCredential> => {
  try {
    return await auth.signInWithPopup(githubProvider);
  } catch (error) {
    console.error('Githubサインインエラー:', error);
    throw error;
  }
};

/**
 * Firebase認証を用いてGoogleでサインイン
 */
export const signInWithGoogle = async (): Promise<firebase.auth.UserCredential> => {
  try {
    return await auth.signInWithPopup(googleProvider);
  } catch (error) {
    console.error('Googleサインインエラー:', error);
    throw error;
  }
};

/**
 * メール/パスワードでサインイン
 */
export const signInWithEmail = async (
  email: string, 
  password: string
): Promise<firebase.auth.UserCredential> => {
  try {
    return await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    console.error('メールサインインエラー:', error);
    throw error;
  }
};

/**
 * 新規ユーザー登録
 */
export const registerWithEmail = async (
  email: string, 
  password: string,
  name: string
): Promise<firebase.auth.UserCredential> => {
  try {
    // アカウント作成
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    
    // ユーザープロフィールの更新
    if (credential.user) {
      await credential.user.updateProfile({
        displayName: name
      });
    }
    
    return credential;
  } catch (error) {
    console.error('ユーザー登録エラー:', error);
    throw error;
  }
};

/**
 * サインアウト
 */
export const signOut = async (): Promise<void> => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error('サインアウトエラー:', error);
    throw error;
  }
};

/**
 * 現在のユーザー情報を取得
 */
export const getCurrentUser = (): firebase.User | null => {
  return auth.currentUser;
};

/**
 * 認証状態の変更を監視
 */
export const onAuthStateChanged = (
  callback: (user: firebase.User | null) => void
): firebase.Unsubscribe => {
  return auth.onAuthStateChanged(callback);
};

export default firebase; 