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
} from '../firebase/firebase';

type AuthMode = 'login' | 'register';

interface AuthScreenProps {
  onLogin: (method: string, email?: string, password?: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGitHubSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      onLogin('github');
    } catch (error) {
      setError('GitHub認証に失敗しました。もう一度お試しください。');
      console.error('GitHub login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      onLogin('google');
    } catch (error) {
      setError('Google認証に失敗しました。もう一度お試しください。');
      console.error('Google login error:', error);
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
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (mode === 'login') {
        const result = await loginWithEmail(email, password);
        if (!result.success) {
          setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
        }
      } else {
        const result = await registerWithEmail(email, password);
        if (!result.success) {
          setError('登録に失敗しました。別のメールアドレスを試すか、強いパスワードを設定してください。');
        }
      }
      
      onLogin('email', email, password);
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
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleGitHubSignIn}
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Github className="h-5 w-5" />
                GitHub
              </button>
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Mail className="h-5 w-5" />
                Google
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