import React, { useState, useEffect } from 'react';
import {
  Github, LogOut, Menu, X, Moon, Sun, 
  Code, BarChart3, BookOpen, FileCode, 
  AlertCircle, CheckCircle2, ChevronDown,
  User as UserIcon, HelpCircle, Folder as FolderIcon
} from 'lucide-react';
import RepositoryList from './RepositoryList';
import CodeAnalysisView from './CodeAnalysisView';
import SkillsAndLearningView from './SkillsAndLearningView';
import HowToUseGuide from './HowToUseGuide';
import CodeImprovementView from './CodeImprovementView';
import { Skill } from '../services/learningPathService';
import { getUserRepositories, Repository, getRepositoryContents, getFileContent } from '../services/githubService';
import codeAnalysisService, { RepositoryAnalysisResult, FileAnalysisResult, CodeIssue } from '../services/codeAnalysisService';
import { generateLearningPath } from '../services/learningPathService';
import { generateCodeImprovements, prepareImprovementUIData } from '../services/codeImprovementService';

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
  const [repositoryFiles, setRepositoryFiles] = useState<{name: string, path: string, type: string}[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [codeImprovements, setCodeImprovements] = useState<any[]>([]);

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
    setSelectedFilePath(null); // 選択をリセット
    setRepositoryFiles([]); // ファイル一覧をリセット
    setCurrentPath(''); // パスをリセット
    loadRepositoryFiles(repo.full_name, ''); // ルートディレクトリのファイル一覧を取得
    analyzeCode(repo);
  };

  // リポジトリのファイル一覧を取得
  const loadRepositoryFiles = async (fullRepoName: string, path: string) => {
    setLoadingFiles(true);
    try {
      const [owner, repo] = fullRepoName.split('/');
      const files = await getRepositoryContents(owner, repo, path);
      // 隠しディレクトリ（.から始まる）とnode_modulesディレクトリを除外
      const filteredFiles = files.filter(file => 
        !(file.type === 'dir' && (file.name.startsWith('.') || file.name.includes('node_modules')))
      );
      setRepositoryFiles(filteredFiles);
      setCurrentPath(path);
    } catch (error) {
      console.error('ファイル一覧の取得に失敗しました:', error);
    } finally {
      setLoadingFiles(false);
    }
  };

  // ディレクトリをクリックしたときの処理
  const handleDirectoryClick = (dirPath: string) => {
    if (selectedRepository) {
      loadRepositoryFiles(selectedRepository.full_name, dirPath);
    }
  };

  // 1階層上のディレクトリに移動
  const handleGoUp = () => {
    if (currentPath && selectedRepository) {
      const pathParts = currentPath.split('/');
      pathParts.pop(); // 最後の部分を削除
      const newPath = pathParts.join('/');
      loadRepositoryFiles(selectedRepository.full_name, newPath);
    }
  };

  // ファイルが分析対象かどうかをチェック
  const isAnalyzableFile = (fileName: string): boolean => {
    return codeAnalysisService.SUPPORTED_EXTENSIONS.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  // ファイルを選択して分析
  const handleFileSelect = async (filePath: string, fileName: string) => {
    if (!isAnalyzableFile(fileName)) {
      setAnalysisError(`${fileName} は分析対象のファイル形式ではありません。サポートされている拡張子: ${codeAnalysisService.SUPPORTED_EXTENSIONS.join(', ')}`);
      return;
    }
    
    setSelectedFilePath(filePath);
    if (selectedRepository) {
      analyzeCode(selectedRepository, filePath);
    }
  };

  // コード分析の実行
  const analyzeCode = async (repo: Repository, filePath?: string) => {
    setAnalyzing(true);
    setAnalysisError(null);
    
    try {
      // Githubリポジトリの分析を実行
      const results = await codeAnalysisService.analyzeRepository(repo.full_name, filePath);
      
      // 分析結果を設定
      setAnalysisResults(results);
      
      // 学習推奨パスの生成
      const skills = await generateLearningPath(results, user.uid);
      setRecommendedSkills(skills);
      
      // 分析結果を取得した後、改善提案を生成
      if (results && results.files && results.files.length > 0 && filePath) {
        try {
          // 先にreadFileContent関数を呼び出してから改善提案を生成
          const fileContent = await readFileContent(filePath);
          if (fileContent && results.files[0].issues) {
            const improvements = await generateCodeImprovements(
              fileContent,
              results.files[0].language,
              results.files[0].issues
            );
            setCodeImprovements(improvements);
          }
        } catch (error) {
          console.error('改善提案の生成中にエラーが発生しました:', error);
          setCodeImprovements([]);
        }
      } else {
        setCodeImprovements([]);
      }
      
    } catch (error) {
      console.error('コード分析エラー:', error);
      setAnalysisError("コード分析中にエラーが発生しました。後でもう一度お試しください。");
    } finally {
      setAnalyzing(false);
    }
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

  // 使い方ガイドの表示/非表示を切り替え
  const toggleHowToUseGuide = () => {
    setShowHowToUseGuide(!showHowToUseGuide);
  };

  // ファイルの内容を読み取る関数を追加
  const readFileContent = async (path?: string): Promise<string> => {
    if (!path || !selectedRepository) return '';
    
    try {
      const [owner, repo] = selectedRepository.full_name.split('/');
      return await getFileContent(owner, repo, path);
    } catch (error) {
      console.error('ファイル内容の読み取りに失敗しました:', error);
      return '';
    }
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
              {/* ファイル一覧表示 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  ファイル選択
                </h3>
                
                <div className="flex items-center mb-4">
                  <button 
                    onClick={handleGoUp}
                    disabled={!currentPath}
                    className={`p-2 rounded-md mr-2 ${!currentPath ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30'}`}
                  >
                    上の階層へ
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    現在のパス: {currentPath || '/'}
                  </span>
                </div>

                {loadingFiles ? (
                  <div className="py-4 text-center text-gray-600 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    ファイル一覧を読み込み中...
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">名前</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">タイプ</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">アクション</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {repositoryFiles.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                              ファイルが見つかりません
                            </td>
                          </tr>
                        ) : (
                          repositoryFiles.map((file, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-4 py-2 whitespace-nowrap">
                                <div className="flex items-center">
                                  {file.type === 'dir' ? (
                                    <FolderIcon className="h-5 w-5 text-yellow-500 mr-2" />
                                  ) : (
                                    <FileCode className="h-5 w-5 text-blue-500 mr-2" />
                                  )}
                                  <span className={`text-sm ${file.type === 'dir' ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {file.name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {file.type === 'dir' ? 'ディレクトリ' : 'ファイル'}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {file.type === 'dir' ? (
                                  <button
                                    onClick={() => handleDirectoryClick(file.path)}
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    開く
                                  </button>
                                ) : isAnalyzableFile(file.name) ? (
                                  <button
                                    onClick={() => handleFileSelect(file.path, file.name)}
                                    className={`text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 ${selectedFilePath === file.path ? 'font-bold' : ''}`}
                                  >
                                    {selectedFilePath === file.path ? '選択中' : '分析'}
                                  </button>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-600">分析不可</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

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
                      onClick={() => selectedRepository && analyzeCode(selectedRepository, selectedFilePath || undefined)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
                    >
                      再試行
                    </button>
                  </div>
                </div>
              ) : analysisResults ? (
                <div className="space-y-6">
                  {/* コード分析結果 */}
                  <div>
                    {analysisResults.files.map((fileResult, index) => (
                      <CodeAnalysisView 
                        key={index} 
                        analysisResult={fileResult}
                        fileName={fileResult.fileName}
                      />
                    ))}
                  </div>
                  
                  {/* コード改善提案 */}
                  {codeImprovements && codeImprovements.length > 0 && (
                    <div>
                      <CodeImprovementView
                        improvements={codeImprovements}
                        fileName={selectedFilePath ?? ''}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                  <div className="flex items-center justify-center text-yellow-500 mb-4">
                    <AlertCircle className="h-12 w-12" />
                  </div>
                  <h3 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-2">分析データがありません</h3>
                  <p className="text-center text-gray-600 dark:text-gray-400">
                    {selectedFilePath ? '分析を開始するには「再試行」をクリックしてください。' : '上のファイル一覧から分析するファイルを選択してください。'}
                  </p>
                  {selectedFilePath && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => selectedRepository && analyzeCode(selectedRepository, selectedFilePath)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
                      >
                        再試行
                      </button>
                    </div>
                  )}
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