import React, { useState, useEffect } from 'react';
import {
  Github, LogOut, Menu, X, Moon, Sun, 
  Code, BarChart3, BookOpen, FileCode, 
  AlertCircle, CheckCircle2, ChevronDown,
  User as UserIcon, HelpCircle
} from 'lucide-react';
import RepositoryList from './RepositoryList';
import CodeAnalysisView from './CodeAnalysisView';
import SkillsAndLearningView from './SkillsAndLearningView';
import HowToUseGuide from './HowToUseGuide';
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
  twoFactorEnabled?: boolean;
}

// DashboardProps インターフェースにダークモード関連のプロパティを追加
export interface DashboardProps {
  user: User;
  onLogout: () => Promise<void>;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onEnableTwoFactor: () => void;
}

/**
 * ダッシュボード画面コンポーネント
 * ユーザーの GitHub リポジトリ一覧、分析結果、推奨スキルを表示
 */
export const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  onLogout,
  isDarkMode,
  toggleDarkMode,
  onEnableTwoFactor
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
  const [showHowToUseGuide, setShowHowToUseGuide] = useState(false);

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

  // 使い方ガイドの表示/非表示を切り替え
  const toggleHowToUseGuide = () => {
    setShowHowToUseGuide(!showHowToUseGuide);
  };

  // ダッシュボードのヘッダーを追加
  const Header = () => {
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
              onClick={toggleHowToUseGuide}
              aria-label="使い方ガイドを表示"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
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
                    onClick={onEnableTwoFactor}
                  >
                    2段階認証の設定
                  </button>
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
              <li>
                <button
                  onClick={toggleHowToUseGuide}
                  className={`flex items-center w-full px-4 py-2 text-sm rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700`}
                >
                  <HelpCircle className="h-5 w-5 mr-3" />
                  使い方
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
        <Header />

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 sm:p-6">
          {activeTab === 'repositories' && (
            <RepositoryList 
              onSelectRepository={handleRepositorySelect}
              selectedRepository={selectedRepository || undefined}
            />
          )}

          {activeTab === 'analysis' && selectedRepository && (
            <div className="space-y-4">
              {analyzing ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">コードを分析中です。しばらくお待ちください...</p>
                </div>
              ) : analysisError ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
                  <div className="flex items-center justify-center text-red-500 mb-4">
                    <AlertCircle className="h-12 w-12" />
                  </div>
                  <h3 className="text-xl font-semibold text-center text-red-600 dark:text-red-400 mb-2">分析エラー</h3>
                  <p className="text-center text-gray-600 dark:text-gray-400">{analysisError}</p>
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => selectedRepository && analyzeCode(selectedRepository)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
                    >
                      再試行
                    </button>
                  </div>
                </div>
              ) : analysisResults ? (
                analysisResults.files.map((fileResult, index) => (
                  <CodeAnalysisView 
                    key={index} 
                    analysisResult={fileResult}
                    fileName={fileResult.fileName}
                  />
                ))
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                  <div className="flex items-center justify-center text-yellow-500 mb-4">
                    <AlertCircle className="h-12 w-12" />
                  </div>
                  <h3 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-2">分析データがありません</h3>
                  <p className="text-center text-gray-600 dark:text-gray-400">
                    「リポジトリ一覧」から分析するリポジトリを選択してください。
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'skills' && analysisResults && (
            <SkillsAndLearningView 
              recommendedSkills={recommendedSkills}
              repoName={selectedRepository?.name || ''}
              analysisResult={analysisResults}
            />
          )}
        </main>
      </div>
      
      {/* 使い方ガイドモーダル */}
      {showHowToUseGuide && (
        <HowToUseGuide onClose={toggleHowToUseGuide} />
      )}
    </div>
  );
};

export default Dashboard; 