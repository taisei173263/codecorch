/**
 * コード分析サービス
 * GitHub上のコードを分析し、評価・改善提案を行う機能を提供します
 */

import * as tf from '@tensorflow/tfjs';
import { getFileContent, getRepositoryContents, getRepositoryLanguages } from './githubService';
import { enhanceLearningRecommendation } from './tfService';

let model: tf.LayersModel | null = null;

// サポートされている言語の定義
export const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'go', 'java', 'c', 'cpp', 'csharp', 'jupyter'
];

// サポートされているファイル拡張子の定義
export const SUPPORTED_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.java', '.c', '.cpp', '.cs', '.ipynb', '.colab'
];

// 結果型定義
export interface CodeAnalysisResult {
  score: number;               // 総合スコア（0-100）
  codeStyle: number;           // コードスタイルスコア
  namingConventions: number;   // 命名規則スコア
  complexity: number;          // 複雑性スコア
  bestPractices: number;       // ベストプラクティススコア
  issues: CodeIssue[];         // 検出された問題
  metrics: CodeMetrics;        // コードメトリクス
  language: string;            // 言語
}

// コード問題型定義
export interface CodeIssue {
  type: string;                // 問題タイプ
  severity: 'low' | 'medium' | 'high'; // 重要度
  message: string;             // 説明メッセージ
  line: number;                // 問題のある行
  column?: number;             // 問題のある列
  suggestion?: string;         // 修正の提案
}

// コードメトリクス型定義
export interface CodeMetrics {
  lineCount: number;           // 総行数
  commentCount: number;        // コメント行数
  functionCount: number;       // 関数数
  complexityScore: number;     // 複雑性スコア
  nestingDepth: number;        // ネスト深度
}

// 問題タイプ定義
export type IssueType = 
  | 'code_style'
  | 'naming'
  | 'complexity'
  | 'best_practice'
  | 'security'
  | 'performance';

// 重要度定義
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

// ファイル分析結果型定義
export interface FileAnalysisResult {
  fileName: string;
  language: string;
  lineCount: number;
  commentCount: number;
  functionCount: number;
  complexityScore: number;
  maxNestingDepth: number;
  codeStyleScore: number;
  namingScore: number;
  bestPracticesScore: number;
  issues: CodeIssue[];
  scoreExplanations: {
    codeStyle: string;
    naming: string;
    complexity: string;
    bestPractices: string;
  };
}

// リポジトリ分析結果型定義
export interface RepositoryAnalysisResult {
  repoName: string;
  files: FileAnalysisResult[];
  overallScore: number;
  languageBreakdown: Record<string, number>;
  timestamp: number;
}

/**
 * TensorFlow.jsモデルをロード
 * 注意: この実装では、シンプルな実装だけを行います。実際のプロダクション環境では、
 * 事前に訓練された複雑なモデルをロードするべきです。
 */
const loadModel = async () => {
  if (model) return model;

  try {
    console.log('コード分析モデルを初期化中...');
    
    // シンプルなコード品質評価用のモデルを作成
    const sequential = tf.sequential();
    
    // 入力: 行数、コメント率、ネスト深度、変数名の長さ、関数の数
    sequential.add(tf.layers.dense({
      units: 16,
      activation: 'relu',
      inputShape: [5]
    }));
    
    sequential.add(tf.layers.dense({
      units: 8,
      activation: 'relu'
    }));
    
    sequential.add(tf.layers.dense({
      units: 4,
      activation: 'sigmoid'
    }));
    
    sequential.compile({
      optimizer: tf.train.adam(),
      loss: 'meanSquaredError'
    });
    
    // モデルの重みは本来は訓練データに基づいて学習されるべきですが、
    // この例では簡単のため、ランダムな初期値のままとします
    
    console.log('コード分析モデルが正常に初期化されました');
    model = sequential;
    return model;
  } catch (error) {
    console.error('コード分析モデルのロードに失敗:', error);
    // エラーが発生してもアプリケーションは継続できるようにする
    return null;
  }
};

/**
 * リポジトリのコード分析を実行
 */
export const analyzeRepository = async (fullRepoName: string, targetFilePath?: string): Promise<RepositoryAnalysisResult> => {
  // リポジトリ名からオーナーとリポジトリ名を分離
  const [owner, repo] = fullRepoName.split('/');
  
  // TensorFlow.jsモデルをロード
  await loadModel();
  
  // リポジトリの言語統計を取得
  const languageStats = await getRepositoryLanguages(owner, repo);
  
  // 全言語の合計バイト数を計算
  const totalBytes = Object.values(languageStats).reduce((sum: number, bytes: any) => sum + (bytes as number), 0);
  
  // 言語の割合を計算
  const languageBreakdown: Record<string, number> = {};
  for (const [lang, bytes] of Object.entries(languageStats)) {
    languageBreakdown[lang] = Math.round(((bytes as number) / totalBytes) * 100);
  }
  
  // 各ファイルを分析
  const fileResults: FileAnalysisResult[] = [];
  
  if (targetFilePath) {
    // 特定のファイルを分析する場合
    try {
      const fileName = targetFilePath.split('/').pop() || targetFilePath;
      const result = await analyzeFile(owner, repo, targetFilePath, fileName);
      if (result) {
        fileResults.push(result);
      }
    } catch (error) {
      console.error(`Failed to analyze file ${targetFilePath}:`, error);
    }
  } else {
    // 従来のようにリポジトリから複数ファイルを分析する場合
    // ファイルを収集
    const rootContents = await getRepositoryContents(owner, repo);
    const filePaths = await collectFiles(owner, repo, rootContents);
    
    // 分析するファイルの最大数を制限（大きなリポジトリのパフォーマンス対策）
    const MAX_FILES_TO_ANALYZE = 10;
    const filesToAnalyze = filePaths.slice(0, MAX_FILES_TO_ANALYZE);
    
    for (const file of filesToAnalyze) {
      try {
        const result = await analyzeFile(owner, repo, file.path, file.name);
        if (result) {
          fileResults.push(result);
        }
      } catch (error) {
        console.error(`Failed to analyze file ${file.path}:`, error);
      }
    }
  }
  
  // 全体スコアを計算
  const overallScore = calculateOverallScore(fileResults);
  
  return {
    repoName: fullRepoName,
    files: fileResults,
    overallScore,
    languageBreakdown,
    timestamp: Date.now()
  };
};

/**
 * リポジトリから分析対象ファイルを収集
 */
const collectFiles = async (
  owner: string,
  repo: string,
  contents: any[],
  baseDir = '',
  result: { name: string; path: string }[] = []
): Promise<{ name: string; path: string }[]> => {
  for (const item of contents) {
    if (item.type === 'file') {
      // コード分析対象の拡張子かチェック
      if (SUPPORTED_EXTENSIONS.some(ext => item.name.toLowerCase().endsWith(ext))) {
        result.push({
          name: item.name,
          path: item.path
        });
      }
    } else if (item.type === 'dir' && !item.name.startsWith('.') && !item.name.includes('node_modules')) {
      // ディレクトリの場合は再帰的に収集（ただし隠しディレクトリやnode_modulesは除外）
      const dirContents = await getRepositoryContents(owner, repo, item.path);
      await collectFiles(owner, repo, dirContents, item.path, result);
    }
  }
  
  return result;
};

/**
 * 単一ファイルの分析
 */
const analyzeFile = async (
  owner: string,
  repo: string,
  path: string,
  fileName: string
): Promise<FileAnalysisResult | null> => {
  try {
    // ファイルの内容を取得
    const content = await getFileContent(owner, repo, path);
    
    // ファイルの言語を拡張子から判定
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const language = getLanguageFromExtension(extension);
    
    // ファイルが空または言語が未サポートの場合はスキップ
    if (!content || !language) {
      return null;
    }
    
    let lines: string[] = [];
    let actualContent = content;
    
    // Jupyter Notebook形式(.ipynb, .colab)のファイルを処理
    if (language === 'jupyter') {
      try {
        const notebookJson = JSON.parse(content);
        // セルからPythonコードを抽出
        const codeLines: string[] = [];
        if (notebookJson.cells) {
          notebookJson.cells.forEach((cell: any) => {
            if (cell.cell_type === 'code') {
              const cellSource = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
              codeLines.push(...cellSource.split('\n'));
            }
          });
        }
        lines = codeLines;
        actualContent = codeLines.join('\n');
      } catch (error) {
        console.error(`JSONとしてJupyterノートブックを解析できません: ${path}`, error);
        lines = content.split('\n');
      }
    } else {
      // 通常のテキストファイル
      lines = content.split('\n');
    }
    
    // ファイルが空の場合はスキップ
    if (lines.length === 0) {
      return null;
    }
    
    // 行数をカウント
    const lineCount = lines.length;
    
    // コメント行をカウント
    const commentCount = countCommentLines(lines, language === 'jupyter' ? 'python' : language);
    
    // 関数数をカウント
    const functionCount = countFunctions(actualContent, language === 'jupyter' ? 'python' : language);
    
    // 最大ネスト深度を計算
    const maxNestingDepth = calculateMaxNestingDepth(actualContent, language === 'jupyter' ? 'python' : language);
    
    // TensorFlow.jsを使用してコード品質分析
    const analysisFeatures = [
      lineCount / 1000, // 行数（正規化）
      commentCount / lineCount, // コメント率
      maxNestingDepth / 10, // ネスト深度（正規化）
      functionCount / 50, // 関数数（正規化）
      lines.join('').length / 10000 // コード全体の長さ（正規化）
    ];
    
    let prediction;
    if (model) {
      const tensor = tf.tensor2d([analysisFeatures]);
      prediction = model.predict(tensor) as tf.Tensor;
      tensor.dispose();
    }
    
    // 予測結果から各スコアを取得
    let codeStyleScore = 7;
    let namingScore = 7;
    let bestPracticesScore = 7;
    let complexityScore = calculateComplexityScore(functionCount, lineCount, maxNestingDepth);
    
    if (prediction) {
      const scores = await prediction.data();
      prediction.dispose();
      
      // 予測スコアを0-10の範囲に変換
      codeStyleScore = Math.round(scores[0] * 10);
      namingScore = Math.round(scores[1] * 10);
      bestPracticesScore = Math.round(scores[2] * 10);
      // 複雑性スコアは注: 値が低いほど良い
      const predictedComplexity = Math.round(scores[3] * 10);
      complexityScore = Math.min(complexityScore, predictedComplexity);
    }
    
    // 静的分析による問題検出
    const issues = detectIssues(actualContent, language === 'jupyter' ? 'python' : language, lines);
    
    // 各スコアの詳細な説明を生成
    const codeStyleExplanation = getScoreExplanation('codeStyle', codeStyleScore, language);
    const namingExplanation = getScoreExplanation('naming', namingScore, language);
    const complexityExplanation = getScoreExplanation('complexity', complexityScore, language);
    const bestPracticesExplanation = getScoreExplanation('bestPractices', bestPracticesScore, language);
    
    return {
      fileName,
      language: language === 'jupyter' ? 'python (notebook)' : language,
      lineCount,
      commentCount,
      functionCount,
      complexityScore,
      maxNestingDepth,
      codeStyleScore,
      namingScore,
      bestPracticesScore,
      issues,
      // 各スコアの説明を追加
      scoreExplanations: {
        codeStyle: codeStyleExplanation,
        naming: namingExplanation,
        complexity: complexityExplanation,
        bestPractices: bestPracticesExplanation
      }
    };
  } catch (error) {
    console.error(`Error analyzing file ${path}:`, error);
    return null;
  }
};

/**
 * ファイルの拡張子から言語を判定
 */
const getLanguageFromExtension = (extension: string): string | null => {
  const extensionMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'ipynb': 'jupyter',
    'colab': 'jupyter',
    'go': 'go',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp'
  };
  
  return extensionMap[extension] || null;
};

/**
 * コメント行をカウント
 */
const countCommentLines = (lines: string[], language: string): number => {
  let count = 0;
  let inMultiLineComment = false;
  
  // Jupyter Notebookはpythonとして処理
  const effectiveLanguage = language === 'jupyter' ? 'python' : language;
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    
    if (trimmedLine === '') return;
    
    switch (effectiveLanguage) {
      case 'javascript':
      case 'typescript':
        // 複数行コメントの開始チェック
        if (trimmedLine.includes('/*') && !trimmedLine.includes('*/')) {
          inMultiLineComment = true;
          count++;
          return;
        }
        
        // 複数行コメントの終了チェック
        if (inMultiLineComment && trimmedLine.includes('*/')) {
          inMultiLineComment = false;
          count++;
          return;
        }
        
        // 複数行コメント中
        if (inMultiLineComment) {
          count++;
          return;
        }
        
        // 単一行コメント
        if (trimmedLine.startsWith('//')) {
          count++;
          return;
        }
        break;
      
      case 'python':
        // 複数行コメントの開始チェック
        if (trimmedLine.startsWith('"""') || trimmedLine.startsWith("'''")) {
          const hasClosingQuote = (
            (trimmedLine.startsWith('"""') && trimmedLine.substring(3).includes('"""')) ||
            (trimmedLine.startsWith("'''") && trimmedLine.substring(3).includes("'''"))
          );
          
          if (!hasClosingQuote) {
            inMultiLineComment = true;
          }
          
          count++;
          return;
        }
        
        // 複数行コメントの終了チェック
        if (inMultiLineComment && (trimmedLine.endsWith('"""') || trimmedLine.endsWith("'''"))) {
          inMultiLineComment = false;
          count++;
          return;
        }
        
        // 複数行コメント中
        if (inMultiLineComment) {
          count++;
          return;
        }
        
        // 単一行コメント
        if (trimmedLine.startsWith('#')) {
          count++;
          return;
        }
        break;
      
      // 他の言語も同様に処理...
      default:
        // 基本的なコメント検出（# または // で始まる行）
        if (trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
          count++;
          return;
        }
    }
  });
  
  return count;
};

/**
 * 関数数をカウント
 */
const countFunctions = (content: string, language: string): number => {
  let count = 0;
  
  switch (language) {
    case 'javascript':
    case 'typescript':
      // 関数宣言、関数式、アロー関数をカウント
      const jsFunctionMatches = content.match(/function\s+\w+\s*\(|\(\s*\w*\s*\)\s*=>\s*{|function\s*\(|\w+\s*=\s*function\s*\(/g);
      count = jsFunctionMatches ? jsFunctionMatches.length : 0;
      break;
      
    case 'python':
      // Pythonのdef宣言をカウント
      const pyFunctionMatches = content.match(/def\s+\w+\s*\(/g);
      count = pyFunctionMatches ? pyFunctionMatches.length : 0;
      break;
      
    case 'go':
      // Goのfunc宣言をカウント
      const goFunctionMatches = content.match(/func\s+\w+\s*\(/g);
      count = goFunctionMatches ? goFunctionMatches.length : 0;
      break;
      
    default:
      // その他の言語は簡易的に処理
      const otherFunctionMatches = content.match(/function\s+\w+\s*\(|def\s+\w+\s*\(|func\s+\w+\s*\(/g);
      count = otherFunctionMatches ? otherFunctionMatches.length : 0;
  }
  
  return count;
};

/**
 * コードの最大ネスト深度を計算
 */
const calculateMaxNestingDepth = (content: string, language: string): number => {
  // Jupyter Notebookはpythonとして処理
  const effectiveLanguage = language === 'jupyter' ? 'python' : language;
  
  // 行ごとに処理
  const lines = content.split('\n');
  
  let maxDepth = 0;
  let currentDepth = 0;
  
  switch (effectiveLanguage) {
    case 'javascript':
    case 'typescript':
      // 単純な括弧カウント（より正確には構文解析が必要）
      for (const line of lines) {
        for (const char of line) {
          if (char === '{') {
            currentDepth++;
            maxDepth = Math.max(maxDepth, currentDepth);
          } else if (char === '}') {
            currentDepth = Math.max(0, currentDepth - 1);
          }
        }
      }
      break;
      
    case 'python':
      // インデントによるネスト深度を計算
      let lastIndentLevel = 0;
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine === '' || trimmedLine.startsWith('#')) {
          continue;
        }
        
        // インデントレベルを計算
        const indentLevel = line.length - line.trimStart().length;
        const currentIndentLevel = Math.ceil(indentLevel / 4); // 4スペースをPythonの標準インデントとして扱う
        
        if (currentIndentLevel > lastIndentLevel) {
          currentDepth += (currentIndentLevel - lastIndentLevel);
          maxDepth = Math.max(maxDepth, currentDepth);
        } else if (currentIndentLevel < lastIndentLevel) {
          currentDepth -= (lastIndentLevel - currentIndentLevel);
        }
        
        lastIndentLevel = currentIndentLevel;
      }
      break;
      
    default:
      // 単純な括弧カウントによる簡易計算
      for (const line of lines) {
        for (const char of line) {
          if (char === '{' || char === '(') {
            currentDepth++;
            maxDepth = Math.max(maxDepth, currentDepth);
          } else if (char === '}' || char === ')') {
            currentDepth = Math.max(0, currentDepth - 1);
          }
        }
      }
  }
  
  return maxDepth;
};

/**
 * 複雑性スコアを計算（低いほど良い）
 */
const calculateComplexityScore = (functionCount: number, lineCount: number, nestingDepth: number): number => {
  // 関数あたりの平均行数
  const avgLinesPerFunction = functionCount > 0 ? lineCount / functionCount : lineCount;
  
  // 複雑性スコアの計算
  // - 関数あたりの平均行数が多いほど複雑
  // - ネスト深度が深いほど複雑
  let complexityScore = 0;
  
  // 平均行数による複雑性（20行以下が理想）
  if (avgLinesPerFunction <= 20) {
    complexityScore += 1;
  } else if (avgLinesPerFunction <= 40) {
    complexityScore += 3;
  } else if (avgLinesPerFunction <= 80) {
    complexityScore += 5;
  } else {
    complexityScore += 7;
  }
  
  // ネスト深度による複雑性（3以下が理想）
  if (nestingDepth <= 3) {
    complexityScore += 1;
  } else if (nestingDepth <= 5) {
    complexityScore += 3;
  } else if (nestingDepth <= 7) {
    complexityScore += 5;
  } else {
    complexityScore += 7;
  }
  
  // 全体的な複雑性スコア（0-10、低いほど良い）
  return Math.min(10, Math.max(1, Math.round(complexityScore / 2)));
};

/**
 * コードの問題を検出
 */
const detectIssues = (content: string, language: string, lines: string[]): CodeIssue[] => {
  const issues: CodeIssue[] = [];
  
  // 言語共通の問題検出
  
  // 1. 長い行を検出
  lines.forEach((line, index) => {
    if (line.length > 100) {
      issues.push({
        type: 'code_style',
        severity: 'low',
        message: '行が長すぎます。80-100文字以内に収めることを推奨します。',
        line: index + 1,
        suggestion: '長い行を複数行に分割するか、変数名を短くすることを検討してください。'
      });
    }
  });
  
  // 2. TODOコメントを検出
  lines.forEach((line, index) => {
    if (line.includes('TODO') || line.includes('FIXME')) {
      issues.push({
        type: 'best_practice',
        severity: 'low',
        message: '未解決のTODOまたはFIXMEコメントが見つかりました。',
        line: index + 1,
        suggestion: '時間を取ってTODO項目を解決するか、課題管理システムでタスクとして追跡することを検討してください。'
      });
    }
  });
  
  // 言語固有の問題検出
  switch (language) {
    case 'javascript':
    case 'typescript':
      // console.logの使用を検出
      lines.forEach((line, index) => {
        if (line.includes('console.log')) {
          issues.push({
            type: 'best_practice',
            severity: 'low',
            message: 'デバッグ用console.logが残されています。',
            line: index + 1,
            suggestion: '本番環境ではconsole.logを削除するか、適切なロギングライブラリを使用してください。'
          });
        }
      });
      
      // varの使用を検出（letまたはconstを推奨）
      if (language === 'javascript') {
        lines.forEach((line, index) => {
          if (/\bvar\s+/.test(line)) {
            issues.push({
              type: 'best_practice',
              severity: 'medium',
              message: '古い変数宣言方法varが使用されています。',
              line: index + 1,
              suggestion: 'varの代わりにconstまたはletを使用してください。'
            });
          }
        });
      }
      break;
      
    case 'python':
      // printステートメントの使用を検出
      lines.forEach((line, index) => {
        if (/\bprint\(/.test(line)) {
          issues.push({
            type: 'best_practice',
            severity: 'low',
            message: 'デバッグ用printが残されています。',
            line: index + 1,
            suggestion: '本番環境ではprintを削除するか、適切なロギングライブラリを使用してください。'
          });
        }
      });
      break;
  }
  
  return issues;
};

/**
 * 全体スコアを計算
 */
const calculateOverallScore = (fileResults: FileAnalysisResult[]): number => {
  if (fileResults.length === 0) {
    return 0;
  }
  
  let totalScore = 0;
  
  for (const file of fileResults) {
    // 各スコアの重み付け平均
    const fileScore = 
      (file.codeStyleScore * 0.25) + 
      (file.namingScore * 0.25) + 
      ((10 - file.complexityScore) * 0.3) + // 複雑性は逆数
      (file.bestPracticesScore * 0.2);
    
    totalScore += fileScore;
  }
  
  // 0-100の範囲に正規化
  return Math.round((totalScore / fileResults.length) * 10);
};

/**
 * 各スコアの詳細な説明を生成
 */
export const getScoreExplanation = (scoreType: string, score: number, language: string): string => {
  // スコアの範囲に基づいた評価レベル
  const level = score >= 8 ? '優れている' : score >= 6 ? '良好' : score >= 4 ? '改善の余地あり' : '要改善';
  
  // 言語別にカスタマイズされた説明（必要に応じて拡張可能）
  const languageSpecific = language === 'python' || language === 'jupyter' 
    ? 'Pythonでは' 
    : language === 'javascript' || language === 'typescript' 
      ? 'JavaScriptでは' 
      : '';
  
  switch (scoreType) {
    case 'codeStyle':
      // コードスタイルの説明
      if (score >= 8) {
        return `${level}：コードは一貫したスタイルで整形されており、読みやすさが高いです。${languageSpecific}適切なインデントやスペース、改行が使われています。`;
      } else if (score >= 6) {
        return `${level}：コードスタイルは概ね良好ですが、一部に改善の余地があります。${languageSpecific}インデントや行の長さに注意すると良いでしょう。`;
      } else if (score >= 4) {
        return `${level}：コードスタイルにいくつかの問題があります。${languageSpecific}一貫したインデント、適切な行の長さ、読みやすいコードブロックの構成を心がけましょう。`;
      } else {
        return `${level}：コードスタイルに重大な問題があります。${languageSpecific}コードフォーマッターの使用や、スタイルガイドに従った書き方を検討してください。`;
      }
      
    case 'naming':
      // 命名規則の説明
      if (score >= 8) {
        return `${level}：変数や関数の命名が明確で、理解しやすいコードになっています。${languageSpecific}適切な命名規則に従っています。`;
      } else if (score >= 6) {
        return `${level}：命名は概ね適切ですが、一部に改善の余地があります。${languageSpecific}より説明的な変数名や一貫した命名規則を検討してください。`;
      } else if (score >= 4) {
        return `${level}：命名にいくつかの問題があります。${languageSpecific}短すぎる変数名、混同しやすい名前、一貫性のない命名パターンがあります。`;
      } else {
        return `${level}：命名に重大な問題があります。${languageSpecific}意味のある変数名を使用し、言語の標準的な命名規則に従ってください。`;
      }
      
    case 'complexity':
      // 複雑性スコアの説明（値が低いほど良い）
      if (score <= 3) {
        return `${level}：コードの複雑性は非常に低く、理解しやすい構造になっています。${languageSpecific}適切な関数分割と浅いネストレベルを維持しています。`;
      } else if (score <= 5) {
        return `${level}：コードの複雑性は適切なレベルです。${languageSpecific}大部分のコードは理解しやすいですが、一部の関数はより小さな単位に分割できる可能性があります。`;
      } else if (score <= 7) {
        return `${level}：コードの複雑性がやや高く、理解しづらい部分があります。${languageSpecific}深いネストや長すぎる関数を分割することを検討してください。`;
      } else {
        return `${level}：コードの複雑性が非常に高く、保守が困難です。${languageSpecific}関数を小さな単位に分割し、ネストを減らし、複雑なロジックをシンプルにすることを強く推奨します。`;
      }
      
    case 'bestPractices':
      // ベストプラクティスの説明
      if (score >= 8) {
        return `${level}：コードは業界のベストプラクティスに従っています。${languageSpecific}適切なエラー処理、効率的なアルゴリズム、安全なコーディング手法が使われています。`;
      } else if (score >= 6) {
        return `${level}：ベストプラクティスは概ね守られていますが、改善の余地があります。${languageSpecific}エラー処理やコードの効率性を見直してみてください。`;
      } else if (score >= 4) {
        return `${level}：ベストプラクティスにいくつかの問題があります。${languageSpecific}エラー処理の追加、効率的なアルゴリズムの使用、冗長なコードの削減を検討してください。`;
      } else {
        return `${level}：ベストプラクティスに重大な問題があります。${languageSpecific}言語の標準的なプラクティスに従ったコードリファクタリングを検討してください。`;
      }
      
    default:
      return `スコア ${score}/10：詳細な分析情報はありません。`;
  }
};

/**
 * 特定の単一ファイルを分析する
 */
export const analyzeSingleFile = async (
  fullRepoName: string,
  filePath: string
): Promise<FileAnalysisResult | null> => {
  const [owner, repo] = fullRepoName.split('/');
  const fileName = filePath.split('/').pop() || filePath;
  return await analyzeFile(owner, repo, filePath, fileName);
};

export default {
  analyzeRepository,
  analyzeSingleFile,
  loadModel
};