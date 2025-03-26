import { useEffect, useState } from 'react';
import './App.css';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import TwoFactorAuth from './components/TwoFactorAuth';
import firebase from 'firebase/app';
import { 
  auth, 
  signInWithGithub, 
  signInWithGoogle, 
  loginWithEmail,
  subscribeToAuthChanges,
  handleRedirectResult
} from './firebase/services';

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
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  
  // ダークモード状態
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // ローカルストレージから設定を取得、または OS の設定を使用
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // リダイレクト認証結果の処理
  useEffect(() => {
    const processRedirectResult = async () => {
      try {
        // リダイレクト認証からの結果を確認
        console.log('App.tsx: リダイレクト認証結果の処理を開始');
        const result = await handleRedirectResult();
        console.log('App.tsx: リダイレクト認証結果:', result);
        
        // エラーメッセージの処理を改善
        if (!result.success) {
          // 認証エラーかどうかを判断
          const isAuthError = result.error && 
            typeof result.error === 'string' &&
            result.error !== 'No authentication result' && 
            result.error !== 'No pending redirect' &&
            result.error !== 'No user in authentication result';
          
          // 実際の認証エラーのみユーザーに表示
          if (isAuthError) {
            let errorMessage = typeof result.error === 'string' 
              ? result.error 
              : '認証に失敗しました。もう一度お試しください。';
            
            setError(errorMessage);
          } else {
            // 認証エラーでない場合はエラーメッセージをクリア
            setError(null);
          }
        }
      } catch (error) {
        console.error('App.tsx: リダイレクト結果の処理中にエラー:', error);
      }
    };
    
    processRedirectResult();
  }, []);

  // 認証状態の監視
  useEffect(() => {
    try {
      const unsubscribe = subscribeToAuthChanges((user) => {
        setUser(user);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('認証状態の監視エラー:', error);
      setError('認証の初期化に失敗しました。ページを更新してください。');
      setLoading(false);
    }
  }, []);

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

  // 初期化時にダークモード設定を適用
  useEffect(() => {
    // ダークモードの初期設定
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // OS のカラースキーム変更を監視
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // ユーザーが明示的に設定していない場合のみ OS の設定に従う
      if (localStorage.getItem('darkMode') === null) {
        setIsDarkMode(e.matches);
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    
    // イベントリスナーを追加
    mediaQuery.addEventListener('change', handleChange);
    
    // クリーンアップ関数
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // ログアウト処理
  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('ログアウトエラー:', error);
      setError('ログアウトに失敗しました。');
    }
  };

  // 2FA設定の表示
  const handleEnableTwoFactor = () => {
    setShowTwoFactorSetup(true);
  };

  // 2FA設定の完了
  const handleTwoFactorComplete = () => {
    setShowTwoFactorSetup(false);
  };

  // ローディング中の表示
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-md w-full">
          <div className="text-red-500 dark:text-red-400 mb-4">{error}</div>
          <button 
            onClick={() => setError(null)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            ログイン画面に戻る
          </button>
        </div>
      </div>
    );
  }

  if (showTwoFactorSetup && user) {
    return (
      <TwoFactorAuth
        user={user}
        onComplete={handleTwoFactorComplete}
        onCancel={() => setShowTwoFactorSetup(false)}
      />
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {showBanner && (
        <div className="bg-blue-600 text-white p-3 text-center">
          <p>サイトの全機能を利用するには、何らかのインタラクションが必要です</p>
          <button 
            onClick={() => setShowBanner(false)}
            className="mt-2 bg-white text-blue-600 px-4 py-1 rounded hover:bg-gray-100"
          >
            了解
          </button>
        </div>
      )}
      
      {user ? (
        <Dashboard 
          user={user}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          onEnableTwoFactor={handleEnableTwoFactor}
        />
      ) : (
        <AuthScreen
          onGithubLogin={signInWithGithub}
          onGoogleLogin={signInWithGoogle}
          onEmailLogin={loginWithEmail}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      )}
    </div>
  );
}

export default App; 