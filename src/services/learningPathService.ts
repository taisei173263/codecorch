/**
 * 学習パスサービス
 * ユーザーの分析結果に基づいて学習パスを推奨する機能を提供します
 */
import firebase from 'firebase/app';
import 'firebase/firestore';
import { CodeAnalysisResult, RepositoryAnalysisResult, FileAnalysisResult } from './codeAnalysisService';
import { db } from '../firebase/services';

/**
 * スキルレベルの定義
 */
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * 言語カテゴリの定義
 */
export enum LanguageCategory {
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  PYTHON = 'python',
  GO = 'go'
}

/**
 * スキルの型定義
 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  level: SkillLevel;
  category: string;
  resourceUrl?: string;
}

/**
 * 学習リソースの型定義
 */
export interface LearningResource {
  id: string;
  title: string;
  description: string;
  url: string;
  type: 'tutorial' | 'documentation' | 'book' | 'video' | 'article';
  skillId: string;
  level: SkillLevel;
  estimatedTime?: number;
}

/**
 * ユーザースキル情報の型定義
 */
export interface UserSkill {
  userId: string;
  skillId: string;
  level: number; // 0-100
  lastUpdated: firebase.firestore.Timestamp;
}

/**
 * 学習進捗の型定義
 */
export interface LearningProgress {
  userId: string;
  resourceId: string;
  completed: boolean;
  completedAt?: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}

/**
 * スキル推奨のレスポンス
 */
export interface SkillRecommendationResponse {
  skills: Skill[];
  resources: LearningResource[];
}

/**
 * ユーザースキル記録
 */
export interface UserSkillRecord {
  userId: string;
  skills: {
    skillId: string;
    level: number;
    lastUpdated: firebase.firestore.Timestamp;
  }[];
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}

/**
 * 学習リソースデータ（静的定義）
 */
const learningResources: LearningResource[] = [
  // JavaScriptリソース
  {
    id: 'js-basics-1',
    title: 'モダンJavaScriptの基礎',
    description: 'ES6以降の機能を活用した最新のJavaScript開発手法を学びます。',
    url: 'https://javascript.info/',
    type: 'tutorial',
    skillId: 'javascript-basics',
    level: 'beginner'
  },
  {
    id: 'js-advanced-1',
    title: 'JavaScriptデザインパターン',
    description: 'JavaScriptにおける一般的なデザインパターンとその実装方法を学びます。',
    url: 'https://addyosmani.com/resources/essentialjsdesignpatterns/book/',
    type: 'book',
    skillId: 'javascript-advanced',
    level: 'intermediate'
  },
  {
    id: 'js-performance-1',
    title: 'JavaScriptパフォーマンス最適化',
    description: 'JavaScriptアプリケーションのパフォーマンスを向上させるテクニックを学びます。',
    url: 'https://developer.mozilla.org/ja/docs/Web/Performance',
    type: 'documentation',
    skillId: 'javascript-performance',
    level: 'advanced'
  },
  
  // TypeScriptリソース
  {
    id: 'ts-basics-1',
    title: 'TypeScript入門ガイド',
    description: 'TypeScriptの基本概念と型システムについて学びます。',
    url: 'https://www.typescriptlang.org/docs/',
    type: 'documentation',
    skillId: 'typescript-basics',
    level: 'beginner'
  },
  {
    id: 'ts-advanced-1',
    title: '効果的なTypeScript',
    description: 'TypeScriptの高度な型機能と設計パターンを学びます。',
    url: 'https://effectivetypescript.com/',
    type: 'book',
    skillId: 'typescript-advanced',
    level: 'intermediate'
  },
  
  // Pythonリソース
  {
    id: 'py-basics-1',
    title: 'Python基礎講座',
    description: 'Pythonプログラミングの基礎を学びます。',
    url: 'https://docs.python.org/ja/3/tutorial/',
    type: 'tutorial',
    skillId: 'python-basics',
    level: 'beginner'
  },
  {
    id: 'py-advanced-1',
    title: 'Pythonによるデータ分析入門',
    description: 'NumPy、Pandas、Matplotlibを使ったデータ分析の基礎を学びます。',
    url: 'https://www.oreilly.co.jp/books/9784873118413/',
    type: 'book',
    skillId: 'python-data-analysis',
    level: 'intermediate'
  }
];

/**
 * スキルマップデータ（静的定義）
 */
const skillMap: { [key: string]: Skill[] } = {
  javascript: [
    {
      id: 'javascript-basics',
      name: 'JavaScript基礎',
      description: 'モダンJavaScriptの基本構文、変数、関数、非同期処理などの基礎知識',
      level: 'beginner',
      category: 'javascript',
      resourceUrl: 'https://javascript.info/'
    },
    {
      id: 'javascript-advanced',
      name: 'JavaScript応用',
      description: 'クロージャ、プロトタイプ、デザインパターン、モジュール設計など',
      level: 'intermediate',
      category: 'javascript',
      resourceUrl: 'https://eloquentjavascript.net/'
    },
    {
      id: 'javascript-performance',
      name: 'JavaScriptパフォーマンス',
      description: 'メモリ管理、最適化テクニック、効率的なアルゴリズム設計',
      level: 'advanced',
      category: 'javascript'
    }
  ],
  typescript: [
    {
      id: 'typescript-basics',
      name: 'TypeScript基礎',
      description: '基本的な型定義、インターフェース、型推論などTypeScriptの基礎',
      level: 'beginner',
      category: 'typescript',
      resourceUrl: 'https://www.typescriptlang.org/docs/'
    },
    {
      id: 'typescript-advanced',
      name: 'TypeScript応用',
      description: '高度な型機能、ジェネリクス、型の交差と合併、型ガード',
      level: 'intermediate',
      category: 'typescript',
      resourceUrl: 'https://www.typescriptlang.org/docs/handbook/advanced-types.html'
    }
  ],
  python: [
    {
      id: 'python-basics',
      name: 'Python基礎',
      description: 'Python構文、データ型、関数、クラスなどの基礎知識',
      level: 'beginner',
      category: 'python',
      resourceUrl: 'https://docs.python.org/ja/3/tutorial/'
    },
    {
      id: 'python-data-analysis',
      name: 'Pythonデータ分析',
      description: 'NumPy、Pandas、Matplotlibを使ったデータ処理と可視化',
      level: 'intermediate',
      category: 'python',
      resourceUrl: 'https://pandas.pydata.org/docs/'
    }
  ]
};

/**
 * 全スキルデータを取得
 */
export const getAllSkills = (): Skill[] => {
  return Object.values(skillMap).flat();
};

/**
 * 分析結果に基づく特定のスキルの推奨
 * @returns {Skill[]} 推奨されたスキルの配列
 */
const getRecommendedSkillsForAnalysis = (issueTypeCounts: Record<string, number>): Skill[] => {
  const recommendedSkills: Skill[] = [];
  const allSkills = getAllSkills();
  
  // 特定の問題が多い場合に関連スキルを推奨
  if (issueTypeCounts['code_style'] && issueTypeCounts['code_style'] >= 5) {
    // コードスタイルの問題が多い場合、適切なスキルを追加
    const styleSkill = allSkills.find(skill => 
      skill.name.toLowerCase().includes('style') || 
      skill.description.toLowerCase().includes('style')
    );
    if (styleSkill && !recommendedSkills.some(s => s.id === styleSkill.id)) {
      recommendedSkills.push(styleSkill);
    }
  }
  
  if (issueTypeCounts['performance'] && issueTypeCounts['performance'] >= 3) {
    // パフォーマンスの問題が多い場合、パフォーマンス関連スキルを追加
    const perfSkill = allSkills.find(skill => 
      skill.name.toLowerCase().includes('performance') || 
      skill.description.toLowerCase().includes('performance')
    );
    if (perfSkill && !recommendedSkills.some(s => s.id === perfSkill.id)) {
      recommendedSkills.push(perfSkill);
    }
  }
  
  return recommendedSkills;
};

/**
 * コード分析結果に基づいて学習パスを生成
 * @param analysisResults 分析結果
 * @param userId ユーザーID
 */
export const generateLearningPath = async (
  analysisResults: RepositoryAnalysisResult, 
  userId: string
): Promise<Skill[]> => {
  try {
    if (!analysisResults || !userId) {
      console.error('Invalid analysis results or userId');
      return [];
    }
    
    // 主要言語と使用割合を取得
    const languageBreakdown = analysisResults.languageBreakdown || {};
    const primaryLanguages: {language: string, percentage: number}[] = [];
    
    // 主要言語の抽出（10%以上使用されている言語）
    for (const [language, percentage] of Object.entries(languageBreakdown)) {
      const normalizedLanguage = normalizeLanguageName(language);
      if (percentage >= 10 && normalizedLanguage) {
        primaryLanguages.push({
          language: normalizedLanguage,
          percentage
        });
      }
    }
    
    // 言語ごとのスコアとスキルレベルを取得
    const languageSkillLevels: {language: string, level: SkillLevel, score: number}[] = [];
    
    for (const {language, percentage} of primaryLanguages) {
      // 言語ごとのファイル分析結果を抽出
      const languageFiles = (analysisResults.files || []).filter(
        file => file && file.language && normalizeLanguageName(file.language) === language
      );
      
      if (languageFiles.length === 0) continue;
      
      // 言語ごとの平均スコア計算
      const avgCodeStyleScore = calculateAverage(languageFiles.map(f => f.codeStyleScore || 0));
      const avgNamingScore = calculateAverage(languageFiles.map(f => f.namingScore || 0));
      const avgBestPracticesScore = calculateAverage(languageFiles.map(f => f.bestPracticesScore || 0));
      const avgComplexityScore = calculateAverage(languageFiles.map(f => f.complexityScore || 0));
      
      // 総合スコア（0-100）
      const totalScore = (
        (avgCodeStyleScore * 0.25) + 
        (avgNamingScore * 0.25) + 
        ((10 - avgComplexityScore) * 0.3) + // 複雑性は逆数
        (avgBestPracticesScore * 0.2)
      ) * 10;
      
      // スコアに基づいてスキルレベルを判定
      let level: SkillLevel;
      if (totalScore < 50) {
        level = 'beginner';
      } else if (totalScore < 80) {
        level = 'intermediate';
      } else {
        level = 'advanced';
      }
      
      languageSkillLevels.push({
        language,
        level,
        score: totalScore
      });
    }
    
    // 推奨スキルのリストを作成
    const recommendedSkills: Skill[] = [];
    
    // 言語ごとにスキルを推奨
    for (const {language, level} of languageSkillLevels) {
      // スキルマップから適切なスキルを選択
      const languageSkills = skillMap[language] || [];
      
      // レベルに適したスキルを選択
      const matchingSkills = languageSkills.filter(skill => {
        // 初心者には初心者向けスキルを推奨
        if (level === 'beginner') {
          return skill.level === 'beginner';
        }
        // 中級者には初級〜中級スキルを推奨
        else if (level === 'intermediate') {
          return skill.level === 'beginner' || skill.level === 'intermediate';
        }
        // 上級者にはすべてのレベルのスキルを推奨（足りない基礎があるかもしれないため）
        else {
          return true;
        }
      });
      
      // 推奨スキルリストに追加
      recommendedSkills.push(...matchingSkills);
    }
    
    // 分析結果に基づく特定のスキルの推奨
    const codeIssues = (analysisResults.files || []).flatMap(file => file.issues || []);
    
    // コード品質問題の種類をカウント
    const issueTypeCounts: Record<string, number> = {};
    codeIssues.forEach(issue => {
      if (issue && issue.type) {
        issueTypeCounts[issue.type] = (issueTypeCounts[issue.type] || 0) + 1;
      }
    });
    
    // 特定の問題が多い場合に関連スキルを推奨
    const analysisSkills = getRecommendedSkillsForAnalysis(issueTypeCounts);
    recommendedSkills.push(...analysisSkills);
    
    // 推奨スキルを重複なしで返す
    const uniqueSkills = Array.from(
      new Map(recommendedSkills.map(skill => [skill.id, skill])).values()
    );
    
    // 推奨されたスキルをFirestoreに保存
    if (analysisResults.repoName) {
      await saveRecommendedSkills(userId, uniqueSkills, analysisResults.repoName);
    }
    
    return uniqueSkills;
  } catch (error) {
    console.error('Failed to generate learning path:', error);
    return [];
  }
};

/**
 * 推奨スキルをFirestoreに保存
 */
const saveRecommendedSkills = async (
  userId: string, 
  skills: Skill[], 
  repoName: string
): Promise<boolean> => {
  if (!userId || !skills.length || !repoName) {
    console.error('Missing required parameters for saving recommended skills');
    return false;
  }
  
  try {
    const skillRecommendationsRef = db.collection('skill_recommendations').doc(userId);
    const docSnap = await skillRecommendationsRef.get();
    
    const now = firebase.firestore.Timestamp.fromDate(new Date());
    const skillIds = skills.map(skill => skill.id);
    
    if (docSnap.exists) {
      // 既存のレコードを更新
      await skillRecommendationsRef.update({
        recommendations: firebase.firestore.FieldValue.arrayUnion({
          repoName,
          skillIds,
          createdAt: now
        }),
        updatedAt: now
      });
    } else {
      // 新規レコードを作成
      await skillRecommendationsRef.set({
        userId,
        recommendations: [{
          repoName,
          skillIds,
          createdAt: now
        }],
        createdAt: now,
        updatedAt: now
      });
    }
    
    return true;
  } catch (error) {
    console.error('Failed to save recommended skills:', error);
    return false;
  }
};

/**
 * 言語名の正規化
 */
const normalizeLanguageName = (language: string): string | null => {
  const normalized = language.toLowerCase();
  
  // サポート対象言語のマッピング
  const languageMapping: Record<string, string> = {
    'javascript': 'javascript',
    'js': 'javascript',
    'jsx': 'javascript',
    'typescript': 'typescript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'python': 'python',
    'py': 'python',
    'go': 'go',
    'golang': 'go'
  };
  
  return languageMapping[normalized] || null;
};

/**
 * 配列の平均値を計算
 */
const calculateAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

/**
 * スキルに関連する学習リソースの取得
 * @param skillId スキルID
 */
export const getResourcesForSkill = (skillId: string): LearningResource[] => {
  // スキルを探す
  let targetSkill: Skill | undefined;
  for (const skills of Object.values(skillMap)) {
    const skill = skills.find(s => s.id === skillId);
    if (skill) {
      targetSkill = skill;
      break;
    }
  }
  
  if (!targetSkill) return [];
  
  // スキルに関連するリソースをフィルタリング
  return learningResources.filter(resource => 
    resource.skillId === targetSkill?.id
  );
};

/**
 * ユーザーのスキルレベルを保存/更新
 */
export const saveUserSkill = async (
  userId: string, 
  skillId: string, 
  level: number
): Promise<boolean> => {
  try {
    if (level < 0 || level > 100) {
      throw new Error('スキルレベルは0から100の間で指定してください');
    }
    
    const userSkillsRef = db.collection('userSkills').doc(userId);
    const docSnap = await userSkillsRef.get();
    
    const now = firebase.firestore.Timestamp.fromDate(new Date());
    
    if (docSnap.exists) {
      // 既存のスキルを更新
      const data = docSnap.data();
      if (!data) {
        // データが存在しない場合は新規作成
        await userSkillsRef.set({
          skills: [{
            skillId,
            level,
            lastUpdated: now
          }],
          createdAt: now,
          updatedAt: now
        });
        return true;
      }
      
      const skills = data.skills || [];
      const existingSkillIndex = skills.findIndex((s: any) => s.skillId === skillId);
      
      if (existingSkillIndex >= 0) {
        // 既存のスキルを更新
        skills[existingSkillIndex] = {
          ...skills[existingSkillIndex],
          level,
          lastUpdated: now
        };
        
        await userSkillsRef.update({ 
          skills,
          updatedAt: now
        });
      } else {
        // 新しいスキルを追加
        await userSkillsRef.update({
          skills: firebase.firestore.FieldValue.arrayUnion({
            skillId,
            level,
            lastUpdated: now
          }),
          updatedAt: now
        });
      }
    } else {
      // 新規ドキュメント作成
      await userSkillsRef.set({
        skills: [{
          skillId,
          level,
          lastUpdated: now
        }],
        createdAt: now,
        updatedAt: now
      });
    }
    
    return true;
  } catch (error) {
    console.error('Failed to save user skill:', error);
    return false;
  }
};

/**
 * ユーザーのスキルデータを取得
 */
export const getUserSkills = async (userId: string): Promise<UserSkill[]> => {
  try {
    const userSkillsRef = db.collection('user_skills').doc(userId);
    const docSnap = await userSkillsRef.get();
    
    if (docSnap.exists) {
      const data = docSnap.data();
      if (!data) return [];
      
      // 非nullアサーションを追加して、TypeScriptに変数がnullでないことを明示する
      return ((data as any).skills || []).map((skill: any) => ({
        userId: userId,
        skillId: skill.skillId,
        level: skill.level,
        lastUpdated: skill.lastUpdated
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Failed to get user skills:', error);
    return [];
  }
};

/**
 * スキルIDからスキル詳細を取得
 * @param skillId スキルID
 */
export const getSkillById = (skillId: string): Skill | undefined => {
  for (const skills of Object.values(skillMap)) {
    const skill = skills.find(s => s.id === skillId);
    if (skill) return skill;
  }
  
  return undefined;
};

/**
 * 学習進捗の保存/更新
 * @param userId ユーザーID
 * @param resourceId リソースID
 * @param completed 完了状況
 * @param notes メモ（オプション）
 */
export const updateLearningProgress = async (
  userId: string,
  resourceId: string,
  completed: boolean,
  notes?: string
): Promise<boolean> => {
  try {
    const progressRef = db.collection('learning_progress');
    const q = progressRef.where('userId', '==', userId).where('resourceId', '==', resourceId);
    
    const querySnapshot = await q.get();
    const now = firebase.firestore.Timestamp.fromDate(new Date());
    
    if (querySnapshot.empty) {
      // 新しい進捗レコードを作成
      await progressRef.add({
        userId,
        resourceId,
        completed,
        completedAt: completed ? now : null,
        updatedAt: now
      });
    } else {
      // 既存の進捗を更新
      const docRef = db.collection('learning_progress').doc(querySnapshot.docs[0].id);
      await docRef.update({
        completed,
        completedAt: completed ? now : null,
        updatedAt: now
      });
    }
    
    return true;
  } catch (error) {
    console.error('学習進捗更新エラー:', error);
    return false;
  }
};

/**
 * ユーザーの学習進捗一覧を取得
 * @param userId ユーザーID
 */
export const getUserLearningProgress = async (userId: string): Promise<LearningProgress[]> => {
  try {
    const progressRef = db.collection('learning_progress');
    const q = progressRef.where('userId', '==', userId);
    
    const querySnapshot = await q.get();
    return querySnapshot.docs.map((doc: firebase.firestore.QueryDocumentSnapshot) => ({
      ...doc.data() as LearningProgress,
    }));
  } catch (error) {
    console.error('Failed to get user learning progress:', error);
    return [];
  }
};

/**
 * リソースIDから学習リソース詳細を取得
 * @param resourceId リソースID
 */
export const getResourceById = (resourceId: string): LearningResource | undefined => {
  return learningResources.find(resource => resource.id === resourceId);
};

/**
 * 言語に基づいて学習リソースを取得
 * @param language 言語
 * @param level スキルレベル（オプション）
 */
export const getResourcesByLanguage = (
  language: string, 
  level?: SkillLevel
): LearningResource[] => {
  const resources = learningResources.filter(resource => 
    resource.skillId.startsWith(language.toLowerCase())
  );
  
  if (level) {
    return resources.filter(resource => resource.level === level);
  }
  
  return resources;
};

/**
 * スキルIDに基づいて学習リソースを取得
 */
export const getResourcesForSkills = (skillIds: string[]): LearningResource[] => {
  if (!skillIds || skillIds.length === 0) return [];
  
  return learningResources.filter(resource => 
    skillIds.includes(resource.skillId)
  );
};

/**
 * 特定の言語のスキルを取得
 */
export const getSkillsForLanguage = (language: string): Skill[] => {
  if (!language) return [];
  
  return skillMap[language] || [];
};

/**
 * クライアントサイドで全学習リソースを取得
 */
export const getAllLearningResources = (): LearningResource[] => {
  return learningResources;
};

export default {
  generateLearningPath,
  getResourcesForSkill,
  saveUserSkill,
  getUserSkills,
  getSkillById,
  updateLearningProgress,
  getUserLearningProgress,
  getResourceById,
  getResourcesByLanguage,
  getSkillsForLanguage,
  getAllSkills,
  getAllLearningResources,
  getResourcesForSkills
}; 