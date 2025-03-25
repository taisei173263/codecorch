/**
 * GitHub API サービス
 * GitHub APIを使用してリポジトリやコード情報を取得する機能を提供します
 */

// GitHub APIのベースURL
const GITHUB_API_BASE_URL = 'https://api.github.com';

/**
 * リポジトリ情報の型定義
 */
export interface Repository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  stargazers_count: number;
  forks_count: number;
  size: number;
  owner: {
    login: string;
    avatar_url: string;
  };
}

/**
 * コードファイル情報の型定義
 */
export interface CodeFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  content: string;
  encoding: string;
  type: string;
}

// GitHubのアクセストークンを取得
const getGithubToken = (): string | null => {
  // ローカルストレージからGitHubトークンを取得
  const token = localStorage.getItem('github_token');
  
  // デバッグ用にトークンの有無をログ出力（実際のトークンは出力しない）
  console.log('GitHub token available:', !!token);
  
  return token;
};

// GitHub APIを呼び出す共通関数
const fetchFromGithub = async (endpoint: string, options?: RequestInit) => {
  const token = getGithubToken();
  
  if (!token) {
    console.error('GitHub access token is missing. Please login with GitHub again.');
    throw new Error('GitHub access token not found. Please login with GitHub again.');
  }

  const url = `${GITHUB_API_BASE_URL}${endpoint}`;
  const defaultOptions: RequestInit = {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (response.status === 401) {
      // 認証エラー - トークンが無効または期限切れ
      console.error('GitHub token is invalid or expired. Clearing from storage.');
      localStorage.removeItem('github_token');
      throw new Error('GitHub authentication expired. Please login again.');
    }
    
    if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
      // レート制限に達した
      const resetTime = response.headers.get('X-RateLimit-Reset');
      const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000).toLocaleTimeString() : 'unknown time';
      throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate}`);
    }
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`GitHub API error: ${response.status}`, error);
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('GitHub API request failed:', error);
    throw error;
  }
};

/**
 * 認証済みユーザーの情報を取得
 */
export const getUserInfo = async () => {
  return await fetchFromGithub('/user');
};

// ユーザーのリポジトリを取得
export const getUserRepositories = async (): Promise<Repository[]> => {
  try {
    // ページネーション対応、一度に100件取得
    const repositories = await fetchFromGithub('/user/repos?per_page=100&sort=updated');
    return repositories;
  } catch (error) {
    console.error('Failed to fetch repositories:', error);
    throw error;
  }
};

// 特定のリポジトリの詳細情報を取得
export const getRepository = async (owner: string, repo: string): Promise<Repository> => {
  try {
    const repository = await fetchFromGithub(`/repos/${owner}/${repo}`);
    return repository;
  } catch (error) {
    console.error(`Failed to fetch repository ${owner}/${repo}:`, error);
    throw error;
  }
};

// リポジトリのコンテンツを取得
export const getRepositoryContents = async (
  owner: string,
  repo: string,
  path = ''
): Promise<any[]> => {
  try {
    const contents = await fetchFromGithub(`/repos/${owner}/${repo}/contents/${path}`);
    return contents;
  } catch (error) {
    console.error(`Failed to fetch repository contents ${owner}/${repo}/${path}:`, error);
    throw error;
  }
};

// ファイルの内容を取得
export const getFileContent = async (
  owner: string,
  repo: string,
  path: string
): Promise<string> => {
  try {
    const content = await fetchFromGithub(`/repos/${owner}/${repo}/contents/${path}`);
    // Base64エンコードされたコンテンツをデコード
    if (content.encoding === 'base64' && content.content) {
      return atob(content.content.replace(/\n/g, ''));
    }
    throw new Error('Unexpected content format');
  } catch (error) {
    console.error(`Failed to fetch file content ${owner}/${repo}/${path}:`, error);
    throw error;
  }
};

/**
 * リポジトリの言語統計を取得
 */
export const getRepositoryLanguages = async (owner: string, repo: string) => {
  return await fetchFromGithub(`/repos/${owner}/${repo}/languages`);
};

/**
 * ユーザーのリポジトリコミット履歴を取得
 */
export const getRepositoryCommits = async (owner: string, repo: string) => {
  return await fetchFromGithub(`/repos/${owner}/${repo}/commits?per_page=100`);
};

/**
 * Base64でエンコードされたコンテンツをデコード
 */
export const decodeBase64Content = (content: string): string => {
  return atob(content.replace(/\s/g, ''));
};

/**
 * リポジトリの特定の言語のファイル一覧を取得
 */
export const getRepositoryFilesByLanguage = async (
  owner: string, 
  repo: string, 
  language: string
): Promise<any[]> => {
  // まずリポジトリ内のファイル一覧を再帰的に取得
  const allFiles = await fetchAllRepositoryFiles(owner, repo);
  
  // 特定の言語の拡張子でフィルタリング
  const languageExtensions: {[key: string]: string[]} = {
    'javascript': ['.js', '.jsx'],
    'typescript': ['.ts', '.tsx'],
    'python': ['.py'],
    'go': ['.go']
  };
  
  const extensions = languageExtensions[language.toLowerCase()] || [];
  
  if (extensions.length === 0) {
    return [];
  }
  
  return allFiles.filter(file => 
    extensions.some(ext => file.name.toLowerCase().endsWith(ext))
  );
};

/**
 * リポジトリ内のすべてのファイルを再帰的に取得（大きなリポジトリでは時間がかかる場合があります）
 */
export const fetchAllRepositoryFiles = async (
  owner: string, 
  repo: string, 
  path: string = ''
): Promise<any[]> => {
  const contents = await getRepositoryContents(owner, repo, path);
  let files: any[] = [];
  
  for (const item of contents) {
    if (item.type === 'file') {
      files.push(item);
    } else if (item.type === 'dir') {
      const dirFiles = await fetchAllRepositoryFiles(owner, repo, item.path);
      files = [...files, ...dirFiles];
    }
  }
  
  return files;
};

export default {
  getUserInfo,
  getUserRepositories,
  getRepository,
  getRepositoryContents,
  getFileContent,
  getRepositoryLanguages,
  getRepositoryCommits,
  decodeBase64Content,
  getRepositoryFilesByLanguage
}; 