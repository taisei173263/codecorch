import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import { firebaseConfig } from './config';

// Firebase初期化
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// GitHub認証プロバイダー
const githubProvider = new firebase.auth.GithubAuthProvider();
githubProvider.addScope('repo'); // リポジトリへのアクセス権を要求

// Google認証プロバイダー
const googleProvider = new firebase.auth.GoogleAuthProvider();

// GitHub OAuth認証
export const signInWithGithub = async () => {
  try {
    const result = await auth.signInWithPopup(githubProvider);
    // GitHubのアクセストークンを取得してローカルストレージに保存
    const credential = result.credential;
    const token = credential && 'accessToken' in credential ? credential.accessToken : null;
    
    if (token) {
      localStorage.setItem('github_token', token as string);
    }
    
    // ユーザー情報をFirestoreに保存
    if (result.user) {
      await saveUserToFirestore(result.user);
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
    const result = await auth.signInWithPopup(googleProvider);
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
    localStorage.removeItem('github_token');
    return { success: true };
  } catch (error) {
    console.error('ログアウトエラー:', error);
    return { success: false, error };
  }
};

// 認証状態の監視
export const subscribeToAuthChanges = (callback: (user: firebase.User | null) => void) => {
  return auth.onAuthStateChanged(callback);
};

// ユーザープロファイルをFirestoreに保存
export const saveUserToFirestore = async (user: firebase.User) => {
  if (!user.uid) return;

  const userRef = db.collection('users').doc(user.uid);
  const docSnap = await userRef.get();

  if (!docSnap.exists) {
    // 新規ユーザーの場合
    await userRef.set({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      experienceLevel: 'beginner', // デフォルト値
      learningGoals: [],
      learningLanguages: [],
      isAdmin: false
    });
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

export { firebase, auth, db }; 