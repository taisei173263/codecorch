/**
 * 機械学習を活用したコードスタイル推奨サービス
 * コードの特徴を分析し、チーム/プロジェクト固有のスタイルガイドを自動生成・適用
 */

import * as tf from '@tensorflow/tfjs';
import { extractFeatures } from './tfService';
import { CodeAnalysisResult } from './codeAnalysisService';

// コードスタイルの分類
export enum StylePattern {
  INDENTATION = 'indentation',           // インデントスタイル
  NAMING_CONVENTION = 'naming',          // 命名規則
  SPACING = 'spacing',                   // スペースの使い方
  FORMATTING = 'formatting',             // フォーマット
  COMMENTS = 'comments',                 // コメントスタイル
  DECLARATIONS = 'declarations',         // 宣言スタイル
  LANGUAGE_FEATURES = 'language_features' // 言語機能の使用
}

// スタイルの選択肢
export interface StyleOption {
  id: string;
  name: string;
  description: string;
  example: string;
  popularity: number; // 0-100のスコア
}

// スタイルの推奨
export interface StyleRecommendation {
  pattern: StylePattern;
  options: StyleOption[];
  recommended: string; // 推奨オプションのID
  confidence: number;  // 推奨の確信度 (0-1)
  rationale: string;   // 推奨理由
}

// プロジェクトスタイルのプロファイル
export interface ProjectStyleProfile {
  language: string;
  recommendations: StyleRecommendation[];
  consistency: number; // 0-100のスコア
  customRules: string[];
}

/**
 * コードベースを分析して機械学習ベースのスタイル推奨を生成
 * @param codeFiles 分析対象のコードファイル
 * @param language プログラミング言語
 */
export const analyzeCodebaseStyle = async (
  codeFiles: {name: string; content: string}[],
  language: string
): Promise<ProjectStyleProfile> => {
  // 各ファイルの特徴を抽出
  const fileFeatures = codeFiles.map(file => {
    const analysisResult = analyzeCodeStyle(file.content, language);
    return {
      name: file.name,
      features: extractStyleFeatures(analysisResult)
    };
  });
  
  // 機械学習モデルを使用してスタイル推奨を生成
  const recommendations = await generateStyleRecommendations(fileFeatures, language);
  
  // 一貫性スコアを計算
  const consistency = calculateConsistencyScore(fileFeatures, recommendations);
  
  // カスタムルールの抽出（頻出パターンに基づく）
  const customRules = extractCustomRules(fileFeatures, language);
  
  return {
    language,
    recommendations,
    consistency,
    customRules
  };
};

/**
 * 単一ファイルのコードスタイルを分析
 */
const analyzeCodeStyle = (code: string, language: string): CodeAnalysisResult => {
  // 簡易的な実装（実際には codeAnalysisService を使用）
  return {
    score: 0,
    codeStyle: 0,
    namingConventions: 0,
    complexity: 0,
    bestPractices: 0,
    metrics: {
      lineCount: code.split('\n').length,
      commentCount: 0,
      functionCount: 0,
      complexityScore: 0,
      nestingDepth: 0
    },
    issues: []
  };
};

/**
 * コード分析から特徴ベクトルを抽出
 */
const extractStyleFeatures = (analysis: CodeAnalysisResult): number[] => {
  // 簡易的な実装
  return [
    analysis.codeStyle / 100,
    analysis.namingConventions / 100,
    analysis.bestPractices / 100,
    analysis.metrics.lineCount / 1000,
    analysis.metrics.commentCount / Math.max(1, analysis.metrics.lineCount),
    analysis.metrics.functionCount / 20
  ];
};

/**
 * スタイル推奨を生成
 */
const generateStyleRecommendations = async (
  fileFeatures: { name: string; features: number[] }[],
  language: string
): Promise<StyleRecommendation[]> => {
  // 言語に基づいたスタイル選択肢を定義
  const styleOptions = getStyleOptions(language);
  
  // 各スタイルパターンの推奨を生成
  const recommendations: StyleRecommendation[] = [];
  
  for (const pattern in styleOptions) {
    const options = styleOptions[pattern as StylePattern];
    
    // 機械学習ベースの推奨（ここでは簡易実装）
    // 実際のシステムでは、事前に訓練されたモデルを使用
    const recommendedIndex = await predictStylePreference(
      fileFeatures.map(f => f.features),
      pattern as StylePattern,
      language
    );
    
    const recommended = options[recommendedIndex].id;
    const confidence = 0.8; // 簡易実装のため固定値
    
    recommendations.push({
      pattern: pattern as StylePattern,
      options,
      recommended,
      confidence,
      rationale: generateRationale(pattern as StylePattern, recommended, confidence, language)
    });
  }
  
  return recommendations;
};

/**
 * 機械学習モデルを使用してスタイル設定を予測
 */
const predictStylePreference = async (
  features: number[][],
  pattern: StylePattern,
  language: string
): Promise<number> => {
  // 簡易実装（ランダム選択）
  // 実際のシステムでは事前訓練済みモデルを使用
  
  // 各スタイルパターンごとの特徴の重み付け
  const patternWeights: Record<StylePattern, number[]> = {
    [StylePattern.INDENTATION]: [0.8, 0.2, 0.1, 0.05, 0.1, 0.05],
    [StylePattern.NAMING_CONVENTION]: [0.3, 0.9, 0.1, 0.05, 0.1, 0.1],
    [StylePattern.SPACING]: [0.7, 0.1, 0.05, 0.1, 0.1, 0.05],
    [StylePattern.FORMATTING]: [0.6, 0.2, 0.3, 0.1, 0.1, 0.1],
    [StylePattern.COMMENTS]: [0.1, 0.1, 0.1, 0.1, 0.9, 0.1],
    [StylePattern.DECLARATIONS]: [0.3, 0.2, 0.6, 0.1, 0.1, 0.3],
    [StylePattern.LANGUAGE_FEATURES]: [0.2, 0.3, 0.4, 0.1, 0.1, 0.5]
  };
  
  // 特徴ベクトルの平均を計算
  const avgFeatures = features.reduce(
    (acc, feat) => acc.map((val, i) => val + feat[i]),
    Array(features[0].length).fill(0)
  ).map(val => val / features.length);
  
  // パターン固有の重みと特徴を掛け合わせて、スコアを導出
  const weights = patternWeights[pattern];
  const weightedScore = avgFeatures.reduce(
    (acc, feat, i) => acc + feat * weights[i],
    0
  );
  
  // 言語ごとの調整
  const languageMultiplier = language === 'typescript' ? 1.2 : 1.0;
  const adjustedScore = weightedScore * languageMultiplier;
  
  // スコアに基づいて選択肢のインデックスを決定
  const options = getStyleOptions(language)[pattern];
  const normalizedScore = Math.max(0, Math.min(1, adjustedScore));
  const index = Math.min(
    options.length - 1,
    Math.floor(normalizedScore * options.length)
  );
  
  return index;
};

/**
 * スタイル推奨の根拠を生成
 */
const generateRationale = (
  pattern: StylePattern,
  recommendedId: string,
  confidence: number,
  language: string
): string => {
  const options = getStyleOptions(language)[pattern];
  const option = options.find(opt => opt.id === recommendedId);
  
  if (!option) {
    return '推奨オプションが見つかりませんでした。';
  }
  
  // 信頼度に基づくメッセージ
  const confidenceMsg = confidence > 0.8
    ? 'コードベースの大部分がこのスタイルに従っています。'
    : confidence > 0.6
      ? 'このスタイルが最も一般的に使用されています。'
      : 'このスタイルが最も適していると思われます。';
  
  // 各パターンごとのカスタムメッセージ
  const patternMsg: Record<StylePattern, string> = {
    [StylePattern.INDENTATION]: 'インデントの一貫性はコードの可読性を大幅に向上させます。',
    [StylePattern.NAMING_CONVENTION]: '一貫した命名規則は、コードの意図を明確にします。',
    [StylePattern.SPACING]: '適切なスペースの使用はコードを読みやすくします。',
    [StylePattern.FORMATTING]: 'フォーマットの一貫性は、コードレビューを容易にします。',
    [StylePattern.COMMENTS]: '効果的なコメントスタイルは、コードの理解を助けます。',
    [StylePattern.DECLARATIONS]: '宣言スタイルの一貫性は、予測可能性を高めます。',
    [StylePattern.LANGUAGE_FEATURES]: '言語機能の適切な使用は、コードの品質と保守性を向上させます。'
  };
  
  return `${confidenceMsg} ${patternMsg[pattern]} ${option.name}は、${option.description.toLowerCase()}`;
};

/**
 * スタイルの一貫性スコアを計算
 */
const calculateConsistencyScore = (
  fileFeatures: { name: string; features: number[] }[],
  recommendations: StyleRecommendation[]
): number => {
  // 簡易実装
  // 実際のシステムでは、コードのスタイル遵守率に基づく計算
  
  // 推奨の確信度の平均を基準に
  const avgConfidence = recommendations.reduce(
    (sum, rec) => sum + rec.confidence,
    0
  ) / recommendations.length;
  
  // 0-100のスコアに変換
  return Math.round(avgConfidence * 100);
};

/**
 * カスタムルールを抽出
 */
const extractCustomRules = (
  fileFeatures: { name: string; features: number[] }[],
  language: string
): string[] => {
  // 簡易実装
  // 実際のシステムでは、コードパターンの分析に基づくルール抽出
  
  const baseRules = [
    `${language}で記述されたコードには、一貫したスタイルガイドを適用すること。`,
    'コードレビュー時にスタイルの問題を指摘する前に、自動整形ツールの使用を検討すること。'
  ];
  
  // 言語固有のルール
  if (language === 'javascript' || language === 'typescript') {
    baseRules.push('ESLintとPrettierを使用して、コードスタイルを自動的に強制すること。');
  } else if (language === 'python') {
    baseRules.push('PEP 8準拠のフォーマッターを使用すること。');
  }
  
  return baseRules;
};

/**
 * 言語別のスタイル選択肢を取得
 */
function getStyleOptions(language: string): Record<StylePattern, StyleOption[]> {
  if (language === 'javascript' || language === 'typescript') {
    return {
      [StylePattern.INDENTATION]: [
        {
          id: 'spaces_2',
          name: '2スペースインデント',
          description: '各レベルのインデントに2スペースを使用',
          example: 'function example() {\n  const x = 1;\n  if (x) {\n    return true;\n  }\n}',
          popularity: 80
        },
        {
          id: 'spaces_4',
          name: '4スペースインデント',
          description: '各レベルのインデントに4スペースを使用',
          example: 'function example() {\n    const x = 1;\n    if (x) {\n        return true;\n    }\n}',
          popularity: 15
        },
        {
          id: 'tabs',
          name: 'タブインデント',
          description: 'インデントにタブを使用',
          example: 'function example() {\n\tconst x = 1;\n\tif (x) {\n\t\treturn true;\n\t}\n}',
          popularity: 5
        }
      ],
      [StylePattern.NAMING_CONVENTION]: [
        {
          id: 'camelCase',
          name: 'キャメルケース',
          description: '変数と関数名にキャメルケースを使用',
          example: 'const myVariable = 1;\nfunction calculateTotal() { ... }',
          popularity: 90
        },
        {
          id: 'snake_case',
          name: 'スネークケース',
          description: '変数と関数名にスネークケースを使用',
          example: 'const my_variable = 1;\nfunction calculate_total() { ... }',
          popularity: 5
        },
        {
          id: 'PascalCase',
          name: 'パスカルケース',
          description: 'クラス名にパスカルケースを使用',
          example: 'class MyClass { ... }\nconst myInstance = new MyClass();',
          popularity: 5
        }
      ],
      // 他のパターンも同様に定義...
      [StylePattern.SPACING]: [
        {
          id: 'compact',
          name: 'コンパクトスペース',
          description: '最小限のスペースを使用',
          example: 'if(condition){return true;}',
          popularity: 10
        },
        {
          id: 'readable',
          name: '読みやすいスペース',
          description: '読みやすさを重視したスペース',
          example: 'if (condition) { return true; }',
          popularity: 90
        }
      ],
      [StylePattern.FORMATTING]: [],
      [StylePattern.COMMENTS]: [],
      [StylePattern.DECLARATIONS]: [],
      [StylePattern.LANGUAGE_FEATURES]: []
    };
  } else if (language === 'python') {
    return {
      [StylePattern.INDENTATION]: [
        {
          id: 'spaces_4',
          name: '4スペースインデント',
          description: 'PEP 8推奨の4スペースインデント',
          example: 'def example():\n    x = 1\n    if x:\n        return True',
          popularity: 95
        },
        {
          id: 'spaces_2',
          name: '2スペースインデント',
          description: '各レベルのインデントに2スペースを使用',
          example: 'def example():\n  x = 1\n  if x:\n    return True',
          popularity: 5
        }
      ],
      [StylePattern.NAMING_CONVENTION]: [
        {
          id: 'snake_case',
          name: 'スネークケース',
          description: 'PEP 8推奨の変数と関数名にスネークケースを使用',
          example: 'my_variable = 1\ndef calculate_total():\n    ...',
          popularity: 95
        },
        {
          id: 'camelCase',
          name: 'キャメルケース',
          description: '変数と関数名にキャメルケースを使用',
          example: 'myVariable = 1\ndef calculateTotal():\n    ...',
          popularity: 5
        }
      ],
      // 他のパターンも同様に定義...
      [StylePattern.SPACING]: [],
      [StylePattern.FORMATTING]: [],
      [StylePattern.COMMENTS]: [],
      [StylePattern.DECLARATIONS]: [],
      [StylePattern.LANGUAGE_FEATURES]: []
    };
  }
  
  // デフォルト（未サポート言語）
  return {
    [StylePattern.INDENTATION]: [],
    [StylePattern.NAMING_CONVENTION]: [],
    [StylePattern.SPACING]: [],
    [StylePattern.FORMATTING]: [],
    [StylePattern.COMMENTS]: [],
    [StylePattern.DECLARATIONS]: [],
    [StylePattern.LANGUAGE_FEATURES]: []
  };
}

/**
 * コードをプロジェクトスタイルに自動的に変換
 */
export const applyProjectStyle = (
  code: string,
  profile: ProjectStyleProfile
): string => {
  let styledCode = code;
  
  // 各推奨スタイルを適用
  for (const recommendation of profile.recommendations) {
    const option = recommendation.options.find(opt => opt.id === recommendation.recommended);
    if (!option) continue;
    
    // パターンに基づいてコードを変換
    switch (recommendation.pattern) {
      case StylePattern.INDENTATION:
        styledCode = applyIndentationStyle(styledCode, option.id, profile.language);
        break;
      case StylePattern.NAMING_CONVENTION:
        styledCode = applyNamingConvention(styledCode, option.id, profile.language);
        break;
      // 他のパターンも同様に処理...
    }
  }
  
  return styledCode;
};

/**
 * インデントスタイルを適用
 */
const applyIndentationStyle = (code: string, style: string, language: string): string => {
  // 簡易実装
  // 実際のシステムでは、ASTを使用したより高度な変換
  
  const lines = code.split('\n');
  const processedLines = [];
  
  let currentIndentLevel = 0;
  const indentChar = style.startsWith('spaces') ? ' ' : '\t';
  const indentSize = style === 'spaces_2' ? 2 : 4;
  
  for (const line of lines) {
    // 現在行のインデントレベルを取得
    const trimmedLine = line.trimLeft();
    const indentChange = getIndentChange(trimmedLine, language);
    
    // インデントを適用（簡易実装）
    currentIndentLevel = Math.max(0, currentIndentLevel + indentChange.before);
    const indent = indentChar.repeat(indentSize * currentIndentLevel);
    processedLines.push(indent + trimmedLine);
    currentIndentLevel = Math.max(0, currentIndentLevel + indentChange.after);
  }
  
  return processedLines.join('\n');
};

/**
 * 行のインデント変化を取得
 */
const getIndentChange = (line: string, language: string): { before: number; after: number } => {
  // 簡易実装
  if (language === 'javascript' || language === 'typescript') {
    const before = line.includes('}') || line.includes(')') ? -1 : 0;
    const after = line.includes('{') || line.endsWith('=>') ? 1 : 0;
    return { before, after };
  } else if (language === 'python') {
    const before = 0;
    const after = line.endsWith(':') ? 1 : 0;
    return { before, after };
  }
  
  return { before: 0, after: 0 };
};

/**
 * 命名規則を適用
 */
const applyNamingConvention = (code: string, convention: string, language: string): string => {
  // 実際のシステムでは、ASTを使用したより高度な変換
  // ここでは簡易実装のため、実装を省略
  return code;
};

/**
 * レポートを生成
 */
export const generateStyleReport = (profile: ProjectStyleProfile): string => {
  let report = `# コードスタイル推奨レポート\n\n`;
  
  report += `## 概要\n`;
  report += `- 言語: ${profile.language}\n`;
  report += `- スタイル一貫性スコア: ${profile.consistency}/100\n\n`;
  
  report += `## スタイル推奨\n`;
  for (const recommendation of profile.recommendations) {
    if (recommendation.options.length === 0) continue;
    
    const option = recommendation.options.find(opt => opt.id === recommendation.recommended);
    if (!option) continue;
    
    report += `### ${getPatternName(recommendation.pattern)}\n`;
    report += `- 推奨: **${option.name}**\n`;
    report += `- 確信度: ${Math.round(recommendation.confidence * 100)}%\n`;
    report += `- 説明: ${recommendation.rationale}\n`;
    report += `- 例:\n\`\`\`\n${option.example}\n\`\`\`\n\n`;
  }
  
  report += `## カスタムルール\n`;
  profile.customRules.forEach(rule => {
    report += `- ${rule}\n`;
  });
  
  return report;
};

/**
 * パターン名を取得
 */
const getPatternName = (pattern: StylePattern): string => {
  const names = {
    [StylePattern.INDENTATION]: 'インデントスタイル',
    [StylePattern.NAMING_CONVENTION]: '命名規則',
    [StylePattern.SPACING]: 'スペースの使い方',
    [StylePattern.FORMATTING]: 'フォーマット',
    [StylePattern.COMMENTS]: 'コメントスタイル',
    [StylePattern.DECLARATIONS]: '宣言スタイル',
    [StylePattern.LANGUAGE_FEATURES]: '言語機能の使用'
  };
  
  return names[pattern] || pattern;
}; 