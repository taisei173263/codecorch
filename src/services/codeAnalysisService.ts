/**
 * コード分析サービス
 * GitHub上のコードを分析し、評価・改善提案を行う機能を提供します
 */

import * as tf from '@tensorflow/tfjs';
import { getFileContent, getRepositoryContents, getRepositoryLanguages } from './githubService';
import { enhanceLearningRecommendation } from './tfService';
import transformersService from './transformersService';

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
 * コードスタイルスコアを計算
 */
const calculateCodeStyleScore = (code: string, language: string): number => {
  const lines = code.split('\n');
  const lineCount = lines.length;
  
  // 長い行の割合
  const longLines = lines.filter(line => line.length > 100).length;
  const longLineRatio = (longLines / lineCount) * 100;
  
  // インデントの一貫性
  let inconsistentIndent = false;
  let lastIndent = -1;
  
  lines.forEach(line => {
    if (line.trim() === '') return;
    
    const indentSize = line.length - line.trimStart().length;
    
    if (lastIndent !== -1) {
      // インデントの急激な変化をチェック
      if (Math.abs(indentSize - lastIndent) > 4 && indentSize !== 0) {
        inconsistentIndent = true;
      }
    }
    
    lastIndent = indentSize;
  });
  
  // スコア計算（10点満点）
  let score = 10;
  
  // 長い行による減点
  if (longLineRatio > 30) {
    score -= 4;
  } else if (longLineRatio > 20) {
    score -= 3;
  } else if (longLineRatio > 10) {
    score -= 2;
  } else if (longLineRatio > 5) {
    score -= 1;
  }
  
  // インデントの一貫性による減点
  if (inconsistentIndent) {
    score -= 2;
  }
  
  // 最終スコアを計算
  return Math.max(1, score);
};

/**
 * 命名規則スコアを計算
 */
const calculateNamingScore = (code: string, language: string): number => {
  const lines = code.split('\n');
  
  // 変数や関数の名前を抽出
  let identifiers: string[] = [];
  
  if (language === 'javascript' || language === 'typescript') {
    // 変数宣言を検出
    const varMatches = code.match(/(?:let|const|var)\s+(\w+)/g);
    if (varMatches) {
      varMatches.forEach(match => {
        const name = match.replace(/(?:let|const|var)\s+/, '');
        identifiers.push(name);
      });
    }
    
    // 関数定義を検出
    const funcMatches = code.match(/function\s+(\w+)/g);
    if (funcMatches) {
      funcMatches.forEach(match => {
        const name = match.replace(/function\s+/, '');
        identifiers.push(name);
      });
    }
  } else if (language === 'python') {
    // 関数定義を検出
    const funcMatches = code.match(/def\s+(\w+)/g);
    if (funcMatches) {
      funcMatches.forEach(match => {
        const name = match.replace(/def\s+/, '');
        identifiers.push(name);
      });
    }
    
    // 変数割り当てを検出
    const varMatches = code.match(/(\w+)\s*=/g);
    if (varMatches) {
      varMatches.forEach(match => {
        const name = match.replace(/\s*=/, '');
        if (!name.trim().startsWith('#')) {
          identifiers.push(name);
        }
      });
    }
  }
  
  // 命名規則の評価
  let score = 10;
  
  // 短すぎる識別子の割合
  const shortIdentifiers = identifiers.filter(name => 
    name.length < 2 && !['i', 'j', 'k', 'x', 'y', 'z'].includes(name)
  );
  
  const shortIdentifierRatio = shortIdentifiers.length / (identifiers.length || 1);
  
  if (shortIdentifierRatio > 0.3) {
    score -= 3;
  } else if (shortIdentifierRatio > 0.2) {
    score -= 2;
  } else if (shortIdentifierRatio > 0.1) {
    score -= 1;
  }
  
  // 命名規則に従っていない識別子の割合
  let nonConformingIdentifiers = 0;
  
  if (language === 'javascript' || language === 'typescript') {
    // JavaScript/TypeScriptではキャメルケースまたはパスカルケースが一般的
    nonConformingIdentifiers = identifiers.filter(name => 
      !/^[a-z][a-zA-Z0-9]*$/.test(name) && !/^[A-Z][a-zA-Z0-9]*$/.test(name)
    ).length;
  } else if (language === 'python') {
    // Pythonではスネークケースが一般的
    nonConformingIdentifiers = identifiers.filter(name => 
      !/^[a-z][a-z0-9_]*$/.test(name) && !/^[A-Z][A-Z0-9_]*$/.test(name)
    ).length;
  }
  
  const nonConformingRatio = nonConformingIdentifiers / (identifiers.length || 1);
  
  if (nonConformingRatio > 0.3) {
    score -= 3;
  } else if (nonConformingRatio > 0.2) {
    score -= 2;
  } else if (nonConformingRatio > 0.1) {
    score -= 1;
  }
  
  // 最終スコアを計算 (10点満点)
  return Math.max(1, score);
};

/**
 * ベストプラクティススコアを計算
 */
const calculateBestPracticesScore = (code: string, language: string, commentCount: number, lineCount: number): number => {
  const lines = code.split('\n');
  
  // スコアを10点から開始
  let score = 10;
  
  // コメント比率による評価
  const commentRatio = (commentCount / lineCount) * 100;
  
  if (commentRatio < 5 && lineCount > 30) {
    score -= 2; // コメントが少なすぎる
  } else if (commentRatio > 40) {
    score -= 1; // コメントが多すぎる可能性
  }
  
  // 言語固有のベストプラクティス評価
  if (language === 'javascript' || language === 'typescript') {
    // console.log の使用チェック
    const consoleLogCount = lines.filter(line => line.includes('console.log')).length;
    if (consoleLogCount > 5) {
      score -= 2;
    } else if (consoleLogCount > 0) {
      score -= 1;
    }
    
    // var の使用チェック
    if (language === 'javascript') {
      const varUsageCount = lines.filter(line => /\bvar\s+/.test(line)).length;
      if (varUsageCount > 0) {
        score -= Math.min(2, varUsageCount);
      }
    }
    
    // == の使用チェック
    const looseEqualityCount = lines.filter(line => 
      line.match(/[^=!]==[^=]/) || line.match(/[^=]!=[^=]/)
    ).length;
    
    if (looseEqualityCount > 0) {
      score -= Math.min(2, looseEqualityCount);
    }
  } else if (language === 'python') {
    // print の使用チェック
    const printCount = lines.filter(line => /\bprint\(/.test(line)).length;
    if (printCount > 5) {
      score -= 2;
    } else if (printCount > 0) {
      score -= 1;
    }
    
    // エラー処理の欠如チェック
    let hasTryExcept = false;
    for (const line of lines) {
      if (line.includes('try:') || line.includes('except ')) {
        hasTryExcept = true;
        break;
      }
    }
    
    if (!hasTryExcept && code.includes('open(') && !code.includes('with open(')) {
      score -= 2;
    }
  }
  
  // 最終スコアを計算 (10点満点)
  return Math.max(1, score);
};

/**
 * コードスタイルの問題を検出
 */
const detectStyleIssues = (code: string, language: string, lines: string[]): CodeIssue[] => {
  const issues: CodeIssue[] = [];
  
  // インデントの一貫性をチェック
  let expectedIndent = -1;
  let lastNonEmptyIndent = 0;
  
  lines.forEach((line, index) => {
    if (line.trim() === '') return;
    
    const indentSize = line.length - line.trimStart().length;
    
    if (language === 'python') {
      // Pythonのインデントチェック
      if (indentSize % 4 !== 0 && line.trim().length > 0) {
        issues.push({
          type: 'code_style',
          severity: 'medium',
          message: 'インデントが4の倍数ではありません。Pythonでは通常4スペースのインデントが推奨されています。',
          line: index + 1,
          suggestion: '4スペースの倍数でインデントを統一してください。'
        });
      }
    } else if (language === 'javascript' || language === 'typescript') {
      // JavaScript/TypeScriptのインデントチェック
      if (indentSize % 2 !== 0 && line.trim().length > 0) {
        issues.push({
          type: 'code_style',
          severity: 'low',
          message: 'インデントが2の倍数ではありません。JavaScriptでは通常2スペースのインデントが推奨されています。',
          line: index + 1,
          suggestion: '2スペースの倍数でインデントを統一してください。'
        });
      }
    }
    
    lastNonEmptyIndent = indentSize;
  });
  
  // 行末の空白をチェック
  lines.forEach((line, index) => {
    if (line.trimEnd().length < line.length) {
      issues.push({
        type: 'code_style',
        severity: 'low',
        message: '行末に余分な空白があります。',
        line: index + 1,
        suggestion: '行末の空白を削除してください。'
      });
    }
  });
  
  return issues;
};

/**
 * 命名規則の問題を検出
 */
const detectNamingIssues = (code: string, language: string, lines: string[]): CodeIssue[] => {
  const issues: CodeIssue[] = [];
  
  // 変数名や関数名を抽出
  let identifiers: { name: string, line: number }[] = [];
  
  if (language === 'javascript' || language === 'typescript') {
    // 変数宣言を検出
    lines.forEach((line, index) => {
      // 変数定義を検出
      const varMatches = line.match(/(?:let|const|var)\s+(\w+)/g);
      if (varMatches) {
        varMatches.forEach(match => {
          const name = match.replace(/(?:let|const|var)\s+/, '');
          identifiers.push({ name, line: index + 1 });
        });
      }
      
      // 関数定義を検出
      const funcMatches = line.match(/function\s+(\w+)/g);
      if (funcMatches) {
        funcMatches.forEach(match => {
          const name = match.replace(/function\s+/, '');
          identifiers.push({ name, line: index + 1 });
        });
      }
    });
  } else if (language === 'python') {
    lines.forEach((line, index) => {
      // 関数定義を検出
      const funcMatches = line.match(/def\s+(\w+)/g);
      if (funcMatches) {
        funcMatches.forEach(match => {
          const name = match.replace(/def\s+/, '');
          identifiers.push({ name, line: index + 1 });
        });
      }
      
      // 変数割り当てを検出
      const varMatches = line.match(/(\w+)\s*=/g);
      if (varMatches && !line.trim().startsWith('#')) {
        varMatches.forEach(match => {
          const name = match.replace(/\s*=/, '');
          identifiers.push({ name, line: index + 1 });
        });
      }
    });
  }
  
  // 識別子の命名規則をチェック
  identifiers.forEach(({ name, line }) => {
    // 短すぎる識別子
    if (name.length < 2 && !['i', 'j', 'k', 'x', 'y', 'z'].includes(name)) {
      issues.push({
        type: 'naming',
        severity: 'medium',
        message: `変数名 "${name}" が短すぎます。変数名は意味を明確に表すべきです。`,
        line,
        suggestion: '変数名はその役割や内容を説明する意味のある名前にしてください。'
      });
    }
    
    // 命名規則の一貫性
    if (language === 'javascript' || language === 'typescript') {
      // キャメルケース（変数、関数）またはパスカルケース（クラス）をチェック
      if (!/^[a-z][a-zA-Z0-9]*$/.test(name) && !/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
        issues.push({
          type: 'naming',
          severity: 'medium',
          message: `"${name}" は標準的な命名規則に従っていません。JavaScriptでは変数と関数にはキャメルケース、クラスにはパスカルケースが推奨されています。`,
          line,
          suggestion: '変数と関数には lowerCamelCase、クラスには UpperCamelCase を使用してください。'
        });
      }
    } else if (language === 'python') {
      // スネークケースをチェック
      if (!/^[a-z][a-z0-9_]*$/.test(name) && !/^[A-Z][A-Z0-9_]*$/.test(name)) {
        issues.push({
          type: 'naming',
          severity: 'medium',
          message: `"${name}" は標準的な命名規則に従っていません。Pythonでは変数と関数にはスネークケースが推奨されています。`,
          line,
          suggestion: '変数と関数には snake_case、定数には UPPER_SNAKE_CASE を使用してください。'
        });
      }
    }
  });
  
  return issues;
};

/**
 * 複雑度の問題を検出
 */
const detectComplexityIssues = (code: string, language: string, lines: string[]): CodeIssue[] => {
  const issues: CodeIssue[] = [];
  
  // 関数の長さをチェック
  let inFunction = false;
  let functionStartLine = 0;
  let functionName = '';
  let currentFunctionLines = 0;
  let braceCount = 0;
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    if (language === 'javascript' || language === 'typescript') {
      // 関数開始を検出
      if (trimmedLine.match(/function\s+(\w+)\s*\(/) || 
          trimmedLine.match(/(\w+)\s*=\s*function\s*\(/) ||
          trimmedLine.match(/(\w+)\s*\(\s*\)\s*=>/)) {
        
        const match = trimmedLine.match(/function\s+(\w+)/) || 
                      trimmedLine.match(/(\w+)\s*=\s*function/) ||
                      trimmedLine.match(/(\w+)\s*\(\s*\)\s*=>/);
        
        functionName = match ? match[1] : 'anonymous';
        inFunction = true;
        functionStartLine = index + 1;
        currentFunctionLines = 0;
        braceCount = 0;
      }
      
      // 関数の中にいる場合
      if (inFunction) {
        currentFunctionLines++;
        
        // 中括弧をカウント
        for (const char of line) {
          if (char === '{') braceCount++;
          else if (char === '}') {
            braceCount--;
            if (braceCount === 0 && trimmedLine.endsWith('}')) {
              // 関数の終わりを検出
              if (currentFunctionLines > 50) {
                issues.push({
                  type: 'complexity',
                  severity: 'medium',
                  message: `関数 "${functionName}" が長すぎます (${currentFunctionLines}行)。関数は理想的には30行以下に収めるべきです。`,
                  line: functionStartLine,
                  suggestion: '関数を小さな機能単位に分割することを検討してください。'
                });
              }
              inFunction = false;
            }
          }
        }
      }
    } else if (language === 'python') {
      // Pythonの関数開始を検出
      if (trimmedLine.startsWith('def ')) {
        const match = trimmedLine.match(/def\s+(\w+)/);
        functionName = match ? match[1] : 'anonymous';
        inFunction = true;
        functionStartLine = index + 1;
        currentFunctionLines = 0;
      }
      
      // 関数の中にいる場合
      if (inFunction) {
        currentFunctionLines++;
        
        // インデントがなくなったら関数の終わり
        if (currentFunctionLines > 1 && 
            line.length > 0 && 
            !line.startsWith(' ') && 
            !line.startsWith('\t')) {
          if (currentFunctionLines > 50) {
            issues.push({
              type: 'complexity',
              severity: 'medium',
              message: `関数 "${functionName}" が長すぎます (${currentFunctionLines}行)。関数は理想的には30行以下に収めるべきです。`,
              line: functionStartLine,
              suggestion: '関数を小さな機能単位に分割することを検討してください。'
            });
          }
          inFunction = false;
        }
      }
    }
  });
  
  // ネストの深さをチェック
  const maxNestingDepth = calculateMaxNestingDepth(code, language);
  if (maxNestingDepth > 4) {
    // ネストが深い箇所を特定
    let currentNestLevel = 0;
    let deepestNestLine = 0;
    
    lines.forEach((line, index) => {
      if (language === 'javascript' || language === 'typescript') {
        // 中括弧でネストレベルを追跡
        for (const char of line) {
          if (char === '{') {
            currentNestLevel++;
            if (currentNestLevel === 5 && deepestNestLine === 0) {
              deepestNestLine = index + 1;
            }
          } else if (char === '}') {
            currentNestLevel = Math.max(0, currentNestLevel - 1);
          }
        }
      } else if (language === 'python') {
        // インデントでネストレベルを追跡
        const indentLevel = Math.floor((line.length - line.trimStart().length) / 4);
        if (indentLevel >= 5 && deepestNestLine === 0) {
          deepestNestLine = index + 1;
        }
      }
    });
    
    if (deepestNestLine > 0) {
      issues.push({
        type: 'complexity',
        severity: 'high',
        message: `ネストの深さが${maxNestingDepth}レベルに達しています。コードの可読性が低下します。`,
        line: deepestNestLine,
        suggestion: 'ネストを減らすために、条件を反転させて早期リターンを使用するか、ヘルパー関数に分割することを検討してください。'
      });
    }
  }
  
  return issues;
};

/**
 * ベストプラクティスの問題を検出
 */
const detectBestPracticeIssues = (code: string, language: string, lines: string[]): CodeIssue[] => {
  const issues: CodeIssue[] = [];
  
  // コメント率をチェック
  const commentCount = countCommentLines(lines, language);
  const commentRatio = (commentCount / lines.length) * 100;
  
  if (commentRatio < 5 && lines.length > 30) {
    issues.push({
      type: 'best_practice',
      severity: 'medium',
      message: `コメントが少なすぎます (${commentRatio.toFixed(1)}%)。コードの理解と保守を容易にするために、適切なコメントを追加してください。`,
      line: 1,
      suggestion: '複雑なロジックや非自明な決定には説明コメントを追加し、関数の前には目的と動作を説明するドキュメントコメントを追加してください。'
    });
  }
  
  // 言語固有のベストプラクティスチェック
  if (language === 'javascript' || language === 'typescript') {
    // === の代わりに == を使用している可能性をチェック
    lines.forEach((line, index) => {
      if (line.match(/[^=!]==[^=]/) || line.match(/[^=]!=[^=]/)) {
        issues.push({
          type: 'best_practice',
          severity: 'medium',
          message: '緩い等価演算子(== or !=)が使用されています。JavaScriptでは厳密な等価演算子(=== or !==)の使用が推奨されています。',
          line: index + 1,
          suggestion: '== の代わりに === を、!= の代わりに !== を使用して型変換の問題を回避してください。'
        });
      }
    });
  } else if (language === 'python') {
    // エラー処理の欠如をチェック
    let hasTryExcept = false;
    for (const line of lines) {
      if (line.includes('try:') || line.includes('except ')) {
        hasTryExcept = true;
        break;
      }
    }
    
    if (!hasTryExcept && code.includes('open(') && !code.includes('with open(')) {
      // ファイル操作でwith文を使用していない
      lines.forEach((line, index) => {
        if (line.includes('open(') && !line.includes('with open(')) {
          issues.push({
            type: 'best_practice',
            severity: 'medium',
            message: 'ファイル操作にwith文が使用されていません。リソースリークを防ぐためにwith文の使用が推奨されています。',
            line: index + 1,
            suggestion: 'ファイルオペレーションには `with open(...) as f:` 構文を使用して、自動的にファイルがクローズされるようにしてください。'
          });
        }
      });
    }
  }
  
  return issues;
};

/**
 * TensorFlow.jsモデルをロード
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
    
    console.log('コード分析モデルが正常に初期化されました');
    model = sequential;
    return model;
  } catch (error) {
    console.error('コード分析モデルのロードに失敗:', error);
    return null;
  }
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
 * スコアの詳細な説明を生成
 */
const generateDetailedExplanation = (category: string, score: number, language: string, code: string): string => {
  // CodeBERTの分析結果に基づいた詳細な説明
  const basicExplanation = getScoreExplanation(category, score, language);
  
  // コードの具体的な特性に基づいた詳細追加
  let additionalDetails = '';
  
  switch (category) {
    case 'codeStyle':
      // コードスタイルの詳細分析
      const lines = code.split('\n');
      const longLines = lines.filter(line => line.length > 100).length;
      const longLineRatio = (longLines / lines.length) * 100;
      
      if (longLineRatio > 20) {
        additionalDetails = `コードの${longLineRatio.toFixed(0)}%が100文字を超える長い行です。読みやすさを向上させるために行の長さを短くすることを検討してください。`;
      } else if (score < 5) {
        additionalDetails = 'インデントの一貫性と適切な空白の使用を改善することで、コードの可読性が向上します。';
      }
      break;
      
    case 'naming':
      // 命名規則の詳細分析
      if (score < 5) {
        if (language === 'javascript' || language === 'typescript') {
          additionalDetails = '変数名と関数名にはキャメルケース(camelCase)、クラス名にはパスカルケース(PascalCase)を使用し、説明的な名前を選択してください。';
        } else if (language === 'python') {
          additionalDetails = '変数名と関数名にはスネークケース(snake_case)、定数にはアッパースネークケース(UPPER_SNAKE_CASE)を使用してください。';
        }
      }
      break;
      
    case 'complexity':
      // 複雑度の詳細分析
      if (score < 5) {
        additionalDetails = '関数を小さく保ち、深いネストを避け、複雑な条件をヘルパー関数や変数に分割することで、コードの複雑さを軽減できます。';
      }
      break;
      
    case 'bestPractices':
      // ベストプラクティスの詳細分析
      if (score < 5) {
        if (language === 'javascript' || language === 'typescript') {
          additionalDetails = 'console.logステートメントの削除、適切なエラー処理の追加、そして厳密な等価演算子(===)の使用を検討してください。';
        } else if (language === 'python') {
          additionalDetails = '適切な例外処理の追加、コンテキストマネージャ(with文)の使用、そして型ヒントの追加を検討してください。';
        }
      }
      break;
  }
  
  return additionalDetails ? `${basicExplanation} ${additionalDetails}` : basicExplanation;
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
    
    // コード分析を実行
    return analyzeCode(content, language);
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

/**
 * CodeBERTの分析結果から追加の問題を生成
 */
const generateIssuesFromCodeBERT = (
  scores: { 
    codeStyleScore: number; 
    namingScore: number; 
    complexityScore: number; 
    bestPracticesScore: number; 
  },
  code: string,
  language: string,
  lines: string[]
): CodeIssue[] => {
  const issues: CodeIssue[] = [];
  
  // スコアが低い場合に問題を生成
  if (scores.codeStyleScore < 6) {
    // コードスタイルの問題を検出
    const styleIssues = detectStyleIssues(code, language, lines);
    issues.push(...styleIssues);
  }
  
  if (scores.namingScore < 6) {
    // 命名規則の問題を検出
    const namingIssues = detectNamingIssues(code, language, lines);
    issues.push(...namingIssues);
  }
  
  if (scores.complexityScore < 6) {
    // 複雑度の問題を検出
    const complexityIssues = detectComplexityIssues(code, language, lines);
    issues.push(...complexityIssues);
  }
  
  if (scores.bestPracticesScore < 6) {
    // ベストプラクティスの問題を検出
    const bestPracticeIssues = detectBestPracticeIssues(code, language, lines);
    issues.push(...bestPracticeIssues);
  }
  
  return issues;
};

/**
 * コード分析を実行
 */
export const analyzeCode = async (code: string, language: string): Promise<FileAnalysisResult> => {
  try {
    console.log(`${language}コードの分析を開始...`);
    
    // 基本的なコードメトリクスを計算
    const lines = code.split('\n');
    const lineCount = lines.length;
    const commentCount = countCommentLines(lines, language);
    const functionCount = countFunctions(code, language);
    const maxNestingDepth = calculateMaxNestingDepth(code, language);
    
    // CodeBERTによる分析を試行
    try {
      console.log('WebAssembly版CodeBERTモデルによる分析を開始');
      const transformerResults = await transformersService.analyzeCodeWithCodeBERT(code);
      
      // 分析結果が得られた場合、その結果を使用
      if (transformerResults) {
        console.log('CodeBERT分析結果:', transformerResults);
        
        // 既存のヒューリスティック分析でissuesを取得
        const issues = detectIssues(code, language, lines);
        
        // CodeBERT分析に基づいて問題を追加
        const additionalIssues = generateIssuesFromCodeBERT(
          transformerResults,
          code,
          language,
          lines
        );
        
        // スコア説明を生成
        const scoreExplanations = {
          codeStyle: generateDetailedExplanation('codeStyle', transformerResults.codeStyleScore, language, code),
          naming: generateDetailedExplanation('naming', transformerResults.namingScore, language, code),
          complexity: generateDetailedExplanation('complexity', transformerResults.complexityScore, language, code),
          bestPractices: generateDetailedExplanation('bestPractices', transformerResults.bestPracticesScore, language, code)
        };
        
        return {
          fileName: 'analyzed-file',
          language,
          lineCount,
          commentCount,
          functionCount,
          complexityScore: transformerResults.complexityScore,
          codeStyleScore: transformerResults.codeStyleScore,
          namingScore: transformerResults.namingScore,
          bestPracticesScore: transformerResults.bestPracticesScore,
          maxNestingDepth,
          issues: [...issues, ...additionalIssues],
          scoreExplanations
        };
      }
    } catch (error) {
      console.warn('CodeBERT分析に失敗、フォールバック:', error);
      // エラーが発生した場合はフォールバックメソッドに進む
    }
    
    // フォールバック: 既存のヒューリスティック分析を使用
    console.log('ヒューリスティックによるフォールバック分析を使用');
    
    // コード品質スコアを計算
    const codeStyleScore = calculateCodeStyleScore(code, language);
    const namingScore = calculateNamingScore(code, language);
    const complexityScore = calculateComplexityScore(functionCount, lineCount, maxNestingDepth);
    const bestPracticesScore = calculateBestPracticesScore(code, language, commentCount, lineCount);
    
    // 問題を検出
    const issues = detectIssues(code, language, lines);
    
    // スコア説明を生成
    const scoreExplanations = {
      codeStyle: getScoreExplanation('codeStyle', codeStyleScore, language),
      naming: getScoreExplanation('naming', namingScore, language),
      complexity: getScoreExplanation('complexity', complexityScore, language),
      bestPractices: getScoreExplanation('bestPractices', bestPracticesScore, language)
    };
    
    return {
      fileName: 'analyzed-file',
      language,
      lineCount,
      commentCount,
      functionCount,
      codeStyleScore,
      namingScore,
      complexityScore,
      bestPracticesScore,
      maxNestingDepth,
      issues,
      scoreExplanations
    };
  } catch (error) {
    console.error('コード分析エラー:', error);
    throw error;
  }
};

export default {
  analyzeRepository,
  analyzeSingleFile,
  loadModel,
  analyzeCode,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_LANGUAGES
}; 