/**
 * コード複雑度可視化サービス
 * コードの複雑度を分析し、視覚化するための機能を提供します
 */

import * as tf from '@tensorflow/tfjs';
import { predictComplexity } from './tfService';

// 複雑度可視化データ型定義
export interface ComplexityVisualization {
  overall: number;  // 全体の複雑度スコア（0-10）
  functions: FunctionComplexity[];  // 関数ごとの複雑度
  visualization: {
    heatmap: HeatmapData;  // ヒートマップデータ
    graph: GraphData;      // グラフデータ
  };
}

// 関数複雑度情報
export interface FunctionComplexity {
  name: string;           // 関数名
  startLine: number;      // 開始行
  endLine: number;        // 終了行
  cyclomaticComplexity: number;  // 循環的複雑度
  nestingDepth: number;   // 最大ネスト深度
  parameterCount: number; // パラメータ数
  lineCount: number;      // 行数
  complexityScore: number; // 複雑度スコア（0-1）
}

// ヒートマップデータ
export interface HeatmapData {
  lines: {
    lineNumber: number;
    complexity: number;  // 0-1の複雑度
    code: string;
  }[];
}

// グラフデータ
export interface GraphData {
  labels: string[];  // 関数名
  datasets: {
    cyclomaticComplexity: number[];
    nestingDepth: number[];
    parameterCount: number[];
    lineCount: number[];
  };
}

/**
 * コード複雑度の可視化サービス
 * コードの複雑さをさまざまな指標で分析し、視覚的に表現
 */

export interface ComplexityMetrics {
  cyclomaticComplexity: number;  // 循環的複雑度
  cognitiveComplexity: number;   // 認知的複雑度
  halsteadComplexity: {          // ハルステッド複雑度メトリクス
    volume: number;              // プログラムの情報量
    difficulty: number;          // 実装の難しさ
    effort: number;              // 理解・実装に必要な労力
  };
  maintainabilityIndex: number;  // 保守性指標
  nestingLevels: number[];       // 各行のネストレベル
  functionComplexity: {          // 関数ごとの複雑度
    name: string;
    startLine: number;
    endLine: number;
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
  }[];
  densityMap: {                  // 複雑度の密度マップ用データ
    lineNumber: number;
    complexity: number;
    color: string;
  }[];
}

// 関数定義の重複を解消するために、まず型定義を追加します
export interface ComplexityAnalysisResult {
  metrics: ComplexityMetrics;
  visualizations: {
    heatmap?: HeatmapData;
    treeMap?: {
      name: string;
      value: number;
      children: { name: string; value: number }[];
    };
    dependencyGraph?: {
      nodes: { id: string; label: string; size: number }[];
      edges: { from: string; to: string }[];
    };
  };
}

/**
 * コード複雑度を分析し、視覚化に必要なデータを提供
 * @param code 分析対象のコード
 * @param language プログラミング言語
 */
export const analyzeCodeComplexityOld = (code: string, language: string): ComplexityMetrics => {
  const lines = code.split('\n');
  
  // 関数/メソッドのブロックを抽出
  const functionBlocks = extractFunctionBlocks(code, language);
  
  // ネストレベルを計算
  const nestingLevels = calculateNestingLevels(lines, language);
  
  // 循環的複雑度を計算
  const cyclomaticComplexity = calculateCyclomaticComplexity(code, language);
  
  // 認知的複雑度を計算
  const cognitiveComplexity = calculateCognitiveComplexity(code, language);
  
  // ハルステッド複雑度を計算
  const halsteadComplexity = calculateHalsteadComplexity(code, language);
  
  // 保守性指標を計算
  const maintainabilityIndex = calculateMaintainabilityIndex(
    lines.length, 
    cyclomaticComplexity, 
    halsteadComplexity.volume
  );
  
  // 関数ごとの複雑度を計算
  const functionComplexity = functionBlocks.map(func => {
    const functionCode = lines.slice(func.startLine - 1, func.endLine).join('\n');
    return {
      name: func.name,
      startLine: func.startLine,
      endLine: func.endLine,
      cyclomaticComplexity: calculateCyclomaticComplexity(functionCode, language),
      cognitiveComplexity: calculateCognitiveComplexity(functionCode, language)
    };
  });
  
  // 複雑度の密度マップデータを生成
  const densityMap = generateComplexityDensityMap(nestingLevels, functionComplexity);
  
  return {
    cyclomaticComplexity,
    cognitiveComplexity,
    halsteadComplexity,
    maintainabilityIndex,
    nestingLevels,
    functionComplexity,
    densityMap
  };
};

/**
 * 循環的複雑度（サイクロマチック複雑度）を計算
 * 決定ポイント数 + 1 により算出
 */
const calculateCyclomaticComplexity = (code: string, language: string): number => {
  let complexity = 1; // 基本値は1
  
  if (language === 'javascript' || language === 'typescript') {
    // 条件分岐と繰り返しをカウント
    complexity += (code.match(/if|else if|for|while|case|&&|\|\||\?/g) || []).length;
  } else if (language === 'python') {
    // Pythonの条件分岐と繰り返し
    complexity += (code.match(/if|elif|for|while|and|or/g) || []).length;
  } else if (language === 'java' || language === 'cpp' || language === 'c') {
    complexity += (code.match(/if|else if|for|while|case|&&|\|\||\?:/g) || []).length;
  }
  
  return complexity;
};

/**
 * 認知的複雑度を計算
 * ネスト深度と分岐の複雑さを考慮
 */
const calculateCognitiveComplexity = (code: string, language: string): number => {
  const lines = code.split('\n');
  let complexity = 0;
  let nestingLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // ネストレベルの変化を検出
    const increaseNesting = detectNestingIncrease(line, language);
    const decreaseNesting = detectNestingDecrease(line, language);
    
    // ネストが深くなるほどペナルティを増加
    if (increaseNesting) {
      nestingLevel++;
      complexity += nestingLevel;
    }
    
    // 条件分岐や繰り返しのコストを加算
    if (language === 'javascript' || language === 'typescript') {
      if (line.match(/if|else if|for|while|switch/)) {
        complexity += 1;
      }
      if (line.match(/&&|\|\|/)) {
        complexity += (line.match(/&&|\|\|/g) || []).length;
      }
    } else if (language === 'python') {
      if (line.match(/if|elif|for|while/)) {
        complexity += 1;
      }
      if (line.match(/and|or/)) {
        complexity += (line.match(/and|or/g) || []).length;
      }
    }
    
    if (decreaseNesting) {
      nestingLevel = Math.max(0, nestingLevel - 1);
    }
  }
  
  return complexity;
};

/**
 * ネスト増加を検出
 */
const detectNestingIncrease = (line: string, language: string): boolean => {
  if (language === 'javascript' || language === 'typescript' || language === 'java' || language === 'cpp' || language === 'c') {
    return (line.includes('{') && !line.includes('}')) || 
           (line.match(/if|for|while|switch|function|class/) !== null && !line.includes(';'));
  } else if (language === 'python') {
    return line.endsWith(':');
  }
  return false;
};

/**
 * ネスト減少を検出
 */
const detectNestingDecrease = (line: string, language: string): boolean => {
  if (language === 'javascript' || language === 'typescript' || language === 'java' || language === 'cpp' || language === 'c') {
    return line.includes('}') && !line.includes('{');
  } else if (language === 'python') {
    // Pythonでは明示的なネスト終了がないため、インデントレベルで判断する必要がある
    // 簡易実装ではここでは常にfalseを返す
    return false;
  }
  return false;
};

/**
 * 行ごとのネストレベルを計算
 */
const calculateNestingLevels = (lines: string[], language: string): number[] => {
  const nestingLevels: number[] = [];
  let currentNestingLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (language === 'javascript' || language === 'typescript' || language === 'java' || language === 'cpp' || language === 'c') {
      // 括弧を使用する言語
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      
      // 同一行の開始括弧を先に処理
      nestingLevels.push(currentNestingLevel);
      
      // ネストレベルを更新
      currentNestingLevel += openBraces - closeBraces;
      
    } else if (language === 'python') {
      // インデントベースの言語
      // 行の先頭のスペース/タブをカウント
      const indent = lines[i].search(/\S|$/);
      const nestLevel = Math.floor(indent / 4); // 4スペースを1レベルとして計算
      
      nestingLevels.push(nestLevel);
    }
  }
  
  return nestingLevels;
};

/**
 * ハルステッド複雑度メトリクスを計算
 */
const calculateHalsteadComplexity = (code: string, language: string) => {
  // 演算子と被演算子を特定
  let operators: string[] = [];
  let operands: string[] = [];
  
  if (language === 'javascript' || language === 'typescript') {
    // 演算子の抽出 (簡易版)
    const operatorMatches = code.match(/[+\-*/%=&|<>!?:]+|typeof|instanceof|new|delete|void|in|of/g);
    operators = operatorMatches ? operatorMatches : [];
    
    // 被演算子の抽出 (簡易版 - 変数名、関数名、リテラルなど)
    const operandMatches = code.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b|"[^"]*"|'[^']*'|`[^`]*`|\d+/g);
    operands = operandMatches ? operandMatches : [];
  } else if (language === 'python') {
    // Python用の演算子抽出
    const operatorMatches = code.match(/[+\-*/%=&|<>!]+|and|or|not|in|is|if|else|elif|for|while|def|class/g);
    operators = operatorMatches ? operatorMatches : [];
    
    // Python用の被演算子抽出
    const operandMatches = code.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b|"[^"]*"|'[^']*'|"""|'''|[0-9]+/g);
    operands = operandMatches ? operandMatches : [];
  }
  
  // ユニーク演算子/被演算子の数
  const n1 = [...new Set(operators)].length;
  const n2 = [...new Set(operands)].length;
  
  // 総演算子/被演算子の数
  const N1 = operators.length;
  const N2 = operands.length;
  
  // プログラム語彙数 (n = n1 + n2)
  const n = n1 + n2;
  
  // プログラム長 (N = N1 + N2)
  const N = N1 + N2;
  
  // プログラムの体積/情報量 (V = N * log2(n))
  const volume = N * Math.log2(Math.max(1, n));
  
  // 困難度 (D = (n1/2) * (N2/n2))
  const difficulty = (n1 / 2) * (N2 / Math.max(1, n2));
  
  // プログラム理解・実装に必要な労力 (E = D * V)
  const effort = difficulty * volume;
  
  return {
    volume: Math.round(volume),
    difficulty: Math.round(difficulty * 100) / 100,
    effort: Math.round(effort)
  };
};

/**
 * 保守性指標を計算
 * 高いほど保守しやすく、低いほど保守が難しい
 */
const calculateMaintainabilityIndex = (
  linesOfCode: number,
  cyclomaticComplexity: number,
  halsteadVolume: number
): number => {
  // 保守性指標の標準的な計算式
  // MI = 171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)
  const mi = 171 - 
             5.2 * Math.log(Math.max(1, halsteadVolume)) - 
             0.23 * cyclomaticComplexity - 
             16.2 * Math.log(Math.max(1, linesOfCode));
  
  // 0-100のスケールに正規化
  return Math.max(0, Math.min(100, Math.round(mi * 100 / 171)));
};

/**
 * 関数ブロックを抽出
 */
const extractFunctionBlocks = (code: string, language: string) => {
  const lines = code.split('\n');
  const functions = [];
  
  // 言語別の関数抽出パターン
  if (language === 'javascript' || language === 'typescript') {
    // 関数宣言、関数式、アロー関数などを検出
    const functionPattern = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*function|const\s+(\w+)\s*=\s*\(.*\)\s*=>)/g;
    
    let match;
    let lineNumber = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      lineNumber = i + 1;
      
      // ソースコード全体に対するマッチングの場合は、インデックスを使ってラインをマッピングする必要がある
      const functionMatch = functionPattern.exec(line);
      if (functionMatch) {
        // 名前を取得（最初に一致した名前を使用）
        const name = functionMatch[1] || functionMatch[2] || functionMatch[3] || 'anonymous';
        
        // 関数の終了行を見つける（簡易実装）
        const startLine = lineNumber;
        let endLine = startLine;
        let braceCount = 0;
        
        // 開始括弧を探す
        let foundOpeningBrace = false;
        for (let j = i; j < lines.length; j++) {
          if (lines[j].includes('{')) {
            foundOpeningBrace = true;
            break;
          }
        }
        
        // 括弧をカウントして関数の終了を見つける
        if (foundOpeningBrace) {
          for (let j = i; j < lines.length; j++) {
            const line = lines[j];
            braceCount += (line.match(/{/g) || []).length;
            braceCount -= (line.match(/}/g) || []).length;
            
            if (braceCount === 0 && j >= i) {
              endLine = j + 1;
              break;
            }
          }
        } else {
          // アロー関数で括弧がない場合
          endLine = i + 1;
        }
        
        functions.push({
          name,
          startLine,
          endLine
        });
      }
    }
  } else if (language === 'python') {
    // Pythonの関数定義を検出
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const defMatch = line.match(/\s*def\s+(\w+)\s*\(/);
      
      if (defMatch) {
        const name = defMatch[1];
        const startLine = i + 1;
        let endLine = startLine;
        
        // インデントレベルを取得
        const indentLevel = line.search(/\S/);
        
        // 同じかより少ないインデントレベルが見つかるまで進む
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          
          // 空行はスキップ
          if (nextLine.trim() === '') {
            endLine = j + 1;
            continue;
          }
          
          const nextIndent = nextLine.search(/\S/);
          if (nextIndent <= indentLevel && nextLine.trim() !== '') {
            endLine = j;
            break;
          }
          
          endLine = j + 1;
        }
        
        functions.push({
          name,
          startLine,
          endLine
        });
      }
    }
  }
  
  return functions;
};

/**
 * 複雑度の密度マップデータを生成
 */
const generateComplexityDensityMap = (
  nestingLevels: number[],
  functionComplexity: { name: string; startLine: number; endLine: number; cyclomaticComplexity: number; cognitiveComplexity: number; }[]
) => {
  const densityMap = [];
  
  // 各行の複雑度を計算
  for (let i = 0; i < nestingLevels.length; i++) {
    const lineNumber = i + 1;
    const nestLevel = nestingLevels[i];
    
    // この行が含まれる関数を見つける
    const containingFunction = functionComplexity.find(
      func => lineNumber >= func.startLine && lineNumber <= func.endLine
    );
    
    // 基本複雑度はネストレベルに基づく
    let lineComplexity = nestLevel;
    
    // 関数の複雑度を考慮に入れる
    if (containingFunction) {
      // 関数の開始行の場合は複雑度を上げる
      if (lineNumber === containingFunction.startLine) {
        lineComplexity += containingFunction.cyclomaticComplexity / 5;
      }
      
      // 関数全体の複雑度も考慮
      lineComplexity += containingFunction.cognitiveComplexity / 20;
    }
    
    // 色の計算（複雑度が高いほど赤に近づく）
    const normalizedComplexity = Math.min(1, lineComplexity / 10);
    const r = Math.round(255 * normalizedComplexity);
    const g = Math.round(255 * (1 - normalizedComplexity));
    const b = 0;
    const color = `rgb(${r}, ${g}, ${b})`;
    
    densityMap.push({
      lineNumber,
      complexity: Math.round(lineComplexity * 10) / 10,
      color
    });
  }
  
  return densityMap;
};

/**
 * コードの複雑度を分析
 */
export const analyzeCodeComplexityWithVisual = async (
  code: string,
  language: string
): Promise<ComplexityVisualization> => {
  // 関数を抽出
  const functions = extractFunctions(code, language);
  
  // 各関数の複雑度を計算
  const functionComplexities: FunctionComplexity[] = [];
  
  for (const func of functions) {
    // 関数メトリクスを計算
    const metrics = calculateFunctionMetrics(func.code, language);
    
    // 特徴量を抽出
    const features = [
      metrics.cyclomaticComplexity / 20,  // 正規化
      metrics.nestingDepth / 10,         // 正規化
      metrics.parameterCount / 10,       // 正規化
      func.code.split('\n').length / 100, // 正規化
      language === 'javascript' || language === 'typescript' ? 0.8 : 0.7 // 言語係数
    ];
    
    // 複雑度スコアを予測
    let complexityScore: number;
    try {
      complexityScore = await predictComplexity(features);
    } catch (error) {
      console.error('複雑度予測エラー:', error);
      // フォールバック：単純な計算式で複雑度を推定
      complexityScore = (
        metrics.cyclomaticComplexity * 0.4 + 
        metrics.nestingDepth * 0.3 + 
        metrics.parameterCount * 0.1 + 
        func.code.split('\n').length / 100 * 0.2
      ) / 10;
    }
    
    functionComplexities.push({
      name: func.name,
      startLine: func.startLine,
      endLine: func.endLine,
      cyclomaticComplexity: metrics.cyclomaticComplexity,
      nestingDepth: metrics.nestingDepth,
      parameterCount: metrics.parameterCount,
      lineCount: func.code.split('\n').length,
      complexityScore
    });
  }
  
  // ソート：複雑度の高い順
  functionComplexities.sort((a, b) => b.complexityScore - a.complexityScore);
  
  // ヒートマップデータの生成
  const heatmapData = generateComplexityHeatmap(code, functionComplexities);
  
  // グラフデータの生成
  const graphData = generateComplexityGraph(functionComplexities);
  
  // 全体の複雑度スコアを計算
  const overall = calculateOverallComplexity(functionComplexities);
  
  return {
    overall,
    functions: functionComplexities,
    visualization: {
      heatmap: heatmapData,
      graph: graphData
    }
  };
};

/**
 * 関数を抽出
 */
export const extractFunctions = (
  code: string,
  language: string
): { name: string; code: string; startLine: number; endLine: number }[] => {
  const functions: { name: string; code: string; startLine: number; endLine: number }[] = [];
  const lines = code.split('\n');
  
  // 言語別の関数抽出パターン
  const patterns: { [key: string]: RegExp } = {
    'javascript': /function\s+([a-zA-Z0-9_$]+)\s*\(|([a-zA-Z0-9_$]+)\s*[:=]\s*(?:async\s*)?\(|(?:async\s*)?([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*{/g,
    'typescript': /function\s+([a-zA-Z0-9_$]+)\s*\(|([a-zA-Z0-9_$]+)\s*[:=]\s*(?:async\s*)?\(|(?:async\s*)?([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*{|([a-zA-Z0-9_$]+)\s*\([^)]*\):\s*[a-zA-Z0-9_<>]+\s*{/g,
    'python': /def\s+([a-zA-Z0-9_]+)\s*\(/g,
    'java': /(?:public|private|protected|static|final)?\s*(?:<.*>)?\s*\w+\s+([a-zA-Z0-9_$]+)\s*\(/g,
    'go': /func\s+([a-zA-Z0-9_$]+)\s*\(/g,
    'c': /([a-zA-Z0-9_$]+)\s*\([^;]*\)\s*{/g,
    'cpp': /([a-zA-Z0-9_$]+)::[a-zA-Z0-9_$]+\s*\(|[a-zA-Z0-9_$]+\s+([a-zA-Z0-9_$]+)\s*\([^;]*\)\s*{/g,
    'csharp': /(?:public|private|protected|internal|static|virtual|abstract|override|sealed)?\s*(?:<.*>)?\s*\w+\s+([a-zA-Z0-9_$]+)\s*\(/g,
  };
  
  const pattern = patterns[language.toLowerCase()] || patterns['javascript'];
  
  // 簡易的な関数抽出（実際の実装では構文解析ライブラリを使うべき）
  let braceCount = 0;
  let functionStartLine = -1;
  let currentFunction = '';
  let inFunction = false;
  let functionName = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!inFunction) {
      const match = pattern.exec(line);
      if (match) {
        // 関数名を抽出（正規表現のキャプチャグループから）
        functionName = match[1] || match[2] || match[3] || match[4] || 'anonymous';
        functionStartLine = i + 1;
        inFunction = true;
        currentFunction = line;
        braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      }
    } else {
      currentFunction += '\n' + line;
      braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      
      if (braceCount === 0 || (language === 'python' && line.trim() === '' && i < lines.length - 1 && !lines[i + 1].startsWith(' '))) {
        // 関数の終了を検出
        functions.push({
          name: functionName,
          code: currentFunction,
          startLine: functionStartLine,
          endLine: i + 1
        });
        inFunction = false;
        currentFunction = '';
        functionName = '';
      }
    }
  }
  
  return functions;
};

/**
 * 関数のメトリクスを計算
 */
export const calculateFunctionMetrics = (
  code: string,
  language: string
): { cyclomaticComplexity: number; nestingDepth: number; parameterCount: number } => {
  // 循環的複雑度を計算（分岐の数 + 1）
  const branchPatterns: { [key: string]: RegExp } = {
    'javascript': /\b(if|for|while|switch|catch|&&|\|\|)\b/g,
    'typescript': /\b(if|for|while|switch|catch|&&|\|\|)\b/g,
    'python': /\b(if|for|while|except|and|or)\b/g,
    'java': /\b(if|for|while|switch|catch|&&|\|\|)\b/g,
    'go': /\b(if|for|switch|select|&&|\|\|)\b/g,
    'c': /\b(if|for|while|switch|&&|\|\|)\b/g,
    'cpp': /\b(if|for|while|switch|catch|&&|\|\|)\b/g,
    'csharp': /\b(if|for|while|switch|catch|&&|\|\|)\b/g,
  };
  
  const branchPattern = branchPatterns[language.toLowerCase()] || branchPatterns['javascript'];
  const branches = (code.match(branchPattern) || []).length;
  const cyclomaticComplexity = branches + 1;
  
  // ネスト深度を計算
  const nestingDepth = calculateNestingDepth(code, language);
  
  // パラメータ数を計算
  const parameterCount = countParameters(code, language);
  
  return {
    cyclomaticComplexity,
    nestingDepth,
    parameterCount
  };
};

/**
 * ネスト深度を計算
 */
export const calculateNestingDepth = (code: string, language: string): number => {
  const lines = code.split('\n');
  let maxDepth = 0;
  let currentDepth = 0;
  
  // Python用のインデントベースの深度計算
  if (language === 'python') {
    let prevIndent = 0;
    for (const line of lines) {
      const indent = line.search(/\S|$/);
      if (indent > prevIndent) {
        currentDepth += Math.floor((indent - prevIndent) / 4); // 4スペースでインデントを仮定
      } else if (indent < prevIndent) {
        currentDepth -= Math.floor((prevIndent - indent) / 4);
      }
      maxDepth = Math.max(maxDepth, currentDepth);
      prevIndent = indent;
    }
    return maxDepth;
  }
  
  // 中括弧ベースの言語用の深度計算
  for (const line of lines) {
    // コメント行をスキップ
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
      continue;
    }
    
    // 中括弧をカウント
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    
    currentDepth += openBraces - closeBraces;
    maxDepth = Math.max(maxDepth, currentDepth);
  }
  
  return maxDepth;
};

/**
 * パラメータ数をカウント
 */
export const countParameters = (code: string, language: string): number => {
  // 関数宣言の最初の行を抽出
  const firstLine = code.split('\n')[0];
  const paramRegex = /\(([^)]*)\)/;
  const match = paramRegex.exec(firstLine);
  
  if (!match || !match[1]) {
    return 0;
  }
  
  const params = match[1].trim();
  if (!params) {
    return 0;
  }
  
  // カンマで区切られた引数をカウント
  return params.split(',').length;
};

/**
 * 全体の複雑度スコアを計算
 */
export const calculateOverallComplexity = (functionComplexities: FunctionComplexity[]): number => {
  if (functionComplexities.length === 0) {
    return 0;
  }
  
  // 単純な加重平均
  let totalWeight = 0;
  let totalScore = 0;
  
  for (const func of functionComplexities) {
    const weight = Math.sqrt(func.lineCount); // 行数の平方根を重みとする
    totalScore += func.complexityScore * weight;
    totalWeight += weight;
  }
  
  const averageScore = totalWeight > 0 ? totalScore / totalWeight : 0;
  
  // 0-10の範囲に正規化
  return Math.round(averageScore * 10);
};

/**
 * 複雑度ヒートマップを生成
 */
export const generateComplexityHeatmap = (
  code: string,
  functionComplexities: FunctionComplexity[]
): HeatmapData => {
  const lines = code.split('\n');
  const heatmapData: HeatmapData = {
    lines: []
  };
  
  // 行ごとの複雑度を初期化
  for (let i = 0; i < lines.length; i++) {
    heatmapData.lines.push({
      lineNumber: i + 1,
      complexity: 0,
      code: lines[i]
    });
  }
  
  // 各関数の複雑度を割り当て
  for (const func of functionComplexities) {
    // 関数の行範囲に複雑度を設定
    for (let i = func.startLine - 1; i < func.endLine && i < lines.length; i++) {
      heatmapData.lines[i].complexity = func.complexityScore;
    }
  }
  
  return heatmapData;
};

/**
 * 複雑度グラフを生成
 */
export const generateComplexityGraph = (functionComplexities: FunctionComplexity[]): GraphData => {
  // 最大5つの関数に制限（複雑度の高い順）
  const topFunctions = functionComplexities
    .sort((a, b) => b.complexityScore - a.complexityScore)
    .slice(0, 5);
  
  const graphData: GraphData = {
    labels: topFunctions.map(f => f.name),
    datasets: {
      cyclomaticComplexity: topFunctions.map(f => f.cyclomaticComplexity),
      nestingDepth: topFunctions.map(f => f.nestingDepth),
      parameterCount: topFunctions.map(f => f.parameterCount),
      lineCount: topFunctions.map(f => f.lineCount)
    }
  };
  
  return graphData;
};

// 重複している関数名を変更
export const analyzeCodeComplexityAdvanced = async (
  code: string,
  language: string,
  visualizationOptions: {
    includeHeatmap?: boolean;
    includeTreemap?: boolean;
    includeDependencyGraph?: boolean;
  } = {}
): Promise<ComplexityAnalysisResult> => {
  // 基本的な複雑度メトリクスを計算
  const metrics = analyzeCodeComplexityOld(code, language);
  
  // 視覚化データを準備
  const visualizations: ComplexityAnalysisResult['visualizations'] = {};
  
  // ヒートマップを生成（オプション）
  if (visualizationOptions.includeHeatmap) {
    visualizations.heatmap = generateHeatmap(metrics.densityMap, code.split('\n'));
  }
  
  // ツリーマップを生成（オプション）
  if (visualizationOptions.includeTreemap) {
    const treeMapData = {
      name: 'root',
      value: 0,
      children: metrics.functionComplexity.map(func => ({
        name: func.name || `Line ${func.startLine}-${func.endLine}`,
        value: func.cyclomaticComplexity
      }))
    };
    visualizations.treeMap = treeMapData;
  }
  
  // 依存関係グラフを生成（オプション）
  if (visualizationOptions.includeDependencyGraph) {
    visualizations.dependencyGraph = await generateDependencyGraph(code, language);
  }
  
  return {
    metrics,
    visualizations
  };
};

/**
 * 複雑度に基づいたヒートマップデータを生成
 */
function generateHeatmap(densityMap: ComplexityMetrics['densityMap'], codeLines: string[]): HeatmapData {
  return {
    lines: densityMap.map(item => ({
      lineNumber: item.lineNumber,
      complexity: item.complexity,
      code: codeLines[item.lineNumber - 1] || ''
    }))
  };
}

/**
 * 依存関係グラフを生成する
 */
async function generateDependencyGraph(code: string, language: string): Promise<{
  nodes: { id: string; label: string; size: number }[];
  edges: { from: string; to: string }[];
}> {
  // 簡易実装：実際には静的解析やAST解析を使用して正確に依存関係を特定する
  const functions = extractFunctions(code, language);
  const nodes = functions.map((func, index) => ({
    id: `func-${index}`,
    label: func.name || `Anonymous-${index}`,
    size: Math.min(30, func.code.length / 50) // コードの長さに基づいてサイズを設定
  }));
  
  // シンプルな実装では、各関数の呼び出し関係を簡易的に検出
  const edges: { from: string; to: string }[] = [];
  for (let i = 0; i < functions.length; i++) {
    const callerFunc = functions[i];
    
    for (let j = 0; j < functions.length; j++) {
      if (i === j) continue; // 自分自身は無視
      
      const calleeFunc = functions[j];
      // 関数名が他の関数のコード内に出現するかチェック
      if (calleeFunc.name && callerFunc.code.includes(calleeFunc.name)) {
        edges.push({
          from: `func-${i}`,
          to: `func-${j}`
        });
      }
    }
  }
  
  return { nodes, edges };
}

export default {
  analyzeCodeComplexityOld,
  extractFunctions,
  calculateFunctionMetrics,
  calculateNestingDepth
}; 