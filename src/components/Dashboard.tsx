import React, { useState, useEffect } from 'react';
import {
  Github, LogOut, Menu, X, Moon, Sun, 
  Code, BarChart3, BookOpen, FileCode, 
  AlertCircle, CheckCircle2, ChevronDown,
  User as UserIcon
} from 'lucide-react';
import RepositoryList from './RepositoryList';
import CodeAnalysisView from './CodeAnalysisView';
import { Skill } from '../services/learningPathService';
import { getUserRepositories, Repository } from '../services/githubService';
import { analyzeRepository, RepositoryAnalysisResult, FileAnalysisResult, CodeIssue } from '../services/codeAnalysisService';
import { generateLearningPath } from '../services/learningPathService';

// ユーザー型定義
export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

// DashboardProps インターフェースにダークモード関連のプロパティを追加
export interface DashboardProps {
  user: User;
  onLogout: () => Promise<void>;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

/**
 * ダッシュボード画面コンポーネント
 * ユーザーの GitHub リポジトリ一覧、分析結果、推奨スキルを表示
 */
export const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  onLogout,
  isDarkMode,
  toggleDarkMode
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('repositories');
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [analysisResults, setAnalysisResults] = useState<RepositoryAnalysisResult | null>(null);
  const [recommendedSkills, setRecommendedSkills] = useState<Skill[]>([]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // ダークモードの設定
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // リポジトリ選択時の処理
  const handleRepositorySelect = (repo: Repository) => {
    setSelectedRepository(repo);
    setActiveTab('analysis');
    analyzeCode(repo);
  };

  // サイドバーの切り替え
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // リポジトリの読み込み
  useEffect(() => {
    const loadRepositories = async () => {
      setLoading(true);
      try {
        const repos = await getUserRepositories();
        setRepositories(repos);
      } catch (error) {
        console.error('リポジトリの読み込みに失敗しました:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRepositories();
  }, [user]);

  // コード分析の実行
  const analyzeCode = async (repo: Repository) => {
    setAnalyzing(true);
    setAnalysisError(null);
    
    try {
      // Githubリポジトリの分析を実行
      const results = await analyzeRepository(repo.full_name);
      
      // 分析結果を設定
      setAnalysisResults(results);
      
      // 学習推奨パスの生成
      const skills = await generateLearningPath(results, user.uid);
      setRecommendedSkills(skills);
      
    } catch (error) {
      console.error('コード分析エラー:', error);
      setAnalysisError("コード分析中にエラーが発生しました。後でもう一度お試しください。");
    } finally {
      setAnalyzing(false);
    }
  };

  // ダッシュボードのヘッダーを追加
  const renderHeader = () => {
    return (
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="flex justify-between items-center px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button
              type="button"
              className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none"
              onClick={toggleSidebar}
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="ml-4 text-xl font-bold text-gray-900 dark:text-white">CodeCoach</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none"
              onClick={toggleDarkMode}
              aria-label={isDarkMode ? "ライトモードに切り替え" : "ダークモードに切り替え"}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <div className="relative">
              <button
                type="button"
                className="flex items-center space-x-2 focus:outline-none"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "ユーザー"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-300 font-semibold">
                        {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                </div>
                <span className="hidden md:inline text-sm font-medium text-gray-700 dark:text-gray-300">{user.displayName || user.email}</span>
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={onLogout}
                  >
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* サイドバー */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:relative lg:inset-0 lg:translate-x-0 transition-transform duration-300 ease-in-out bg-white dark:bg-gray-800 shadow-md w-64`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Github className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className="text-lg font-semibold text-gray-800 dark:text-white">CodeCoach</span>
            </div>
            <button
              onClick={toggleSidebar}
              className="text-gray-500 dark:text-gray-400 focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setActiveTab('repositories')}
                  className={`flex items-center w-full px-4 py-2 text-sm rounded-md ${
                    activeTab === 'repositories'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Code className="h-5 w-5 mr-3" />
                  リポジトリ一覧
                </button>
              </li>
              <li>
                <button
                  onClick={() => selectedRepository && setActiveTab('analysis')}
                  disabled={!selectedRepository}
                  className={`flex items-center w-full px-4 py-2 text-sm rounded-md ${
                    !selectedRepository
                      ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : activeTab === 'analysis'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <BarChart3 className="h-5 w-5 mr-3" />
                  コード分析
                </button>
              </li>
              <li>
                <button
                  onClick={() => selectedRepository && setActiveTab('skills')}
                  disabled={!selectedRepository || !analysisResults}
                  className={`flex items-center w-full px-4 py-2 text-sm rounded-md ${
                    !selectedRepository || !analysisResults
                      ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : activeTab === 'skills'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <BookOpen className="h-5 w-5 mr-3" />
                  推奨スキル
                </button>
              </li>
            </ul>
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-5 w-5 mr-3" />
              ログアウト
            </button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 flex flex-col overflow-y-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex-1">
            {/* ヘッダー */}
            {renderHeader()}

            {/* リポジトリ一覧 */}
            {activeTab === 'repositories' && (
              <div className="mt-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">GitHubリポジトリ</h2>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : repositories.length > 0 ? (
                  <div className="space-y-4">
                    {repositories.map(repo => (
                      <div
                        key={repo.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                        onClick={() => handleRepositorySelect(repo)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-medium text-blue-600 dark:text-blue-400">
                              {repo.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {repo.description || 'No description available'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center">
                              <svg className="h-4 w-4 mr-1 fill-current" viewBox="0 0 16 16">
                                <path fillRule="evenodd" d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
                              </svg>
                              {repo.stargazers_count}
                            </span>
                            <span className="flex items-center">
                              <svg className="h-4 w-4 mr-1 fill-current" viewBox="0 0 16 16">
                                <path fillRule="evenodd" d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                              </svg>
                              {repo.forks_count}
                            </span>
                            <span className="px-2 py-1 text-xs rounded-full" style={{ 
                              backgroundColor: repo.language === 'JavaScript' ? '#f1e05a30' : 
                                              repo.language === 'TypeScript' ? '#3178c630' :
                                              repo.language === 'Python' ? '#3572A530' : 
                                              repo.language === 'Java' ? '#b0731630' : 
                                              '#e8e8e880' 
                            }}>
                              {repo.language || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="flex justify-center">
                      <Github className="h-16 w-16 text-gray-400 dark:text-gray-600" />
                    </div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">リポジトリが見つかりません。GitHubアカウントを接続してください。</p>
                  </div>
                )}
              </div>
            )}

            {/* コード分析 */}
            {activeTab === 'analysis' && selectedRepository && (
              <div className="mt-6">
                {analyzing ? (
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                    <p className="mt-6 text-gray-600 dark:text-gray-400">
                      {selectedRepository.name} のコードを分析中です。しばらくお待ちください...
                    </p>
                  </div>
                ) : analysisError ? (
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
                    <div className="flex justify-center">
                      <AlertCircle className="h-16 w-16 text-red-500" />
                    </div>
                    <p className="mt-6 text-red-600 dark:text-red-400">{analysisError}</p>
                    <button
                      onClick={() => selectedRepository && analyzeCode(selectedRepository)}
                      className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      再試行
                    </button>
                  </div>
                ) : analysisResults ? (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
                        {selectedRepository.name} の分析結果
                      </h2>
                      
                      {/* 分析結果の詳細 */}
                      <div className="mt-6">
                        {analysisResults.files.map((file) => (
                          <CodeAnalysisView 
                            key={file.fileName}
                            analysisResult={file} 
                            fileName={file.fileName} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
                    <div className="flex justify-center">
                      <FileCode className="h-16 w-16 text-gray-400 dark:text-gray-600" />
                    </div>
                    <p className="mt-6 text-gray-600 dark:text-gray-400">
                      分析を開始するには「分析開始」ボタンをクリックしてください。
                    </p>
                    <button
                      onClick={() => selectedRepository && analyzeCode(selectedRepository)}
                      className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      分析開始
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 推奨スキル */}
            {activeTab === 'skills' && analysisResults && (
              <div className="mt-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
                  あなたにおすすめのスキル
                </h2>
                
                {recommendedSkills.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recommendedSkills.map(skill => (
                      <div key={skill.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                            {skill.name}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            skill.level === 'beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            skill.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {skill.level === 'beginner' ? '初級' : 
                             skill.level === 'intermediate' ? '中級' : '上級'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          {skill.description}
                        </p>
                        {skill.resourceUrl && (
                          <a
                            href={skill.resourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            学習リソースを見る
                            <svg className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="flex justify-center">
                      <BookOpen className="h-12 w-12 text-gray-400 dark:text-gray-600" />
                    </div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">
                      スキル推奨を表示するには、まずコード分析を完了させてください。
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard; 