/**
 * コード改善サービス
 * コード品質の詳細な説明と改善提案を生成する機能を提供します
 */

import * as tf from '@tensorflow/tfjs';
import { predictCodeQuality, predictCodeStyle, extractCodeImprovementFeatures } from './tfService';
import { calculateFunctionMetrics, extractFunctions } from './complexityVisualizationService';

// 詳細なスコア説明の型定義
export interface DetailedScoreExplanation {
  codeStyle: CategoryExplanation;
  naming: CategoryExplanation;
  complexity: CategoryExplanation;
  bestPractices: CategoryExplanation;
}

// カテゴリ説明の型定義
export interface CategoryExplanation {
  score: number;            // スコア（0-10）
  explanation: string;      // 説明
  specificIssues: CodeIssue[]; // 特定の問題
  improvementPoints: string[]; // 改善点
}

// コード問題の型定義
export interface CodeIssue {
  type: string;                // 問題タイプ
  severity: 'low' | 'medium' | 'high'; // 重要度
  message: string;             // 説明メッセージ
  line: number;                // 問題のある行
  column?: number;             // 問題のある列
  suggestion?: string;         // 修正の提案
  codeContext?: string;        // 問題のあるコード周辺のコンテキスト
  id?: string;                 // 問題の一意識別子
  filePosition?: {             // ファイル内の正確な位置
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

// コード改善提案の型定義
export interface CodeImprovement {
  originalIssue: CodeIssue;
  suggestion: string;
  improvedCode: string;
  originalCode: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedImpact: 'low' | 'medium' | 'high';
  implementationSteps?: string[];
  additionalResources?: string[];
  potentialRisks?: string[];
  isExpanded?: boolean;        // UIでの展開状態
}

// コード改善UI表示のためのインターフェース
export interface ImprovementUIData {
  allImprovements: CodeImprovement[];
  groupedByType: {
    [key: string]: CodeImprovement[];
  };
  groupedBySeverity: {
    high: CodeImprovement[];
    medium: CodeImprovement[];
    low: CodeImprovement[];
  };
  totalCount: number;
  expandedCount: number;
  toggleExpand: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
}

// 問題タイプ別の改善パターン定義
export interface ImprovementPattern {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
  description: string;
  example: {
    before: string;
    after: string;
  };
  difficultyWeight: number; // 0-10 (10が最も難しい)
  impactWeight: number;     // 0-10 (10が最も影響が大きい)
}

// 問題タイプ別の改善テンプレート
export interface ImprovementTemplate {
  suggestion: string;
  explanation: string;
  patterns: Record<string, ImprovementPattern[]>;
  difficultyFactors: {
    codeSize: number;      // 影響を受けるコード行数の係数
    complexity: number;    // コード複雑性の係数
    dependencies: number;  // 依存関係の係数
  };
  impactFactors: {
    functionality: number; // 機能への影響係数
    readability: number;   // 可読性への影響係数
    maintenance: number;   // 保守性への影響係数
    performance: number;   // パフォーマンスへの影響係数
  };
  implementationGuide?: string[];
  resources?: Record<string, string[]>;
}

/**
 * 詳細なスコア説明を生成
 */
export const generateDetailedExplanation = async (
  fileResult: {
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
  },
  code: string
): Promise<DetailedScoreExplanation> => {
  // 各カテゴリの問題を抽出
  const codeStyleIssues = fileResult.issues.filter(i => i.type === 'code_style');
  const namingIssues = fileResult.issues.filter(i => i.type === 'naming');
  const complexityIssues = fileResult.issues.filter(i => i.type === 'complexity');
  const bestPracticesIssues = fileResult.issues.filter(i => i.type === 'best_practice');
  
  // 改善点を生成
  const codeStyleImprovements = generateImprovementSuggestions(fileResult);
  const namingImprovements = generateImprovementSuggestions(fileResult);
  const complexityImprovements = generateImprovementSuggestions(fileResult);
  const bestPracticesImprovements = generateImprovementSuggestions(fileResult);
  
  return {
    codeStyle: {
      score: fileResult.codeStyleScore,
      explanation: fileResult.scoreExplanations.codeStyle,
      specificIssues: codeStyleIssues,
      improvementPoints: codeStyleImprovements
    },
    naming: {
      score: fileResult.namingScore,
      explanation: fileResult.scoreExplanations.naming,
      specificIssues: namingIssues,
      improvementPoints: namingImprovements
    },
    complexity: {
      score: fileResult.complexityScore,
      explanation: fileResult.scoreExplanations.complexity,
      specificIssues: complexityIssues,
      improvementPoints: complexityImprovements
    },
    bestPractices: {
      score: fileResult.bestPracticesScore,
      explanation: fileResult.scoreExplanations.bestPractices,
      specificIssues: bestPracticesIssues,
      improvementPoints: bestPracticesImprovements
    }
  };
};

/**
 * 改善提案を生成
 */
export const generateImprovementSuggestions = (
  fileResult: {
    language: string;
    lineCount: number;
    commentCount: number;
    functionCount: number;
    complexityScore: number;
    maxNestingDepth: number;
    codeStyleScore: number;
    namingScore: number;
    bestPracticesScore: number;
    fileName?: string;
  }
): string[] => {
  const { language } = fileResult;
  const suggestions: string[] = [];
  
  // コードスタイルの改善提案
  if (fileResult.codeStyleScore < 70) {
    suggestions.push('一貫したインデントとスペースを使用してください。');
    suggestions.push('適切な行の長さを維持してください（80〜100文字が推奨）。');
    
    if (language === 'javascript' || language === 'typescript') {
      suggestions.push('セミコロンの使用を一貫させてください。');
      suggestions.push('一貫した引用符スタイル（シングルまたはダブル）を使用してください。');
    } else if (language === 'python') {
      suggestions.push('PEP 8スタイルガイドに従ってください。');
      suggestions.push('インデントには4つのスペースを使用してください。');
    }
  }
  
  // 命名規則の改善提案
  if (fileResult.namingScore < 70) {
    suggestions.push('説明的で意味のある名前を使用してください。');
    suggestions.push('一貫した命名規則を使用してください。');
    
    if (language === 'javascript' || language === 'typescript') {
      suggestions.push('変数と関数にはキャメルケース（camelCase）を使用してください。');
      suggestions.push('クラスにはパスカルケース（PascalCase）を使用してください。');
      suggestions.push('定数には大文字のスネークケース（UPPER_SNAKE_CASE）を使用してください。');
    } else if (language === 'python') {
      suggestions.push('変数と関数にはスネークケース（snake_case）を使用してください。');
      suggestions.push('クラスにはパスカルケース（PascalCase）を使用してください。');
      suggestions.push('定数には大文字のスネークケース（UPPER_SNAKE_CASE）を使用してください。');
    }
  }
  
  // 複雑度の改善提案
  if (fileResult.complexityScore < 70) {
    suggestions.push('関数を小さく、一つの責任に焦点を当てるようにしてください。');
    suggestions.push('深いネストを避けてください。早期リターンパターンを検討してください。');
    suggestions.push('条件分岐を単純化してください。');
    
    if (fileResult.maxNestingDepth > 3) {
      suggestions.push(`ネストの深さが${fileResult.maxNestingDepth}レベルあります。3レベル以下に抑えることを目指してください。`);
    }
  }
  
  // ベストプラクティスの改善提案
  if (fileResult.bestPracticesScore < 70) {
    suggestions.push('コメントを追加して、複雑なロジックを説明してください。');
    suggestions.push('マジックナンバーを避け、定数を使用してください。');
    
    if (language === 'javascript' || language === 'typescript') {
      suggestions.push('== の代わりに === を使用してください。');
      suggestions.push('使用されていない変数を削除してください。');
      suggestions.push('グローバル変数の使用を避けてください。');
      suggestions.push('var の代わりに let と const を使用してください。');
    } else if (language === 'python') {
      suggestions.push('with 文の使用を避けてください。');
      suggestions.push('リスト内包表記を使用して、簡潔なコードを書いてください。');
      suggestions.push('try/except ブロックで具体的な例外をキャッチしてください。');
    }
    
    suggestions.push('コードの再利用性を高めるために、重複をなくしてください。');
    suggestions.push('早期リターンパターンを使用して、ネストを減らしてください。');
  }
  
  // ファイルタイプに基づく特定の提案
  if (fileResult.fileName && (fileResult.fileName.endsWith('.tsx') || fileResult.fileName.endsWith('.jsx'))) {
    suggestions.push('コンポーネントの責任を単一の目的に限定してください。');
    suggestions.push('ロジックをカスタムフックに抽出して、コンポーネントをシンプルに保ってください。');
  }
  
  // 重複を削除
  return [...new Set(suggestions)];
};

/**
 * コード改善提案を生成するサービス
 * AIを活用して具体的な改善案とサンプルコードを提供
 */

/**
 * 具体的なコード改善提案を生成
 * @param code 分析対象のコード全体
 * @param language プログラミング言語
 * @param issues 検出された問題
 */
export const generateCodeImprovements = async (
  code: string,
  language: string,
  issues: CodeIssue[]
): Promise<CodeImprovement[]> => {
  try {
    const lines = code.split('\n');
    const improvements: CodeImprovement[] = [];
    
    // IDが未設定の問題にIDを割り当て
    const issuesWithIds = issues.map((issue, index) => ({
      ...issue,
      id: issue.id || `issue-${index}`
    }));
    
    // コード分析情報を抽出（機械学習モデルのための特徴量）
    const codeFeatures = await extractCodeImprovementFeatures(code, language);
    const functions = extractFunctions(code, language);
    const functionMetrics = functions.map(fn => calculateFunctionMetrics(fn.code, language));
    
    // 各問題に対して個別に改善提案を生成
    for (const issue of issuesWithIds) {
      // 問題位置のコンテキストを特定
      const contextStartLine = Math.max(0, issue.line - 5);
      const contextEndLine = Math.min(lines.length, issue.line + 5);
      const codeContext = lines.slice(contextStartLine, contextEndLine).join('\n');
      
      // 問題行のインデックスを正確に特定
      const problemLineIndex = issue.line - contextStartLine - 1;
      
      // コンテキストを更新
      const issueWithContext = {
        ...issue,
        codeContext
      };
      
      // 問題に関連する関数を特定
      const relatedFunction = functions.find(fn => 
        fn.startLine <= issue.line && fn.endLine >= issue.line
      );
      
      // 関数の複雑度メトリクスを取得
      let complexity = 1;
      if (relatedFunction) {
        const metrics = functionMetrics.find(m => {
          // メトリクスオブジェクトにnameプロパティがある場合
          if ('name' in m && m.name === relatedFunction.name) {
            return true;
          }
          // メトリクスオブジェクトにrangeプロパティがある場合
          if ('range' in m && m.range && m.range.startLine === relatedFunction.startLine) {
            return true;
          }
          return false;
        });
        
        if (metrics && 'cyclomaticComplexity' in metrics) {
          complexity = metrics.cyclomaticComplexity || 1;
        }
      }
      
      // 改善提案を生成
      const improvement = await generateImprovement(
        issueWithContext,
        language,
        codeFeatures,
        complexity
      );
      
      // 問題の行を強調表示するための変更
      const originalLines = codeContext.split('\n');
      if (problemLineIndex >= 0 && problemLineIndex < originalLines.length) {
        // 問題行をハイライト
        originalLines[problemLineIndex] = `${originalLines[problemLineIndex]} /* ← この行に問題があります */`;
      }
      const highlightedContext = originalLines.join('\n');
      
      // 難易度と影響度を計算
      const difficulty = calculateDifficulty(
        issueWithContext, 
        improvement, 
        complexity,
        relatedFunction ? relatedFunction.code.split('\n').length : 10
      );
      
      const impact = calculateImpact(
        issueWithContext, 
        improvement, 
        codeFeatures
      );
      
      // 実装手順を生成
      const implementationSteps = generateImplementationSteps(
        issueWithContext,
        improvement,
        language
      );
      
      // 追加リソースと潜在的なリスクを生成
      const additionalResources = generateAdditionalResources(
        issueWithContext.type,
        language
      );
      
      const potentialRisks = generatePotentialRisks(
        issueWithContext,
        improvement
      );
      
      // 改善提案を追加
      improvements.push({
        originalIssue: issueWithContext,
        suggestion: improvement.suggestion,
        improvedCode: improvement.improvedCode,
        originalCode: highlightedContext,
        explanation: improvement.explanation,
        difficulty,
        estimatedImpact: impact,
        implementationSteps,
        additionalResources,
        potentialRisks,
        isExpanded: false // デフォルトは折りたたみ状態
      });
    }
    
    return improvements;
  } catch (error) {
    console.error('コード改善提案の生成中にエラーが発生しました:', error);
    return [];
  }
};

/**
 * 改善提案のUI表示データを準備
 */
export const prepareImprovementUIData = (improvements: CodeImprovement[]): ImprovementUIData => {
  // 問題タイプ別にグループ化
  const groupedByType: { [key: string]: CodeImprovement[] } = {};
  improvements.forEach(improvement => {
    const type = improvement.originalIssue.type;
    if (!groupedByType[type]) {
      groupedByType[type] = [];
    }
    groupedByType[type].push(improvement);
  });
  
  // 重要度別にグループ化
  const groupedBySeverity: { high: CodeImprovement[], medium: CodeImprovement[], low: CodeImprovement[] } = {
    high: improvements.filter(imp => imp.originalIssue.severity === 'high'),
    medium: improvements.filter(imp => imp.originalIssue.severity === 'medium'),
    low: improvements.filter(imp => imp.originalIssue.severity === 'low')
  };
  
  // 展開状態の制御関数
  const toggleExpand = (id: string) => {
    const improvement = improvements.find(imp => imp.originalIssue.id === id);
    if (improvement) {
      improvement.isExpanded = !improvement.isExpanded;
    }
  };
  
  const expandAll = () => {
    improvements.forEach(imp => imp.isExpanded = true);
  };
  
  const collapseAll = () => {
    improvements.forEach(imp => imp.isExpanded = false);
  };
  
  return {
    allImprovements: improvements,
    groupedByType,
    groupedBySeverity,
    totalCount: improvements.length,
    expandedCount: improvements.filter(imp => imp.isExpanded).length,
    toggleExpand,
    expandAll,
    collapseAll
  };
};

/**
 * 詳細な改善提案を生成
 */
const generateImprovement = async (
  issue: CodeIssue,
  language: string,
  codeFeatures: any,
  complexity: number
): Promise<{ suggestion: string; improvedCode: string; explanation: string }> => {
  // 改善テンプレートを取得
  const template = getImprovementTemplate(issue.type);
  
  // 言語に基づいて適切なパターンを選択
  const languageKey = language.toLowerCase() as keyof typeof template.patterns;
  const patterns = template.patterns[languageKey] || [];
  
  if (patterns.length === 0) {
    return {
      suggestion: issue.suggestion || 'コードを改善する',
      improvedCode: issue.codeContext || '',
      explanation: '言語や問題タイプに基づいた具体的な提案は利用できません。'
    };
  }
  
  // 改善パターンを適用
  let improvedCode = issue.codeContext || '';
  let matchedPattern: ImprovementPattern | null = null;
  
  for (const pattern of patterns) {
    const newCode = improvedCode.replace(pattern.pattern, pattern.replacement as any);
    if (newCode !== improvedCode) {
      improvedCode = newCode;
      matchedPattern = pattern;
      break;
    }
  }
  
  // パターンがマッチしなかった場合は一般的な改善例を使用
  if (!matchedPattern) {
    matchedPattern = patterns[0];
    const lines = (issue.codeContext || '').split('\n');
    const problemLineIndex = Math.min(5, lines.length - 1); // デフォルトは中央付近
    
    // 改善を適用したコードを生成
    const improvedLines = [...lines];
    
    // 問題行を含むコンテキストから、改善例を生成
    improvedLines[problemLineIndex] = `// ${lines[problemLineIndex]} -> 以下のように修正:`;
    improvedLines[problemLineIndex + 1] = createGenericImprovement(lines[problemLineIndex], issue.type, language);
    
    improvedCode = improvedLines.join('\n');
  }
  
  // 具体的な説明を生成
  const explanation = generateExplanation(issue, matchedPattern, language, complexity);
  
  return {
    suggestion: template.suggestion,
    improvedCode,
    explanation
  };
};

/**
 * 特定の問題行に対する一般的な改善例を生成
 */
const createGenericImprovement = (line: string, issueType: string, language: string): string => {
  // 問題タイプに応じた一般的な改善を返す
  switch (issueType) {
    case 'style':
      // スタイル問題に対する一般的な改善
      if (language === 'javascript' || language === 'typescript') {
        return line.trim().replace(/\s{2,}/g, ' ').replace(/([{(])/, ' $1 ').replace(/([})])/, ' $1 ');
      } else if (language === 'python') {
        return line.trim().replace(/\s{2,}/g, ' ').replace(/(\w)\=(\w)/g, '$1 = $2');
      }
      break;
      
    case 'naming':
      // 命名問題に対する一般的な改善
      const shortVarPattern = /\b([a-z]{1,2})\b(?!\()/g;
      if (language === 'javascript' || language === 'typescript') {
        return line.replace(shortVarPattern, 'descriptiveVar');
      } else if (language === 'python') {
        return line.replace(shortVarPattern, 'descriptive_var');
      }
      break;
      
    case 'complexity':
      // 複雑度問題に対する一般的な改善
      if (line.includes('if') && line.includes('else')) {
        return '// 条件式を簡素化: 三項演算子や早期リターンを検討';
      } else if (line.includes('for') || line.includes('while')) {
        return '// ループを簡素化: 高階関数や配列メソッドの使用を検討';
      }
      break;
      
    case 'bestPractices':
      // ベストプラクティス問題に対する一般的な改善
      if (language === 'javascript' || language === 'typescript') {
        if (line.includes('var ')) {
          return line.replace(/var /g, 'const ');
        } else if (line.includes('==')) {
          return line.replace(/==/g, '===');
        }
      } else if (language === 'python') {
        if (line.includes('except:')) {
          return line.replace('except:', 'except Exception:');
        }
      }
      break;
  }
  
  // デフォルトの改善例
  return `// この行を改善: ${issueType}タイプの問題に応じて修正してください`;
};

/**
 * 詳細な説明を生成
 */
const generateExplanation = (
  issue: CodeIssue,
  pattern: ImprovementPattern,
  language: string,
  complexity: number
): string => {
  const baseExplanation = `【問題】 ${issue.message}

【改善点】 ${pattern.description}

【改善例】
修正前:
\`\`\`${language}
${pattern.example.before}
\`\`\`

修正後:
\`\`\`${language}
${pattern.example.after}
\`\`\`

【解説】
この修正は${complexity > 5 ? '複雑度の高い' : '比較的シンプルな'}コードに対するものです。
${issue.severity === 'high' 
  ? '高い重大度の問題を修正することで、コードの品質が大幅に向上します。' 
  : issue.severity === 'medium'
    ? '中程度の重大度の問題を修正することで、コードの品質が向上します。'
    : '軽度の問題ですが、修正することでコードの一貫性と可読性が向上します。'
}`;

  return baseExplanation;
};

/**
 * 改善の難易度を計算
 */
const calculateDifficulty = (
  issue: CodeIssue,
  improvement: { suggestion: string; improvedCode: string; explanation: string },
  complexity: number,
  functionSize: number
): 'easy' | 'medium' | 'hard' => {
  // テンプレートの難易度係数を取得
  const template = getImprovementTemplate(issue.type);
  const { codeSize, complexity: complexityFactor, dependencies } = template.difficultyFactors;
  
  // 変更の規模を計算
  const originalLines = issue.codeContext?.split('\n').length || 1;
  const improvedLines = improvement.improvedCode.split('\n').length;
  const changeSize = Math.abs(improvedLines - originalLines) / originalLines;
  
  // 複雑さの要素を考慮
  const complexityScore = complexity * complexityFactor;
  
  // 関数サイズの影響
  const sizeScore = functionSize * codeSize * 0.1;
  
  // 依存関係の影響（簡易的に計算）
  const dependencyScore = (issue.codeContext?.includes('import') ? 5 : 0) * dependencies;
  
  // 総合スコアを計算
  const severityWeight = { high: 3, medium: 2, low: 1 }[issue.severity];
  const totalScore = complexityScore + sizeScore + dependencyScore + changeSize * 10 + severityWeight;
  
  // スコアに基づいて難易度を判定
  if (totalScore > 10) {
    return 'hard';
  } else if (totalScore > 5) {
    return 'medium';
  }
  
  return 'easy';
};

/**
 * 改善の影響度を計算
 */
const calculateImpact = (
  issue: CodeIssue,
  improvement: { suggestion: string; improvedCode: string; explanation: string },
  codeFeatures: any
): 'low' | 'medium' | 'high' => {
  // テンプレートの影響度係数を取得
  const template = getImprovementTemplate(issue.type);
  const { functionality, readability, maintenance, performance } = template.impactFactors;
  
  // 問題の重要度に基づく基本スコア
  const severityScore = { high: 7, medium: 4, low: 2 }[issue.severity];
  
  // 機能への影響
  const functionalityScore = (issue.type === 'security' || issue.type === 'bestPractices') 
    ? functionality * 10 : functionality * 5;
  
  // 可読性への影響
  const readabilityScore = (issue.type === 'style' || issue.type === 'naming') 
    ? readability * 10 : readability * 5;
  
  // 保守性への影響
  const maintenanceScore = (issue.type === 'complexity' || issue.type === 'bestPractices') 
    ? maintenance * 10 : maintenance * 5;
  
  // パフォーマンスへの影響
  const performanceScore = (issue.type === 'performance' || issue.type === 'complexity') 
    ? performance * 10 : performance * 3;
  
  // 総合スコアを計算
  const totalScore = severityScore + functionalityScore + readabilityScore + 
                    maintenanceScore + performanceScore;
  
  // スコアに基づいて影響度を判定
  if (totalScore > 15) {
    return 'high';
  } else if (totalScore > 8) {
    return 'medium';
  }
  
  return 'low';
};

/**
 * 実装手順を生成
 */
const generateImplementationSteps = (
  issue: CodeIssue,
  improvement: { suggestion: string; improvedCode: string; explanation: string },
  language: string
): string[] => {
  const template = getImprovementTemplate(issue.type);
  const baseSteps = template.implementationGuide || [];
  
  // 問題タイプと言語に応じたカスタムステップ
  const customSteps: string[] = [];
  
  if (issue.type === 'style') {
    if (language === 'javascript' || language === 'typescript') {
      customSteps.push('ESLintとPrettierを設定してコードスタイルを自動的に強制する');
    } else if (language === 'python') {
      customSteps.push('Blackフォーマッターを使用して一貫したスタイルを適用する');
    }
  } else if (issue.type === 'complexity') {
    customSteps.push('関数を小さく保ち、単一の責任を持たせる');
    customSteps.push('深いネストを避け、早期リターンパターンを使用する');
  }
  
  return [...baseSteps, ...customSteps];
};

/**
 * 追加リソースを生成
 */
const generateAdditionalResources = (type: string, language: string): string[] => {
  const template = getImprovementTemplate(type);
  const languageKey = language.toLowerCase() as keyof typeof template.resources;
  
  // テンプレートに言語固有のリソースがあればそれを使用
  if (template.resources && template.resources[languageKey]) {
    return template.resources[languageKey];
  }
  
  // 言語に応じたデフォルトリソース
  const defaultResources: Record<string, string[]> = {
    javascript: [
      'JavaScript - MDN Web Docs: https://developer.mozilla.org/ja/docs/Web/JavaScript',
      'Airbnb JavaScript スタイルガイド: https://github.com/airbnb/javascript'
    ],
    typescript: [
      'TypeScript ハンドブック: https://www.typescriptlang.org/docs/',
      'TypeScript Deep Dive: https://basarat.gitbook.io/typescript/'
    ],
    python: [
      'Python 公式ドキュメント: https://docs.python.org/',
      'PEP 8 - Style Guide for Python Code: https://www.python.org/dev/peps/pep-0008/'
    ]
  };
  
  return defaultResources[languageKey as keyof typeof defaultResources] || [];
};

/**
 * 潜在的なリスクを生成
 */
const generatePotentialRisks = (
  issue: CodeIssue,
  improvement: { suggestion: string; improvedCode: string; explanation: string }
): string[] => {
  const risks: string[] = [];
  
  // 問題タイプに応じたリスク
  if (issue.type === 'style' || issue.type === 'naming') {
    risks.push('既存のコードベースとの一貫性が保たれない可能性があります');
  } else if (issue.type === 'complexity') {
    risks.push('リファクタリングにより新たなバグが導入される可能性があります');
    risks.push('テストカバレッジが不十分な場合、変更によって未検出の問題が発生する可能性があります');
  } else if (issue.type === 'bestPractices') {
    risks.push('新しいパターンの採用により、学習コストが発生する可能性があります');
  }
  
  // 共通のリスク
  risks.push('変更がプロジェクトの他の部分に予期しない影響を与える可能性があります');
  
  return risks;
};

/**
 * 問題タイプに応じた改善テンプレートを取得
 */
const getImprovementTemplate = (type: string): ImprovementTemplate => {
  const templates: Record<string, ImprovementTemplate> = {
    style: {
      suggestion: '一貫したコードスタイルを適用する',
      explanation: 'コードスタイルの一貫性は可読性を高め、保守を容易にします。',
      patterns: {
        javascript: [
          {
            pattern: /\s{2,}\/\//g,
            replacement: '// ',
            description: 'コメントの前には1つのスペースを使用します',
            example: {
              before: 'const x = 5;   // 値の初期化',
              after: 'const x = 5; // 値の初期化'
            },
            difficultyWeight: 1,
            impactWeight: 3
          },
          {
            pattern: /if\s*\(/g,
            replacement: 'if (',
            description: 'if文の後には1つのスペースを使用します',
            example: {
              before: 'if(condition) {',
              after: 'if (condition) {'
            },
            difficultyWeight: 1,
            impactWeight: 3
          },
          {
            pattern: /}\s*else/g,
            replacement: '} else',
            description: 'else文の前には1つのスペースを使用します',
            example: {
              before: '}else {',
              after: '} else {'
            },
            difficultyWeight: 1,
            impactWeight: 3
          },
          {
            pattern: /([a-zA-Z0-9])\=([a-zA-Z0-9])/g,
            replacement: '$1 = $2',
            description: '演算子の前後にはスペースを使用します',
            example: {
              before: 'const x=5;',
              after: 'const x = 5;'
            },
            difficultyWeight: 1,
            impactWeight: 3
          }
        ],
        typescript: [
          {
            pattern: /\s{2,}\/\//g,
            replacement: '// ',
            description: 'コメントの前には1つのスペースを使用します',
            example: {
              before: 'const x: number = 5;   // 値の初期化',
              after: 'const x: number = 5; // 値の初期化'
            },
            difficultyWeight: 1,
            impactWeight: 3
          },
          {
            pattern: /:\s*([a-zA-Z]+)\s*;/g,
            replacement: ': $1;',
            description: '型注釈のコロンの後には1つのスペースを使用します',
            example: {
              before: 'const x:number;',
              after: 'const x: number;'
            },
            difficultyWeight: 1,
            impactWeight: 3
          }
        ],
        python: [
          {
            pattern: /#[^\s]/g,
            replacement: '# ',
            description: 'コメントの#の後には1つのスペースを使用します',
            example: {
              before: 'x = 5 #値の初期化',
              after: 'x = 5 # 値の初期化'
            },
            difficultyWeight: 1,
            impactWeight: 3
          },
          {
            pattern: /([a-zA-Z0-9])\=([a-zA-Z0-9])/g,
            replacement: '$1 = $2',
            description: '演算子の前後にはスペースを使用します',
            example: {
              before: 'x=5',
              after: 'x = 5'
            },
            difficultyWeight: 1,
            impactWeight: 3
          }
        ]
      },
      difficultyFactors: {
        codeSize: 0.2,
        complexity: 0.1,
        dependencies: 0.1
      },
      impactFactors: {
        functionality: 0.1,
        readability: 0.8,
        maintenance: 0.5,
        performance: 0.1
      },
      implementationGuide: [
        'コードスタイリングツール（ESLint, Prettier, Black等）を導入する',
        'IDE内の自動フォーマット機能を使用する',
        'チーム全体で一貫したスタイルガイドを共有する'
      ],
      resources: {
        javascript: [
          'https://eslint.org/docs/rules/',
          'https://prettier.io/docs/en/'
        ],
        typescript: [
          'https://www.typescriptlang.org/docs/handbook/coding-style.html',
          'https://typescript-eslint.io/rules/'
        ],
        python: [
          'https://www.python.org/dev/peps/pep-0008/',
          'https://black.readthedocs.io/en/stable/'
        ]
      }
    },
    
    naming: {
      suggestion: '明確で記述的な命名を使用する',
      explanation: '意味のある変数名と関数名はコードの自己文書化を助け、理解を容易にします。',
      patterns: {
        javascript: [
          {
            pattern: /var\s+([a-z])\s*=/g,
            replacement: 'var descriptiveVar =',
            description: '単一文字の変数名は避け、意味を持つ名前を使用します',
            example: {
              before: 'var x = getTotal();',
              after: 'var totalAmount = getTotal();'
            },
            difficultyWeight: 3,
            impactWeight: 7
          },
          {
            pattern: /function\s+([a-z]{1,2})\s*\(/g,
            replacement: 'function descriptiveFunction(',
            description: '関数名は動詞を含み、その目的を明確にします',
            example: {
              before: 'function fn(data) { /* ... */ }',
              after: 'function processData(data) { /* ... */ }'
            },
            difficultyWeight: 4,
            impactWeight: 8
          }
        ],
        typescript: [
          {
            pattern: /const\s+([a-z])\s*:/g,
            replacement: 'const descriptiveVar:',
            description: '単一文字の変数名は避け、意味を持つ名前を使用します',
            example: {
              before: 'const n: number = items.length;',
              after: 'const itemCount: number = items.length;'
            },
            difficultyWeight: 3,
            impactWeight: 7
          }
        ],
        python: [
          {
            pattern: /def\s+([a-z]{1,2})\s*\(/g,
            replacement: 'def descriptive_function(',
            description: '関数名はスネークケースで、その目的を明確にします',
            example: {
              before: 'def fn(data):',
              after: 'def process_data(data):'
            },
            difficultyWeight: 4,
            impactWeight: 8
          }
        ]
      },
      difficultyFactors: {
        codeSize: 0.5,
        complexity: 0.3,
        dependencies: 0.7
      },
      impactFactors: {
        functionality: 0.2,
        readability: 0.9,
        maintenance: 0.8,
        performance: 0.1
      },
      implementationGuide: [
        '変数名や関数名は目的を明確に表す',
        '一般的な略語を除き、略語は避ける',
        '命名規則（キャメルケース、スネークケース等）を一貫して使用する',
        'チーム内でコーディング規約を共有する'
      ]
    },
    
    complexity: {
      suggestion: 'コードの複雑さを減らす',
      explanation: '複雑さを減らすことでバグの可能性を減らし、コードの理解と保守が容易になります。',
      patterns: {
        javascript: [
          {
            pattern: /if\s*\((.+)\)\s*{\s*return\s+(.+);\s*}\s*else\s*{\s*return\s+(.+);\s*}/g,
            replacement: 'return $1 ? $2 : $3;',
            description: '単純な条件付きリターンは三項演算子で書けます',
            example: {
              before: 'if (condition) {\n  return value1;\n} else {\n  return value2;\n}',
              after: 'return condition ? value1 : value2;'
            },
            difficultyWeight: 3,
            impactWeight: 5
          },
          {
            pattern: /for\s*\(let\s+i.+\)\s*{\s*(.+\s*=.+\s*i.+)\s*}/g,
            replacement: '// 配列メソッドを使用\narr.forEach((item, index) => {\n  // 配列要素を処理\n});',
            description: 'for文より配列メソッドを使用するとより宣言的で読みやすいコードになります',
            example: {
              before: 'for (let i = 0; i < items.length; i++) {\n  processItem(items[i]);\n}',
              after: 'items.forEach(item => {\n  processItem(item);\n});'
            },
            difficultyWeight: 5,
            impactWeight: 6
          },
          {
            pattern: /if\s*\((.+)\)\s*{\s*if\s*\((.+)\)\s*{/g,
            replacement: 'if ($1 && $2) {',
            description: 'ネストされた条件はAND演算子で結合できます',
            example: {
              before: 'if (condition1) {\n  if (condition2) {\n    // 処理\n  }\n}',
              after: 'if (condition1 && condition2) {\n  // 処理\n}'
            },
            difficultyWeight: 4,
            impactWeight: 7
          }
        ],
        typescript: [
          {
            pattern: /if\s*\((.+)\)\s*{\s*return\s+(.+);\s*}\s*else\s*{\s*return\s+(.+);\s*}/g,
            replacement: 'return $1 ? $2 : $3;',
            description: '単純な条件付きリターンは三項演算子で書けます',
            example: {
              before: 'if (condition) {\n  return value1;\n} else {\n  return value2;\n}',
              after: 'return condition ? value1 : value2;'
            },
            difficultyWeight: 3,
            impactWeight: 5
          }
        ],
        python: [
          {
            pattern: /if\s+(.+):\s*\n\s*return\s+(.+)\s*\n\s*else:\s*\n\s*return\s+(.+)/g,
            replacement: 'return $2 if $1 else $3',
            description: '単純な条件付きリターンは条件式を使えます',
            example: {
              before: 'if condition:\n    return value1\nelse:\n    return value2',
              after: 'return value1 if condition else value2'
            },
            difficultyWeight: 3,
            impactWeight: 5
          }
        ]
      },
      difficultyFactors: {
        codeSize: 0.7,
        complexity: 0.8,
        dependencies: 0.6
      },
      impactFactors: {
        functionality: 0.6,
        readability: 0.7,
        maintenance: 0.9,
        performance: 0.5
      },
      implementationGuide: [
        '関数を小さく保ち、単一責任の原則に従う',
        '早期リターンパターンを使用してネストを減らす',
        '条件文を簡素化する',
        '複雑なロジックは個別の関数に分割する',
        'ガード節パターンを使用する'
      ]
    },
    
    bestPractices: {
      suggestion: '言語のベストプラクティスを適用する',
      explanation: 'ベストプラクティスの適用は予期しない問題を防ぎ、コードの品質を向上させます。',
      patterns: {
        javascript: [
          {
            pattern: /var\s+/g,
            replacement: 'const ',
            description: 'varの代わりにconstまたはletを使用します',
            example: {
              before: 'var x = 5;',
              after: 'const x = 5;'
            },
            difficultyWeight: 2,
            impactWeight: 6
          },
          {
            pattern: /([a-zA-Z0-9_]+)\s*==\s*([a-zA-Z0-9_]+)/g,
            replacement: '$1 === $2',
            description: '厳密等価演算子(===)を使用します',
            example: {
              before: 'if (x == null)',
              after: 'if (x === null)'
            },
            difficultyWeight: 2,
            impactWeight: 7
          }
        ],
        typescript: [
          {
            pattern: /:\s*any\b/g,
            replacement: ': unknown',
            description: 'anyの代わりに、より型安全なunknownを使用します',
            example: {
              before: 'function process(data: any) {',
              after: 'function process(data: unknown) {'
            },
            difficultyWeight: 4,
            impactWeight: 8
          }
        ],
        python: [
          {
            pattern: /except:\s*\n/g,
            replacement: 'except Exception:\n',
            description: '具体的な例外クラスをキャッチします',
            example: {
              before: 'try:\n    process()\nexcept:\n    handle_error()',
              after: 'try:\n    process()\nexcept Exception:\n    handle_error()'
            },
            difficultyWeight: 3,
            impactWeight: 8
          }
        ]
      },
      difficultyFactors: {
        codeSize: 0.5,
        complexity: 0.4,
        dependencies: 0.5
      },
      impactFactors: {
        functionality: 0.7,
        readability: 0.6,
        maintenance: 0.7,
        performance: 0.6
      },
      implementationGuide: [
        'コードレビューでベストプラクティスのチェックを行う',
        'リンターツールを利用して自動的にベストプラクティスを強制する',
        '言語固有のガイドラインを学び、適用する',
        'チーム内で知識を共有する',
        'コード品質の自動チェックをCI/CDパイプラインに組み込む'
      ]
    }
  };
  
  // 問題タイプに対応するテンプレートがない場合はgenericを使用
  return templates[type] || {
    suggestion: 'コードを改善する',
    explanation: 'コードの品質を向上させるためのガイドラインに従います。',
    patterns: {},
    difficultyFactors: {
      codeSize: 0.5,
      complexity: 0.5,
      dependencies: 0.5
    },
    impactFactors: {
      functionality: 0.5,
      readability: 0.5,
      maintenance: 0.5,
      performance: 0.5
    }
  };
};

export default {
  generateDetailedExplanation,
  generateImprovementSuggestions,
  generateCodeImprovements,
  prepareImprovementUIData
}; 