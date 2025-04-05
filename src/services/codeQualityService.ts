import * as tf from '@tensorflow/tfjs';
import { extractCodeQualityFeatures, predictCodeQuality } from './tfService';

export interface CodeIssue {
  type: 'style' | 'naming' | 'complexity' | 'bestPractices';
  line: number;
  message: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

interface CodeQualityResult {
  codeStyleScore: number;
  namingScore: number;
  complexityScore: number;
  bestPracticesScore: number;
  overallScore: number;
  issues: CodeIssue[];
  scoreExplanations: {
    codeStyle: string;
    naming: string;
    complexity: string;
    bestPractices: string;
  };
  detailedExplanations?: {
    codeStyle: DetailedScoreExplanation;
    naming: DetailedScoreExplanation;
    complexity: DetailedScoreExplanation;
    bestPractices: DetailedScoreExplanation;
  };
  lineCount: number;
  commentCount: number;
  functionCount: number;
  maxNestingDepth: number;
}

// 詳細なスコア説明のインターフェース
interface DetailedScoreExplanation {
  score: number;
  level: string;
  summary: string;
  issues: string[];
  recommendations: string[];
  examples?: string[];
  resources?: string[];
}

/**
 * コード品質分析サービス
 */
class CodeQualityService {
  /**
   * コードを分析して品質スコアを計算する
   * @param code 分析するコード
   * @param language プログラミング言語
   * @returns 品質スコアと問題点
   */
  async analyzeCode(code: string, language: string): Promise<CodeQualityResult> {
    // コードの基本メトリクスを抽出
    const metrics = this.extractBasicMetrics(code, language);
    
    // TensorFlow.jsモデルの特徴を抽出
    const features = extractCodeQualityFeatures(code, language, {
      lineCount: metrics.lineCount,
      commentCount: metrics.commentCount,
      functionCount: metrics.functionCount,
      nestingDepth: metrics.maxNestingDepth
    });
    
    // MLモデルを使用してスコアを予測
    const predictedScores = await predictCodeQuality(features);
    
    // スコアを0-100の範囲に正規化
    const scores = {
      codeStyleScore: Math.round(predictedScores.codeStyle * 100),
      namingScore: Math.round(predictedScores.naming * 100),
      complexityScore: Math.round(predictedScores.complexity * 100),
      bestPracticesScore: Math.round(predictedScores.bestPractices * 100)
    };
    
    // 総合スコアを計算
    const overallScore = Math.round(
      (scores.codeStyleScore + scores.namingScore + scores.complexityScore + scores.bestPracticesScore) / 4
    );
    
    // コードの問題を検出
    const issues = this.detectIssues(code, language);
    
    // スコアの説明を生成
    const scoreExplanations = this.generateScoreExplanations(scores, metrics, language);
    
    // 詳細なスコア説明を生成
    const detailedExplanations = this.generateDetailedExplanations(scores, metrics, language, issues);
    
    return {
      ...scores,
      overallScore,
      issues,
      scoreExplanations,
      detailedExplanations,
      ...metrics
    };
  }
  
  /**
   * コードから基本的なメトリクスを抽出
   */
  private extractBasicMetrics(code: string, language: string) {
    const lines = code.split('\n');
    const lineCount = lines.length;
    
    // コメント行をカウント
    let commentCount = 0;
    let inBlockComment = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 言語ごとのコメント構文を検出
      if (language === 'javascript' || language === 'typescript' || language === 'java' || language === 'cpp' || language === 'c') {
        // ブロックコメントの開始
        if (trimmedLine.includes('/*') && !trimmedLine.includes('*/')) {
          inBlockComment = true;
          commentCount++;
        }
        // ブロックコメントの終了
        else if (inBlockComment && trimmedLine.includes('*/')) {
          inBlockComment = false;
          commentCount++;
        }
        // ブロックコメント内
        else if (inBlockComment) {
          commentCount++;
        }
        // 行コメント
        else if (trimmedLine.startsWith('//')) {
          commentCount++;
        }
      } else if (language === 'python') {
        // Pythonのコメント
        if (trimmedLine.startsWith('#')) {
          commentCount++;
        }
      }
    }
    
    // 関数数を推定
    const functionCount = this.estimateFunctionCount(code, language);
    
    // 最大ネスト深度を推定
    const maxNestingDepth = this.estimateMaxNestingDepth(code, language);
    
    return {
      lineCount,
      commentCount,
      functionCount,
      maxNestingDepth
    };
  }
  
  /**
   * 関数数を推定
   */
  private estimateFunctionCount(code: string, language: string): number {
    let count = 0;
    
    if (language === 'javascript' || language === 'typescript') {
      // function宣言を検出
      const functionMatches = code.match(/function\s+\w+\s*\(|const\s+\w+\s*=\s*function\s*\(|const\s+\w+\s*=\s*\(.*\)\s*=>/g);
      count = functionMatches ? functionMatches.length : 0;
    } else if (language === 'python') {
      // def宣言を検出
      const functionMatches = code.match(/def\s+\w+\s*\(/g);
      count = functionMatches ? functionMatches.length : 0;
    } else if (language === 'java') {
      // メソッド宣言を検出（簡易的）
      const methodMatches = code.match(/(?:public|private|protected|static|\s) +[\w\<\>\[\]]+\s+(\w+) *\([^\)]*\) *\{/g);
      count = methodMatches ? methodMatches.length : 0;
    }
    
    return count;
  }
  
  /**
   * 最大ネスト深度を推定
   */
  private estimateMaxNestingDepth(code: string, language: string): number {
    const lines = code.split('\n');
    let maxDepth = 0;
    let currentDepth = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // ネストが増加する可能性のあるキーワード
      const openingKeywords = ['{', 'if', 'for', 'while', 'switch', 'function', 'class', 'try'];
      // ネストが減少する可能性のあるキーワード
      const closingKeywords = ['}'];
      
      let openCount = 0;
      let closeCount = 0;
      
      // 特定の言語構文に基づいてネスト深度を推定
      if (language === 'javascript' || language === 'typescript' || language === 'java' || language === 'cpp' || language === 'c') {
        openCount = (trimmedLine.match(/{/g) || []).length;
        closeCount = (trimmedLine.match(/}/g) || []).length;
      } else if (language === 'python') {
        // Pythonではインデントでネストを表現するため、コロンで終わる行を検出
        if (trimmedLine.endsWith(':')) {
          openCount = 1;
        }
        // 次の行のインデントを見ないと正確には判断できないが、簡易推定
      }
      
      // 深度を更新
      currentDepth += openCount - closeCount;
      maxDepth = Math.max(maxDepth, currentDepth);
    }
    
    return maxDepth;
  }
  
  /**
   * コードの問題を検出
   */
  private detectIssues(code: string, language: string): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const lines = code.split('\n');
    
    // 行が長すぎる問題を検出
    lines.forEach((line, index) => {
      if (line.length > 100) {
        issues.push({
          type: 'style',
          line: index + 1,
          message: '行が長すぎます（100文字以上）',
          severity: 'low',
          suggestion: '行を複数行に分割するか、変数名を短くすることを検討してください。'
        });
      }
    });
    
    // 命名規則の問題を検出
    if (language === 'javascript' || language === 'typescript') {
      const camelCaseVarRegex = /const|let|var\s+([a-z][a-zA-Z0-9]*)\s*=/g;
      let match;
      while ((match = camelCaseVarRegex.exec(code)) !== null) {
        const varName = match[1];
        if (varName.length <= 1) {
          issues.push({
            type: 'naming',
            line: this.getLineNumber(code, match.index),
            message: '変数名が短すぎます',
            severity: 'medium',
            suggestion: '変数名は意味のある名前にしてください。'
          });
        }
      }
    }
    
    // 関数の長さを検出
    const functionBlocks = this.extractFunctionBlocks(code, language);
    functionBlocks.forEach(block => {
      const lineCount = block.endLine - block.startLine + 1;
      if (lineCount > 50) {
        issues.push({
          type: 'complexity',
          line: block.startLine,
          message: `関数が長すぎます（${lineCount}行）`,
          severity: 'medium',
          suggestion: '関数を小さな関数に分割することを検討してください。'
        });
      }
    });
    
    // コメントが少ない
    const lines2 = code.split('\n');
    const commentRatio = lines2.filter(line => this.isCommentLine(line, language)).length / lines2.length;
    if (lines2.length > 30 && commentRatio < 0.1) {
      issues.push({
        type: 'bestPractices',
        line: 1,
        message: 'コメントが少なすぎます',
        severity: 'low',
        suggestion: '複雑なロジックや重要な部分にはコメントを追加してください。'
      });
    }
    
    return issues;
  }
  
  /**
   * コード行がコメント行かどうかを判断
   */
  private isCommentLine(line: string, language: string): boolean {
    const trimmedLine = line.trim();
    if (language === 'javascript' || language === 'typescript' || language === 'java' || language === 'cpp' || language === 'c') {
      return trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.endsWith('*/');
    } else if (language === 'python') {
      return trimmedLine.startsWith('#');
    }
    return false;
  }
  
  /**
   * 関数ブロックを抽出
   */
  private extractFunctionBlocks(code: string, language: string): Array<{name: string; startLine: number; endLine: number}> {
    const lines = code.split('\n');
    const blocks: Array<{name: string; startLine: number; endLine: number}> = [];
    
    if (language === 'javascript' || language === 'typescript') {
      let currentBlock: {name: string; startLine: number; endLine: number} | null = null;
      let braceCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 関数宣言を検出
        if (!currentBlock) {
          const functionMatch = line.match(/function\s+(\w+)\s*\(|const\s+(\w+)\s*=\s*function\s*\(|const\s+(\w+)\s*=\s*\(.*\)\s*=>/);
          if (functionMatch) {
            const name = functionMatch[1] || functionMatch[2] || functionMatch[3] || 'anonymous';
            currentBlock = { name, startLine: i + 1, endLine: 0 };
            braceCount = 0;
          }
        }
        
        if (currentBlock) {
          // 波括弧をカウント
          braceCount += (line.match(/{/g) || []).length;
          braceCount -= (line.match(/}/g) || []).length;
          
          // 関数の終了を検出
          if (braceCount === 0 && line.includes('}')) {
            currentBlock.endLine = i + 1;
            blocks.push(currentBlock);
            currentBlock = null;
          }
        }
      }
    } else if (language === 'python') {
      // Pythonの関数抽出（簡易版）
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('def ')) {
          const nameMatch = line.match(/def\s+(\w+)\s*\(/);
          const name = nameMatch ? nameMatch[1] : 'anonymous';
          
          // 関数の終了行を探す（次の同じインデントレベルの行）
          const indentLevel = line.search(/\S/);
          let endLine = i + 1;
          
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j];
            if (nextLine.trim() !== '' && nextLine.search(/\S/) <= indentLevel) {
              endLine = j;
              break;
            }
            endLine = j + 1;
          }
          
          blocks.push({
            name,
            startLine: i + 1,
            endLine
          });
        }
      }
    }
    
    return blocks;
  }
  
  /**
   * コード中の指定された位置の行番号を取得
   */
  private getLineNumber(code: string, position: number): number {
    const lines = code.substring(0, position).split('\n');
    return lines.length;
  }
  
  /**
   * スコアの説明を生成
   */
  private generateScoreExplanations(
    scores: {
      codeStyleScore: number;
      namingScore: number;
      complexityScore: number;
      bestPracticesScore: number;
    },
    metrics: {
      lineCount: number;
      commentCount: number;
      functionCount: number;
      maxNestingDepth: number;
    },
    language: string
  ) {
    // スコア判定の基準
    const getScoreLevel = (score: number) => {
      if (score >= 80) return '優れている';
      if (score >= 60) return '良好';
      if (score >= 40) return '普通';
      return '要改善';
    };
    
    // 詳細度合いを判定（スコアが低いほど詳細な説明）
    const getDetailLevel = (score: number) => {
      if (score >= 80) return 'minimal';
      if (score >= 60) return 'basic';
      if (score >= 40) return 'detailed';
      return 'extensive';
    };
    
    // コメント率を計算
    const commentRatio = metrics.commentCount / metrics.lineCount * 100;
    
    // 関数あたりの平均行数
    const avgLinesPerFunction = metrics.functionCount > 0 ? 
      Math.round(metrics.lineCount / metrics.functionCount) : 0;
    
    // コードの規模に基づいた推奨値
    const isLargeCodebase = metrics.lineCount > 300;
    const recommendedCommentRatio = isLargeCodebase ? 20 : 15;
    const recommendedFunctionLength = isLargeCodebase ? 30 : 20;
    const recommendedNestingDepth = isLargeCodebase ? 3 : 2;
    
    // 言語固有の推奨ツール
    const getLinterRecommendation = (lang: string) => {
      switch (lang.toLowerCase()) {
        case 'javascript':
          return 'ESLint と Prettier';
        case 'typescript':
          return 'ESLint と Prettier（TypeScriptルール有効）';
        case 'python':
          return 'Flake8、Black、Pylint';
        case 'java':
          return 'Checkstyle、PMD';
        case 'c#':
          return 'StyleCop、ReSharper';
        case 'c++':
        case 'c':
          return 'ClangFormat、cppcheck';
        default:
          return '言語固有のリンターとフォーマッター';
      }
    };
    
    // 各スコア別の詳細説明と改善ポイント
    return {
      codeStyle: this.generateCodeStyleExplanation(
        scores.codeStyleScore, 
        getScoreLevel(scores.codeStyleScore),
        getDetailLevel(scores.codeStyleScore),
        language,
        metrics
      ),
      
      naming: this.generateNamingExplanation(
        scores.namingScore, 
        getScoreLevel(scores.namingScore),
        getDetailLevel(scores.namingScore),
        language,
        metrics.functionCount
      ),
      
      complexity: this.generateComplexityExplanation(
        scores.complexityScore, 
        getScoreLevel(scores.complexityScore),
        getDetailLevel(scores.complexityScore),
        metrics.maxNestingDepth,
        avgLinesPerFunction,
        recommendedNestingDepth,
        recommendedFunctionLength,
        language
      ),
      
      bestPractices: this.generateBestPracticesExplanation(
        scores.bestPracticesScore, 
        getScoreLevel(scores.bestPracticesScore),
        getDetailLevel(scores.bestPracticesScore),
        commentRatio,
        recommendedCommentRatio,
        language,
        getLinterRecommendation(language)
      )
    };
  }
  
  /**
   * コードスタイルの説明を生成
   */
  private generateCodeStyleExplanation(
    score: number, 
    level: string,
    detailLevel: string,
    language: string,
    metrics: {
      lineCount: number;
      commentCount: number;
      functionCount: number;
      maxNestingDepth: number;
    }
  ): string {
    let explanation = `コードスタイルスコア: ${score}/100 (${level})\n\n`;
    explanation += `詳細: このスコアはコードの一貫性、インデント、空白の使用、行の長さなどを評価します。`;
    
    if (detailLevel === 'minimal') {
      explanation += `\n\nあなたのコードスタイルは非常に良好です。引き続き現在のスタイルを維持してください。`;
      return explanation;
    }
    
    explanation += `\n\n`;
    
    // 言語固有のスタイルガイド
    const styleGuide = {
      javascript: 'Airbnb JavaScript スタイルガイド、StandardJS',
      typescript: 'TypeScript 公式スタイルガイド、Airbnb JavaScript スタイルガイド（TypeScript対応）',
      python: 'PEP 8',
      java: 'Google Java スタイルガイド、Oracle コーディング規約',
      'c#': 'Microsoft C# コーディング規約',
      'c++': 'Google C++ スタイルガイド',
      c: 'Linux カーネルコーディングスタイル'
    }[language.toLowerCase()] || '業界標準のスタイルガイド';
    
    // 改善点
    if (score < 60) {
      explanation += `改善点:\n`;
      explanation += `- 一貫したインデントと空白を使用する\n`;
      explanation += `- 行の長さを80-120文字以内に保つ\n`;
      explanation += `- ${styleGuide}に従う\n`;
      
      if (language === 'javascript' || language === 'typescript') {
        explanation += `- セミコロンの使用を一貫させる\n`;
        explanation += `- 引用符の使用（シングル/ダブル）を一貫させる\n`;
        explanation += `- オブジェクトと配列のフォーマットを統一する\n`;
      } else if (language === 'python') {
        explanation += `- インデントには4つのスペースを使用する\n`;
        explanation += `- 関数とクラスの定義の前後に2行の空行を入れる\n`;
        explanation += `- 演算子の前後にスペースを入れる\n`;
      }
      
      explanation += `- IDE用の自動フォーマット設定ファイル（.editorconfig など）を使用する\n`;
    }
    
    // 具体的なツール推奨
    if (detailLevel === 'detailed' || detailLevel === 'extensive') {
      explanation += `\nおすすめツール:\n`;
      
      if (language === 'javascript' || language === 'typescript') {
        explanation += `- ESLint: コードスタイルとエラーチェック\n`;
        explanation += `- Prettier: 自動コードフォーマット\n`;
        explanation += `- コマンド例: \`npx eslint --fix src/**/*.${language === 'typescript' ? 'ts' : 'js'}\`\n`;
      } else if (language === 'python') {
        explanation += `- Black: 自動コードフォーマット\n`;
        explanation += `- Flake8: スタイルとエラーチェック\n`;
        explanation += `- コマンド例: \`python -m black .\` または \`flake8 .\`\n`;
      }
      
      explanation += `\n適用例:\n`;
      if (language === 'javascript' || language === 'typescript') {
        explanation += `// 改善前\nfunction   example(  a,b ){\nreturn a+b;\n}\n\n`;
        explanation += `// 改善後\nfunction example(a, b) {\n  return a + b;\n}\n`;
      } else if (language === 'python') {
        explanation += `# 改善前\ndef example( a,b ):\n return a+b\n\n`;
        explanation += `# 改善後\ndef example(a, b):\n    return a + b\n`;
      }
    }
    
    return explanation;
  }
  
  /**
   * 命名規則の説明を生成
   */
  private generateNamingExplanation(
    score: number, 
    level: string,
    detailLevel: string,
    language: string,
    functionCount: number
  ): string {
    let explanation = `命名規則スコア: ${score}/100 (${level})\n\n`;
    explanation += `詳細: 変数、関数、クラスなどの命名の明確さと一貫性を評価します。\n`;
    explanation += `現在の状態: ${functionCount}個の関数を検出。\n`;
    
    if (detailLevel === 'minimal') {
      explanation += `\nあなたの命名規則は非常に良好です。引き続き現在の命名パターンを維持してください。`;
      return explanation;
    }
    
    // 言語固有の命名規則
    const namingConventions = {
      javascript: [
        '変数と関数: camelCase (例: myVariable, calculateTotal)',
        'クラス: PascalCase (例: UserProfile)',
        '定数: UPPER_SNAKE_CASE (例: MAX_RETRY_COUNT)',
        'プライベート変数/メソッド: _prefixedCamelCase (例: _privateMethod)'
      ],
      typescript: [
        '変数と関数: camelCase (例: myVariable, calculateTotal)',
        'クラス、インターフェース、タイプ、列挙型: PascalCase (例: UserProfile, OptionType)',
        '定数: UPPER_SNAKE_CASE (例: MAX_RETRY_COUNT)',
        'プライベート変数/メソッド: _prefixedCamelCase または #privateField'
      ],
      python: [
        '変数と関数: snake_case (例: my_variable, calculate_total)',
        'クラス: PascalCase (例: UserProfile)',
        '定数: UPPER_SNAKE_CASE (例: MAX_RETRY_COUNT)',
        'プライベート変数/メソッド: _prefixed_snake_case (例: _private_method)'
      ],
      java: [
        '変数と関数: camelCase (例: myVariable, calculateTotal)',
        'クラス: PascalCase (例: UserProfile)',
        '定数: UPPER_SNAKE_CASE (例: MAX_RETRY_COUNT)',
        'パッケージ: すべて小文字 (例: com.example.project)'
      ]
    }[language.toLowerCase()] || [
      '変数と関数: 一貫した規則を使用（camelCaseまたはsnake_case推奨）',
      'クラス: PascalCase推奨',
      '定数: UPPER_SNAKE_CASE推奨'
    ];
    
    if (score < 60) {
      explanation += `\n改善点:\n`;
      explanation += `- 意味のある記述的な名前を使用する\n`;
      explanation += `- 一貫した命名規則を使用する:\n`;
      
      namingConventions.forEach(convention => {
        explanation += `  • ${convention}\n`;
      });
      
      explanation += `- 略語や単一文字の変数名を避ける（ループカウンタを除く）\n`;
      explanation += `- 変数名の長さは、スコープの大きさに比例させる\n`;
      explanation += `- 否定形の命名を避ける (例: isNotValid → isValid)\n`;
    }
    
    // 詳細な例を提供
    if (detailLevel === 'detailed' || detailLevel === 'extensive') {
      explanation += `\n具体例:\n`;
      
      if (language === 'javascript' || language === 'typescript') {
        explanation += `// 改善前\nfunction calc(a, b) {\n  let res = a + b;\n  return res;\n}\n\n`;
        explanation += `// 改善後\nfunction calculateSum(firstNumber, secondNumber) {\n  let result = firstNumber + secondNumber;\n  return result;\n}\n`;
      } else if (language === 'python') {
        explanation += `# 改善前\ndef calc(a, b):\n    res = a + b\n    return res\n\n`;
        explanation += `# 改善後\ndef calculate_sum(first_number, second_number):\n    result = first_number + second_number\n    return result\n`;
      }
      
      explanation += `\n良い命名規則のポイント:\n`;
      explanation += `- 一貫性: 同じ概念には同じ命名パターンを使用する\n`;
      explanation += `- 明確さ: 名前は目的と内容を明確に表現する\n`;
      explanation += `- 発音可能: 口頭でのコミュニケーションを容易にする\n`;
      explanation += `- 検索可能: 一般的でユニークな名前を使用する\n`;
    }
    
    return explanation;
  }
  
  /**
   * 複雑度の説明を生成
   */
  private generateComplexityExplanation(
    score: number, 
    level: string,
    detailLevel: string,
    maxNestingDepth: number,
    avgLinesPerFunction: number,
    recommendedNestingDepth: number,
    recommendedFunctionLength: number,
    language: string
  ): string {
    let explanation = `複雑度スコア: ${score}/100 (${level})\n\n`;
    explanation += `詳細: コードの論理的複雑さ、ネストの深さ、関数の長さを評価します。\n`;
    explanation += `現在の状態: 最大ネスト深度 ${maxNestingDepth}、平均関数行数 ${avgLinesPerFunction}行。\n`;
    
    if (detailLevel === 'minimal') {
      explanation += `\nあなたのコードの複雑度は健全なレベルです。引き続き現在の構造を維持してください。`;
      return explanation;
    }
    
    // 複雑度の問題点を評価
    const nestingIssue = maxNestingDepth > recommendedNestingDepth;
    const functionLengthIssue = avgLinesPerFunction > recommendedFunctionLength;
    
    if (score < 60 || nestingIssue || functionLengthIssue) {
      explanation += `\n改善点:\n`;
      
      if (nestingIssue) {
        explanation += `- ネストの深さを減らす (${maxNestingDepth} → ${recommendedNestingDepth}以下推奨):\n`;
        explanation += `  • 早期リターンパターンを使用\n`;
        explanation += `  • 複雑な条件を関数に抽出\n`;
        explanation += `  • ガード節パターンを活用\n`;
      }
      
      if (functionLengthIssue) {
        explanation += `- 関数の長さを短くする (${avgLinesPerFunction}行 → ${recommendedFunctionLength}行以下推奨):\n`;
        explanation += `  • 単一責任の原則に従う\n`;
        explanation += `  • 機能ごとに関数を分割\n`;
        explanation += `  • 再利用可能な小さな関数を作成\n`;
      }
      
      explanation += `- 条件分岐を単純化:\n`;
      explanation += `  • 複雑な条件式を変数に代入\n`;
      explanation += `  • ポリモーフィズムの活用 (オブジェクト指向言語の場合)\n`;
      explanation += `  • 戦略パターンや状態パターンの検討\n`;
    }
    
    // 詳細な例を提供
    if (detailLevel === 'detailed' || detailLevel === 'extensive') {
      explanation += `\n複雑度低減の例:\n`;
      
      if (language === 'javascript' || language === 'typescript') {
        explanation += `// 改善前: 深いネスト\nfunction processData(data) {\n  if (data) {\n    if (data.items) {\n      if (data.items.length > 0) {\n        for (let i = 0; i < data.items.length; i++) {\n          // 処理\n        }\n      }\n    }\n  }\n}\n\n`;
        explanation += `// 改善後: 早期リターンでネストを減らす\nfunction processData(data) {\n  if (!data || !data.items || data.items.length === 0) {\n    return;\n  }\n  \n  for (const item of data.items) {\n    // 処理\n  }\n}\n`;
        
        explanation += `\n// 改善前: 長すぎる関数\nfunction doEverything() {\n  // 100行以上の処理\n}\n\n`;
        explanation += `// 改善後: 機能ごとに分割\nfunction validateInput() { /* ... */ }\nfunction processData() { /* ... */ }\nfunction formatOutput() { /* ... */ }\n\nfunction doEverything() {\n  validateInput();\n  processData();\n  formatOutput();\n}\n`;
      } else if (language === 'python') {
        explanation += `# 改善前: 深いネスト\ndef process_data(data):\n    if data:\n        if data.items:\n            if len(data.items) > 0:\n                for item in data.items:\n                    # 処理\n\n`;
        explanation += `# 改善後: 早期リターンでネストを減らす\ndef process_data(data):\n    if not data or not hasattr(data, 'items') or len(data.items) == 0:\n        return\n    \n    for item in data.items:\n        # 処理\n`;
      }
      
      explanation += `\n複雑度メトリクス:\n`;
      explanation += `- 循環的複雑度: 条件分岐やループなどの決定ポイント数\n`;
      explanation += `- 認知的複雑度: コードを理解するための認知的な負荷\n`;
      explanation += `- 関数の行数: 関数あたりの平均行数と最大行数\n`;
      explanation += `- ネストの深さ: 条件やループのネストレベル\n`;
    }
    
    return explanation;
  }
  
  /**
   * ベストプラクティスの説明を生成
   */
  private generateBestPracticesExplanation(
    score: number, 
    level: string,
    detailLevel: string,
    commentRatio: number,
    recommendedCommentRatio: number,
    language: string,
    linterRecommendation: string
  ): string {
    let explanation = `ベストプラクティススコア: ${score}/100 (${level})\n\n`;
    explanation += `詳細: 言語固有のベストプラクティスやパターンの遵守度を評価します。\n`;
    explanation += `現在の状態: コメント率 ${commentRatio.toFixed(1)}%。\n`;
    
    if (detailLevel === 'minimal') {
      explanation += `\nあなたのコードは優れたプラクティスに従っています。引き続き現在の手法を維持してください。`;
      return explanation;
    }
    
    // コメント率の問題を評価
    const commentIssue = commentRatio < recommendedCommentRatio && commentRatio > 5;
    const excessiveComments = commentRatio > recommendedCommentRatio * 2;
    
    if (score < 60) {
      explanation += `\n改善点:\n`;
      
      if (commentIssue) {
        explanation += `- 複雑なロジックや重要な決定に説明コメントを追加する\n`;
        explanation += `- 公開APIやライブラリ関数にドキュメンテーションコメントを追加\n`;
      } else if (excessiveComments) {
        explanation += `- 冗長なコメントを減らして自己説明的なコードを書く\n`;
        explanation += `- コードでわかる内容をコメントで繰り返すのを避ける\n`;
      }
      
      // 言語固有のベストプラクティス
      explanation += `- ${language}固有のベストプラクティス:\n`;
      
      if (language === 'javascript' || language === 'typescript') {
        explanation += `  • == の代わりに === を使用\n`;
        explanation += `  • var の代わりに const と let を使用\n`;
        explanation += `  • 非同期コードにはPromiseまたはasync/awaitを使用\n`;
        explanation += `  • オブジェクトの分割代入を活用\n`;
      } else if (language === 'python') {
        explanation += `  • with文を適切に使用してリソース管理\n`;
        explanation += `  • リスト内包表記やジェネレータ式を活用\n`;
        explanation += `  • try/exceptでは具体的な例外をキャッチ\n`;
        explanation += `  • 型ヒントを使用（Python 3.5+）\n`;
      }
      
      explanation += `- エラー処理を適切に実装\n`;
      explanation += `- マジックナンバーや文字列を定数として定義\n`;
      explanation += `- ${linterRecommendation}を使用して自動的にベストプラクティスを強制\n`;
    }
    
    // 詳細な例を提供
    if (detailLevel === 'detailed' || detailLevel === 'extensive') {
      explanation += `\nベストプラクティスの例:\n`;
      
      if (language === 'javascript' || language === 'typescript') {
        explanation += `// 改善前\nvar x = 5;\nif (someValue == null) { /* ... */ }\n\n`;
        explanation += `// 改善後\nconst x = 5; // 変更されない変数にはconstを使用\nif (someValue === null || someValue === undefined) { /* ... */ }\n`;
        
        explanation += `\n// 改善前: マジックナンバー\nsetTimeout(callback, 3600000);\n\n`;
        explanation += `// 改善後: 意味のある定数\nconst ONE_HOUR_MS = 60 * 60 * 1000;\nsetTimeout(callback, ONE_HOUR_MS);\n`;
      } else if (language === 'python') {
        explanation += `# 改善前\ndef process():\n    file = open('data.txt', 'r')\n    # 処理...\n    file.close()\n\n`;
        explanation += `# 改善後: withステートメントでリソース管理\ndef process():\n    with open('data.txt', 'r') as file:\n        # 処理...\n    # ここでファイルは自動的に閉じられる\n`;
      }
      
      explanation += `\n言語固有のリソース:\n`;
      if (language === 'javascript') {
        explanation += `- [AirbnbのJavaScriptスタイルガイド](https://github.com/airbnb/javascript)\n`;
        explanation += `- [MDN JavaScriptガイド](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide)\n`;
      } else if (language === 'typescript') {
        explanation += `- [TypeScriptのDo's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)\n`;
        explanation += `- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)\n`;
      } else if (language === 'python') {
        explanation += `- [PEP 8 スタイルガイド](https://pep8.org/)\n`;
        explanation += `- [The Hitchhiker's Guide to Python](https://docs.python-guide.org/)\n`;
      }
    }
    
    return explanation;
  }
  
  /**
   * 詳細なスコア説明を生成
   */
  private generateDetailedExplanations(
    scores: {
      codeStyleScore: number;
      namingScore: number;
      complexityScore: number;
      bestPracticesScore: number;
    },
    metrics: {
      lineCount: number;
      commentCount: number;
      functionCount: number;
      maxNestingDepth: number;
    },
    language: string,
    issues: CodeIssue[]
  ): {
    codeStyle: DetailedScoreExplanation;
    naming: DetailedScoreExplanation;
    complexity: DetailedScoreExplanation;
    bestPractices: DetailedScoreExplanation;
  } {
    // スコアレベルの取得
    const getScoreLevel = (score: number): string => {
      if (score >= 80) return '優れている';
      if (score >= 60) return '良好';
      if (score >= 40) return '普通';
      return '要改善';
    };
    
    // スコアごとの問題を抽出
    const styleIssues = issues.filter(i => i.type === 'style');
    const namingIssues = issues.filter(i => i.type === 'naming');
    const complexityIssues = issues.filter(i => i.type === 'complexity');
    const bestPracticesIssues = issues.filter(i => i.type === 'bestPractices');
    
    // コメント率を計算
    const commentRatio = metrics.commentCount / metrics.lineCount * 100;
    
    // 関数あたりの平均行数
    const avgLinesPerFunction = metrics.functionCount > 0 ? 
      Math.round(metrics.lineCount / metrics.functionCount) : 0;
    
    return {
      codeStyle: this.generateCodeStyleDetailedExplanation(
        scores.codeStyleScore, 
        language, 
        styleIssues
      ),
      
      naming: this.generateNamingDetailedExplanation(
        scores.namingScore, 
        language,
        namingIssues,
        metrics.functionCount
      ),
      
      complexity: this.generateComplexityDetailedExplanation(
        scores.complexityScore,
        language,
        complexityIssues,
        metrics.maxNestingDepth,
        avgLinesPerFunction
      ),
      
      bestPractices: this.generateBestPracticesDetailedExplanation(
        scores.bestPracticesScore,
        language,
        bestPracticesIssues,
        commentRatio
      )
    };
  }
  
  /**
   * コードスタイルの詳細説明を生成
   */
  private generateCodeStyleDetailedExplanation(
    score: number,
    language: string,
    issues: CodeIssue[]
  ): DetailedScoreExplanation {
    const level = score >= 80 ? '優れている' : 
                 score >= 60 ? '良好' : 
                 score >= 40 ? '普通' : '要改善';
    
    const summary = `コード一貫性、インデント、空白の使用、行の長さなどを評価します。スコア: ${score}/100`;
    
    // 問題点を文字列の配列に変換
    const issueMessages = issues.map(issue => 
      `${issue.line}行目: ${issue.message} (${issue.severity === 'high' ? '重要' : issue.severity === 'medium' ? '中程度' : '軽微'})`
    );
    
    // 推奨事項
    const recommendations: string[] = [];
    
    if (score < 80) {
      recommendations.push('一貫したインデントスタイルを使用する');
      recommendations.push('行の長さを80-120文字以内に保つ');
      
      if (language === 'javascript' || language === 'typescript') {
        recommendations.push('セミコロンの使用を一貫させる');
        recommendations.push('引用符の使用（シングル/ダブル）を一貫させる');
        recommendations.push(`ESLintとPrettierを使用して自動フォーマットする`);
      } else if (language === 'python') {
        recommendations.push('PEP 8スタイルガイドに従う');
        recommendations.push('インデントには4つのスペースを使用する');
        recommendations.push('Black、Flake8を使用して自動フォーマットする');
      }
    }
    
    // 例
    const examples: string[] = [];
    if (score < 70) {
      if (language === 'javascript' || language === 'typescript') {
        examples.push('// 改善前\nfunction   example(  a,b ){\nreturn a+b;\n}\n\n// 改善後\nfunction example(a, b) {\n  return a + b;\n}');
      } else if (language === 'python') {
        examples.push('# 改善前\ndef example( a,b ):\n return a+b\n\n# 改善後\ndef example(a, b):\n    return a + b');
      }
    }
    
    // リソース
    const resources: string[] = [];
    if (language === 'javascript') {
      resources.push('Airbnb JavaScript スタイルガイド: https://github.com/airbnb/javascript');
    } else if (language === 'typescript') {
      resources.push('TypeScript 公式スタイルガイド: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html');
    } else if (language === 'python') {
      resources.push('PEP 8: https://pep8.org/');
    }
    
    return {
      score,
      level,
      summary,
      issues: issueMessages,
      recommendations,
      examples: examples.length > 0 ? examples : undefined,
      resources: resources.length > 0 ? resources : undefined
    };
  }
  
  /**
   * 命名規則の詳細説明を生成
   */
  private generateNamingDetailedExplanation(
    score: number,
    language: string,
    issues: CodeIssue[],
    functionCount: number
  ): DetailedScoreExplanation {
    const level = score >= 80 ? '優れている' : 
                 score >= 60 ? '良好' : 
                 score >= 40 ? '普通' : '要改善';
    
    const summary = `変数、関数、クラスなどの命名の明確さと一貫性を評価します。スコア: ${score}/100、検出された関数: ${functionCount}個`;
    
    // 問題点を文字列の配列に変換
    const issueMessages = issues.map(issue => 
      `${issue.line}行目: ${issue.message} (${issue.severity === 'high' ? '重要' : issue.severity === 'medium' ? '中程度' : '軽微'})`
    );
    
    // 推奨事項
    const recommendations: string[] = [];
    
    if (score < 80) {
      recommendations.push('意味のある記述的な名前を使用する');
      
      if (language === 'javascript' || language === 'typescript') {
        recommendations.push('変数と関数にはキャメルケース(camelCase)を使用する');
        recommendations.push('クラスにはパスカルケース(PascalCase)を使用する');
        recommendations.push('定数には大文字のスネークケース(UPPER_SNAKE_CASE)を使用する');
      } else if (language === 'python') {
        recommendations.push('変数と関数にはスネークケース(snake_case)を使用する');
        recommendations.push('クラスにはパスカルケース(PascalCase)を使用する');
        recommendations.push('定数には大文字のスネークケース(UPPER_SNAKE_CASE)を使用する');
      }
      
      recommendations.push('略語や単一文字の変数名を避ける（ループカウンタを除く）');
      recommendations.push('変数名の長さは、スコープの大きさに比例させる');
    }
    
    // 例
    const examples: string[] = [];
    if (score < 70) {
      if (language === 'javascript' || language === 'typescript') {
        examples.push('// 改善前\nfunction calc(a, b) {\n  let res = a + b;\n  return res;\n}\n\n// 改善後\nfunction calculateSum(firstNumber, secondNumber) {\n  let result = firstNumber + secondNumber;\n  return result;\n}');
      } else if (language === 'python') {
        examples.push('# 改善前\ndef calc(a, b):\n    res = a + b\n    return res\n\n# 改善後\ndef calculate_sum(first_number, second_number):\n    result = first_number + second_number\n    return result');
      }
    }
    
    return {
      score,
      level,
      summary,
      issues: issueMessages,
      recommendations,
      examples: examples.length > 0 ? examples : undefined
    };
  }
  
  /**
   * 複雑度の詳細説明を生成
   */
  private generateComplexityDetailedExplanation(
    score: number,
    language: string,
    issues: CodeIssue[],
    maxNestingDepth: number,
    avgLinesPerFunction: number
  ): DetailedScoreExplanation {
    const level = score >= 80 ? '優れている' : 
                 score >= 60 ? '良好' : 
                 score >= 40 ? '普通' : '要改善';
    
    const summary = `コードの論理的複雑さ、ネストの深さ、関数の長さを評価します。スコア: ${score}/100、最大ネスト深度: ${maxNestingDepth}、平均関数行数: ${avgLinesPerFunction}行`;
    
    // 問題点を文字列の配列に変換
    const issueMessages = issues.map(issue => 
      `${issue.line}行目: ${issue.message} (${issue.severity === 'high' ? '重要' : issue.severity === 'medium' ? '中程度' : '軽微'})`
    );
    
    // 推奨事項
    const recommendations: string[] = [];
    
    const recommendedNestingDepth = 3;
    const recommendedFunctionLength = 30;
    
    if (score < 80 || maxNestingDepth > recommendedNestingDepth || avgLinesPerFunction > recommendedFunctionLength) {
      if (maxNestingDepth > recommendedNestingDepth) {
        recommendations.push(`ネストの深さを減らす (現在: ${maxNestingDepth}、推奨: ${recommendedNestingDepth}以下)`);
        recommendations.push('早期リターンパターンを使用してネストを減らす');
        recommendations.push('複雑な条件を独立した関数に抽出する');
      }
      
      if (avgLinesPerFunction > recommendedFunctionLength) {
        recommendations.push(`関数の長さを短くする (現在: 平均${avgLinesPerFunction}行、推奨: ${recommendedFunctionLength}行以下)`);
        recommendations.push('単一責任の原則に従い、関数を機能ごとに分割する');
      }
      
      recommendations.push('条件分岐を単純化し、複雑な条件は変数に代入する');
    }
    
    // 例
    const examples: string[] = [];
    if (score < 70 || maxNestingDepth > recommendedNestingDepth) {
      if (language === 'javascript' || language === 'typescript') {
        examples.push('// 改善前: 深いネスト\nfunction processData(data) {\n  if (data) {\n    if (data.items) {\n      if (data.items.length > 0) {\n        for (let i = 0; i < data.items.length; i++) {\n          // 処理\n        }\n      }\n    }\n  }\n}\n\n// 改善後: 早期リターンでネストを減らす\nfunction processData(data) {\n  if (!data || !data.items || data.items.length === 0) {\n    return;\n  }\n  \n  for (const item of data.items) {\n    // 処理\n  }\n}');
      } else if (language === 'python') {
        examples.push('# 改善前: 深いネスト\ndef process_data(data):\n    if data:\n        if hasattr(data, "items"):\n            if len(data.items) > 0:\n                for item in data.items:\n                    # 処理\n\n# 改善後: 早期リターンでネストを減らす\ndef process_data(data):\n    if not data or not hasattr(data, "items") or len(data.items) == 0:\n        return\n    \n    for item in data.items:\n        # 処理');
      }
    }
    
    return {
      score,
      level,
      summary,
      issues: issueMessages,
      recommendations,
      examples: examples.length > 0 ? examples : undefined
    };
  }
  
  /**
   * ベストプラクティスの詳細説明を生成
   */
  private generateBestPracticesDetailedExplanation(
    score: number,
    language: string,
    issues: CodeIssue[],
    commentRatio: number
  ): DetailedScoreExplanation {
    const level = score >= 80 ? '優れている' : 
                 score >= 60 ? '良好' : 
                 score >= 40 ? '普通' : '要改善';
    
    const recommendedCommentRatio = 15;
    const summary = `言語固有のベストプラクティスやパターンの遵守度を評価します。スコア: ${score}/100、コメント率: ${commentRatio.toFixed(1)}%`;
    
    // 問題点を文字列の配列に変換
    const issueMessages = issues.map(issue => 
      `${issue.line}行目: ${issue.message} (${issue.severity === 'high' ? '重要' : issue.severity === 'medium' ? '中程度' : '軽微'})`
    );
    
    // 推奨事項
    const recommendations: string[] = [];
    
    if (score < 80) {
      // コメント率の問題を評価
      if (commentRatio < recommendedCommentRatio && commentRatio > 5) {
        recommendations.push(`コメント率を増やす (現在: ${commentRatio.toFixed(1)}%、推奨: ${recommendedCommentRatio}%以上)`);
        recommendations.push('複雑なロジックや重要な決定に説明コメントを追加する');
      } else if (commentRatio > recommendedCommentRatio * 2) {
        recommendations.push('冗長なコメントを減らし、自己説明的なコードを書く');
      }
      
      if (language === 'javascript' || language === 'typescript') {
        recommendations.push('== の代わりに === を使用する');
        recommendations.push('var の代わりに const と let を使用する');
        recommendations.push('ESLintを使用してベストプラクティスを強制する');
      } else if (language === 'python') {
        recommendations.push('with文を適切に使用してリソース管理をする');
        recommendations.push('リスト内包表記を使用して簡潔なコードを書く');
        recommendations.push('try/except ブロックで具体的な例外をキャッチする');
      }
      
      recommendations.push('マジックナンバーを定数として定義する');
      recommendations.push('エラー処理を適切に実装する');
    }
    
    // 例
    const examples: string[] = [];
    if (score < 70) {
      if (language === 'javascript' || language === 'typescript') {
        examples.push('// 改善前\nvar x = 5;\nif (someValue == null) { /* ... */ }\n\n// 改善後\nconst x = 5; // 変更されない変数にはconstを使用\nif (someValue === null || someValue === undefined) { /* ... */ }');
      } else if (language === 'python') {
        examples.push('# 改善前\ndef process():\n    file = open("data.txt", "r")\n    # 処理...\n    file.close()\n\n# 改善後: withステートメントでリソース管理\ndef process():\n    with open("data.txt", "r") as file:\n        # 処理...\n    # ファイルは自動的に閉じられる');
      }
    }
    
    // リソース
    const resources: string[] = [];
    if (language === 'javascript') {
      resources.push('JavaScript ベストプラクティス: https://github.com/airbnb/javascript');
    } else if (language === 'typescript') {
      resources.push('TypeScript ベストプラクティス: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html');
    } else if (language === 'python') {
      resources.push('Python ベストプラクティス: https://docs.python-guide.org/');
    }
    
    return {
      score,
      level,
      summary,
      issues: issueMessages,
      recommendations,
      examples: examples.length > 0 ? examples : undefined,
      resources: resources.length > 0 ? resources : undefined
    };
  }
}

export default new CodeQualityService(); 