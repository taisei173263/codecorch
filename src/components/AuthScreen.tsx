import React, { useState } from 'react';
import { 
  Github, 
  Mail, 
  Eye,
  EyeOff,
  ChevronLeft,
  AlertCircle, 
  Loader2
} from 'lucide-react';
import { 
  signInWithGithub, 
  signInWithGoogle, 
  loginWithEmail, 
  registerWithEmail 
} from '../firebase/services';

type AuthMode = 'login' | 'register';

interface AuthScreenProps {
  onGithubLogin: () => Promise<{ success: boolean; error?: any; user?: any }>;
  onGoogleLogin: () => Promise<{ success: boolean; error?: any; user?: any }>;
  onEmailLogin: (email: string, password: string) => Promise<{ success: boolean; error?: any; user?: any }>;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ 
  onGithubLogin, 
  onGoogleLogin, 
  onEmailLogin,
  isDarkMode, 
  toggleDarkMode 
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGitHubSignIn = async () => {
    try {
      console.log('================================================================');
      console.log('GitHub認証ボタンがクリックされました - 認証処理を開始します');
      setLoading(true);
      setError(null);
      
      // ポップアップ認証を開始
      console.log('GitHub認証関数を呼び出します...');
      const result = await onGithubLogin();
      console.log('GitHub認証の結果が返されました:', result);
      
      // ポップアップ認証では結果が即座に返る
      if (!result.success) {
        console.error('GitHub認証失敗 - エラー情報:', result.error);
        
        // エラーメッセージを設定
        let errorMessage = '';
        if (typeof result.error === 'string') {
          errorMessage = result.error;
          console.log('エラーメッセージ (文字列):', errorMessage);
        } else if (result.error instanceof Error) {
          errorMessage = result.error.message;
          console.log('エラーメッセージ (Error):', errorMessage, 'スタック:', result.error.stack);
        } else if (result.error && typeof result.error === 'object') {
          console.log('エラーオブジェクト:', result.error);
          if ('code' in result.error) {
            const code = (result.error as any).code;
            errorMessage = `GitHub認証エラー [${code}]: ${(result.error as any).message || ''}`;
          } else {
            errorMessage = JSON.stringify(result.error);
          }
        } else {
          errorMessage = 'GitHub認証に失敗しました。もう一度お試しください。';
          console.log('不明なエラー形式:', result.error);
        }
        
        setError(errorMessage);
        console.error('最終的に表示するエラーメッセージ:', errorMessage);
      } else if (result.user) {
        // 成功して即座にユーザー情報が返ってきた場合
        console.log('GitHub認証成功! ユーザー情報:', {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName
        });
      } else {
        console.log('GitHub認証は成功したがユーザー情報がありません');
      }
    } catch (error) {
      console.error('GitHub認証中に例外が発生しました:', error);
      let errorMessage = 'GitHub認証に失敗しました。もう一度お試しください。';
      
      if (error instanceof Error) {
        errorMessage = `エラー: ${error.message}`;
        console.error('エラースタック:', error.stack);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      console.log('GitHub認証処理完了');
      console.log('================================================================');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Google認証を開始します...');
      
      // ポップアップウィンドウのCross-Origin問題を回避するためにリダイレクト認証に切り替え
      // または既存のポップアップ認証の方法を維持しつつエラーハンドリングを改善
      const result = await onGoogleLogin();
      console.log('Google認証結果:', result);
      
      if (!result.success) {
        const errorMessage = result.error instanceof Error 
          ? result.error.message 
          : (result.error && typeof result.error === 'object' && 'code' in result.error)
            ? `Google認証エラー: ${(result.error as any).code}`
            : 'Google認証に失敗しました。もう一度お試しください。';
        setError(errorMessage);
        return;
      }
    } catch (error) {
      console.error('Google login error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Google認証に失敗しました。もう一度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (!email || !password) {
        throw new Error('メールアドレスとパスワードは必須です。');
      }
      
      if (mode === 'register' && !name) {
        throw new Error('名前は必須です。');
      }
      
      if (mode === 'login') {
        const result = await onEmailLogin(email, password);
        if (!result.success) {
          setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
        }
      } else {
        // 登録処理は直接呼び出し
        const result = await registerWithEmail(email, password);
        if (!result.success) {
          setError('登録に失敗しました。別のメールアドレスを試すか、強いパスワードを設定してください。');
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('認証に失敗しました。もう一度お試しください。');
      }
      console.error('Email auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">CodeCoach</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            あなたのプログラミング学習をAIがサポート
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            {mode === 'login' ? 'アカウントにログイン' : '新規アカウント登録'}
          </h2>

          {error && (
            <div className="mb-4 p-3 flex items-center text-sm text-red-800 bg-red-100 rounded-md dark:bg-red-900/20 dark:text-red-300">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium">{error}</p>
                <p className="mt-1 text-xs">認証に問題がある場合は、別の方法でログインしてみてください。</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleGitHubSignIn}
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                aria-label="GitHubでログイン"
              >
                <Github className="h-5 w-5" />
                <span>GitHub</span>
              </button>
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                aria-label="Googleでログイン"
              >
                <Mail className="h-5 w-5" />
                <span>Google</span>
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">または</span>
              </div>
            </div>

            <form onSubmit={handleEmailAuth}>
              {mode === 'register' && (
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    名前
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    {mode === 'login' ? 'ログイン' : '登録'}
                  </>
                )}
              </button>
            </form>
          </div>
          
          <div className="mt-4 text-center">
            <button
              onClick={toggleMode}
              className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {mode === 'login' ? 'アカウント登録へ' : 'ログイン画面へ戻る'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen; 