import React, { useState, useEffect } from 'react';
import { Github, Code, Search, Loader2, ExternalLink, RefreshCw, Link } from 'lucide-react';
import { Repository } from '../services/githubService';
import { getUserRepositories } from '../services/githubService';
import { signInWithGithub } from '../firebase/services';

interface RepositoryListProps {
  onSelectRepository: (repository: Repository) => void;
  selectedRepository?: Repository;
}

const RepositoryList: React.FC<RepositoryListProps> = ({ 
  onSelectRepository,
  selectedRepository 
}) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [showAccountLinkExplanation, setShowAccountLinkExplanation] = useState(false);

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    setLoading(true);
    setError(null);
    
    // GitHubトークンの状態をデバッグ
    const githubToken = localStorage.getItem('github_token');
    console.log('GitHub token exists:', !!githubToken);
    if (githubToken) {
      console.log('Token prefix:', githubToken.substring(0, 5) + '...');
    }
    
    try {
      const repos = await getUserRepositories();
      console.log('Repositories fetched:', repos.length);
      setRepositories(repos);
    } catch (err) {
      console.error('Repository fetch error:', err);
      
      // エラーメッセージの種類によって適切なフィードバックを表示
      if (err instanceof Error) {
        if (err.message.includes('GitHub access token not found') || 
            err.message.includes('authentication expired')) {
          setError('GitHubの認証に問題があります。再度ログインしてください。');
        } else if (err.message.includes('rate limit exceeded')) {
          setError('GitHub APIのレート制限に達しました。しばらく待ってから再試行してください。');
        } else {
          setError('リポジトリの取得に失敗しました: ' + err.message);
        }
      } else {
        setError('リポジトリの取得に失敗しました。GitHubとの接続を確認してください。');
      }
    } finally {
      setLoading(false);
    }
  };

  // GitHubログイン処理を行う関数
  const handleGitHubLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('GitHub認証を開始します...');
      
      // 直接GitHubログインを実行（ポップアップがブロックされるのを防ぐため、タイムアウトを使わない）
      try {
        const result = await signInWithGithub();
        console.log('GitHub認証結果:', result);
        
        if (result.success && (result.user || result.linked)) {
          console.log('GitHub認証/リンク成功:', result.user || result.linked);
          
          // GitHubトークンが保存されているか確認
          const token = localStorage.getItem('github_token');
          console.log('GitHub token after login:', !!token);
          
          if (!token) {
            console.error('GitHubトークンが保存されていません');
            // トークンが保存されていない場合、エラーを表示
            setError('GitHubアクセストークンが取得できませんでした。もう一度ログインしてください。');
            setLoading(false);
            return;
          }
          
          setError(null);
          // リポジトリを取得
          fetchRepositories();
        } else if (result.success && result.message) {
          // リダイレクト認証が始まった場合
          console.log('リダイレクト認証開始:', result.message);
          setError('GitHubログインページにリダイレクトしています...');
          // このままリダイレクトを待つ
        } else {
          console.error('GitHub認証失敗:', result.error);
          
          // エラーの詳細情報を提供
          let errorMessage = 'GitHubログインに失敗しました。';
          let showAccountLinkExplanation = false;
          
          if (result.message) {
            // 専用のエラーメッセージがある場合
            errorMessage = result.message;
          } else if (result.error instanceof Error) {
            const errorText = result.error.message;
            console.error('エラー詳細:', result.error);
            
            // 同じメールアドレスで異なる認証方法が使われている場合の処理
            if (errorText.includes('An account already exists with the same email address')) {
              errorMessage = 'このメールアドレスは既に別の認証方法（Googleなど）でログインしています。現在のアカウントにGitHubを連携することで解決できます。';
              showAccountLinkExplanation = true;
            } else {
              errorMessage += ' エラー: ' + errorText;
            }
          } else if (typeof result.error === 'string') {
            errorMessage += ' ' + result.error;
          } else if (result.error && typeof result.error === 'object' && 'code' in result.error) {
            const code = (result.error as any).code;
            
            // エラーコードに応じたメッセージ
            if (code === 'auth/popup-blocked') {
              errorMessage = 'ポップアップがブロックされました。ブラウザの設定を確認し、このサイトのポップアップを許可してください。';
            } else if (code === 'auth/popup-closed-by-user') {
              errorMessage = 'ログイン画面が閉じられました。GitHubにログインするには認証を完了させてください。';
            } else if (code === 'auth/network-request-failed') {
              errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
            } else if (code === 'auth/account-exists-with-different-credential') {
              errorMessage = 'このメールアドレスは既に別の認証方法（Googleなど）でログインしています。現在のアカウントにGitHubを連携することで解決できます。';
              showAccountLinkExplanation = true;
            } else {
              errorMessage += ' エラーコード: ' + code;
            }
          }
          
          setError(errorMessage);
          
          // アカウント連携の説明が必要な場合、追加の情報をステートに保存
          if (showAccountLinkExplanation) {
            setShowAccountLinkExplanation(true);
          }
        }
      } catch (error) {
        console.error('GitHub認証中に例外が発生しました:', error);
        setError('GitHubログイン処理中に予期せぬエラーが発生しました。もう一度お試しください。');
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error('GitHub login error:', error);
      setError('GitHubログイン処理の準備中にエラーが発生しました。');
      setLoading(false);
    }
  };

  // エラーメッセージに応じた処理を行う関数
  const handleRetry = () => {
    if (error && (
      error.includes('GitHubの認証に問題があります') || 
      error.includes('GitHub access token not found') || 
      error.includes('authentication expired')
    )) {
      // GitHub認証エラーの場合はログイン処理を実行
      handleGitHubLogin();
    } else {
      // その他のエラーの場合は単にリポジトリを再取得
      fetchRepositories();
    }
  };

  const filteredRepositories = repositories.filter(repo => {
    // 名前でフィルタリング
    const nameMatch = repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // 言語フィルタリング
    const languageMatch = filter === 'all' || 
                         (repo.language && repo.language.toLowerCase() === filter.toLowerCase());
    
    return nameMatch && languageMatch;
  });

  // 利用可能な言語のリストを取得
  const languages = [...new Set(repositories
    .map(repo => repo.language)
    .filter(lang => lang !== null && lang !== undefined) as string[]
  )];

  const handleRefresh = () => {
    fetchRepositories();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
          <Github className="w-5 h-5 mr-2" />
          GitHubリポジトリ
        </h2>
        <button 
          onClick={handleRefresh}
          className="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
          title="リフレッシュ"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* 検索とフィルタリング */}
      <div className="mb-4 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="リポジトリを検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select
          className="block w-full md:w-auto py-2 px-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">全ての言語</option>
          {languages.map(language => (
            <option key={language} value={language}>{language}</option>
          ))}
        </select>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-md mb-4 text-sm">
          <p>{error}</p>
          
          {/* アカウント連携の説明が必要な場合 */}
          {showAccountLinkExplanation && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
              <h4 className="text-blue-700 dark:text-blue-300 font-medium flex items-center">
                <Link className="w-4 h-4 mr-1" />
                アカウント連携について
              </h4>
              <p className="text-blue-600 dark:text-blue-300 text-xs mt-1">
                既にGoogleアカウントなどでログインしている場合、同じメールアドレスのGitHubアカウントを連携できます。
                連携することで、どちらの方法でもログインでき、すべての機能が使えるようになります。
              </p>
              <button 
                onClick={handleGitHubLogin}
                className="mt-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-xs font-medium flex items-center"
              >
                <Github className="w-3.5 h-3.5 mr-1.5" />
                GitHubアカウントを連携する
              </button>
            </div>
          )}
          
          {/* エラーがGitHub認証関連の場合は専用ボタンを表示 */}
          {error.includes('GitHubの認証に問題があります') || 
           error.includes('GitHub') || 
           error.includes('ログイン') ? (
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button 
                onClick={handleGitHubLogin}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md flex items-center justify-center text-xs font-medium transition-colors"
              >
                <Github className="w-4 h-4 mr-2" />
                GitHubでログインする
              </button>
              <button 
                onClick={fetchRepositories}
                className="px-3 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-700 text-xs font-medium"
              >
                リポジトリを再試行
              </button>
            </div>
          ) : (
            <button 
              onClick={handleRetry}
              className="mt-2 px-3 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-700 text-xs font-medium"
            >
              再試行
            </button>
          )}
        </div>
      )}

      {/* リポジトリリスト */}
      {loading ? (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">リポジトリを読み込み中...</span>
        </div>
      ) : filteredRepositories.length > 0 ? (
        <div className="overflow-y-auto max-h-96 rounded-md border border-gray-200 dark:border-gray-700">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredRepositories.map(repo => (
              <li 
                key={repo.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                  selectedRepository?.id === repo.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                onClick={() => onSelectRepository(repo)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {repo.name}
                      </h3>
                      {repo.language && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                          {repo.language}
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {repo.description}
                      </p>
                    )}
                    <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <span>更新日: {new Date(repo.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <a 
                    href={repo.html_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Code className="mx-auto h-12 w-12 mb-2" />
          <p>リポジトリが見つかりません</p>
          {searchTerm && (
            <p className="text-sm mt-1">
              検索条件を変更するか、フィルターをリセットしてみてください
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default RepositoryList; 