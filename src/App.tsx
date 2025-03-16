import { useEffect, useState } from 'react';
import './App.css';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import firebase from 'firebase/app';
import { auth } from './firebase/firebase';

// ダークモードの状態定義
export interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

// アプリケーションのメインコンポーネント
function App() {
  // ユーザー認証状態
  const [user, setUser] = useState<firebase.User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ダークモード状態
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // ローカルストレージから設定を取得、または OS の設定を使用
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // ダークモード切り替え関数
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    
    // HTML要素にクラスを追加/削除
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // 初期化時にローカルストレージからユーザー情報を取得
  useEffect(() => {
    // ダークモードの初期設定
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Firebase認証状態の監視を設定
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);
      setLoading(false);
    });
    
    // コンポーネントのアンマウント時に監視を解除
    return () => unsubscribe();
  }, [isDarkMode]);

  // ログイン処理
  const handleLogin = async (result: any) => {
    try {
      // Firebase認証結果からユーザー情報を抽出
      let user = result.user || result;
      
      // ユーザー情報をローカルストレージに保存（オプション）
      localStorage.setItem('user', JSON.stringify({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL
      }));
      
      setUser(user);
    } catch (error) {
      console.error('ログイン処理エラー:', error);
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    try {
      localStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  // ローディング中の表示
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {user ? (
        <Dashboard 
          user={user}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      ) : (
        <AuthScreen onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App; 