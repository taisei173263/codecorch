import React, { useState, useEffect } from 'react';
import { Github, Code, Search, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { Repository } from '../services/githubService';
import { getUserRepositories } from '../services/githubService';

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

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const repos = await getUserRepositories();
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
          <button 
            onClick={fetchRepositories}
            className="mt-2 px-3 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-700 text-xs font-medium"
          >
            再試行
          </button>
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