/**
 * コード重複検出サービス
 * ソースコード内の重複した部分を特定し、可視化するためのサービス
 */

import * as tf from '@tensorflow/tfjs';
import { extractDuplicationFeatures, predictCodeDuplication } from './tfService';

// コードブロック定義
export interface CodeBlock {
  file: string;      // ファイル名
  content: string;   // コードの内容
  startLine: number; // 開始行
  endLine: number;   // 終了行
  language: string;  // 言語
}

// 重複結果定義
export interface DuplicationResult {
  similarity: number; // 類似度（0-1）
  blockA: CodeBlock;  // 1つ目のコードブロック
  blockB: CodeBlock;  // 2つ目のコードブロック
}

// コード重複検出サービス
export interface DuplicateBlock {
  startLineA: number;
  endLineA: number;
  startLineB: number;
  endLineB: number;
  codeA: string;
  codeB: string;
  similarity: number;    // 0-1のスコア
  type: 'exact' | 'similar' | 'refactorable';
  impact: 'low' | 'medium' | 'high';
}

export interface DuplicationStats {
  totalDuplicateLines: number;
  duplicatePercentage: number;
  duplicateBlocks: number;
  averageBlockSize: number;
  impactScore: number;   // 0-100のスコア
  recommendations: string[];
}

interface TokenizedBlock {
  startLine: number;
  endLine: number;
  tokens: string[];
  hash: string;
}

// トークンの埋め込みベクトル（簡易的な実装）
const tokenEmbeddings: {[key: string]: number[]} = {
  // 制御構造
  'if': [0.8, 0.1, 0.0, 0.1, 0.0, 0.0, 0.0, 0.0],
  'for': [0.1, 0.9, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  'while': [0.0, 0.9, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0],
  'switch': [0.8, 0.0, 0.2, 0.0, 0.0, 0.0, 0.0, 0.0],
  'try': [0.0, 0.0, 0.0, 0.9, 0.0, 0.0, 0.0, 0.0],
  'catch': [0.0, 0.0, 0.0, 0.9, 0.0, 0.0, 0.0, 0.0],
  
  // 関数
  'function': [0.0, 0.0, 0.0, 0.0, 0.9, 0.0, 0.0, 0.0],
  'return': [0.0, 0.0, 0.0, 0.0, 0.7, 0.2, 0.0, 0.0],
  
  // 演算子
  '+': [0.0, 0.0, 0.0, 0.0, 0.0, 0.8, 0.1, 0.0],
  '-': [0.0, 0.0, 0.0, 0.0, 0.0, 0.8, 0.0, 0.1],
  '*': [0.0, 0.0, 0.0, 0.0, 0.0, 0.7, 0.2, 0.0],
  '/': [0.0, 0.0, 0.0, 0.0, 0.0, 0.7, 0.0, 0.2],
  
  // その他
  'var': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.8, 0.1],
  'let': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.9, 0.0],
  'const': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0]
};

/**
 * コード内の重複を検出する高度な機能
 * 類似コードブロックも検出できるより強力なアルゴリズム
 * @param code 分析対象のコード
 * @param language プログラミング言語
 * @param minBlockSize 検出する最小ブロックサイズ（行数）
 * @param similarityThreshold 類似と判断する閾値（0-1）
 */
export const detectDuplicates = async (
  code: string,
  language: string,
  minBlockSize: number = 5,
  similarityThreshold: number = 0.7
): Promise<{ duplicates: DuplicateBlock[]; stats: DuplicationStats }> => {
  const lines = code.split('\n');
  const totalLines = lines.length;
  
  // 1. コードをトークン化し、潜在的な重複ブロックを特定
  const blocks = tokenizeCodeBlocks(code, language, minBlockSize);
  
  // 2. ハッシュベースの正確な重複を検出
  const exactDuplicates = findExactDuplicates(blocks);
  
  // 3. 類似コードブロックを検出
  const similarDuplicates = await findSimilarDuplicates(
    blocks, 
    code, 
    language, 
    similarityThreshold
  );
  
  // 4. 重複を結合
  const allDuplicates = [...exactDuplicates, ...similarDuplicates];
  
  // 5. 重複が重なる部分を解決
  const resolvedDuplicates = resolveOverlappingDuplicates(allDuplicates);
  
  // 6. 重複統計を計算
  const stats = calculateDuplicationStats(resolvedDuplicates, totalLines, language);
  
  return {
    duplicates: resolvedDuplicates,
    stats
  };
};

/**
 * コードをトークン化してブロックに分割
 */
const tokenizeCodeBlocks = (
  code: string,
  language: string,
  minBlockSize: number
): TokenizedBlock[] => {
  const lines = code.split('\n');
  const blocks: TokenizedBlock[] = [];
  
  // ブロックサイズを考慮して、重なるウィンドウでコードを走査
  for (let i = 0; i <= lines.length - minBlockSize; i++) {
    const blockLines = lines.slice(i, i + minBlockSize);
    const blockContent = blockLines.join('\n');
    
    // コメントと空白を除去
    const normalizedContent = normalizeCode(blockContent, language);
    
    // 内容が少なすぎる場合はスキップ（空白やコメントのみのブロック）
    if (normalizedContent.trim().length < 20) {
      continue;
    }
    
    // コードをトークン化
    const tokens = tokenize(normalizedContent, language);
    
    // トークンが少なすぎる場合はスキップ
    if (tokens.length < 10) {
      continue;
    }
    
    // 単純なハッシュ計算（正確な重複検出用）
    const hash = calculateHash(tokens);
    
    blocks.push({
      startLine: i + 1,  // 1-indexed
      endLine: i + minBlockSize,
      tokens,
      hash
    });
  }
  
  return blocks;
};

/**
 * コードを正規化（不要な部分を取り除く）
 */
const normalizeCode = (code: string, language: string): string => {
  let normalized = code;
  
  // 言語に応じてコメントを削除
  if (language === 'javascript' || language === 'typescript') {
    // 行コメントを削除
    normalized = normalized.replace(/\/\/.*$/gm, '');
    // ブロックコメントを削除
    normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '');
  } else if (language === 'python') {
    // # コメントを削除
    normalized = normalized.replace(/#.*$/gm, '');
    // 三重引用符コメントを削除
    normalized = normalized.replace(/'''[\s\S]*?'''/g, '');
    normalized = normalized.replace(/"""[\s\S]*?"""/g, '');
  }
  
  // 余分な空白を削除
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
};

/**
 * コードをトークンに分割
 */
const tokenize = (code: string, language: string): string[] => {
  // 言語に応じたトークン化（簡易版）
  let pattern: RegExp;
  
  if (language === 'javascript' || language === 'typescript') {
    // JavaScript/TypeScriptのトークン
    pattern = /[\w$]+|[{}()\[\].:;,+\-*/%=<>!&|^~?]+|"[^"]*"|'[^']*'|`[^`]*`/g;
  } else if (language === 'python') {
    // Pythonのトークン
    pattern = /[\w]+|[{}()\[\].:;,+\-*/%=<>!&|^~?@]+|"[^"]*"|'[^']*'/g;
  } else {
    // デフォルトのトークン
    pattern = /[\w$]+|[{}()\[\].:;,+\-*/%=<>!&|^~?]+/g;
  }
  
  const matches = code.match(pattern);
  return matches ? matches : [];
};

/**
 * トークンからハッシュを計算
 */
const calculateHash = (tokens: string[]): string => {
  // 単純な連結ハッシュ（実際の実装ではより堅牢なハッシュ関数を使用）
  return tokens.join('|');
};

/**
 * ハッシュを使用して正確な重複を検出
 */
const findExactDuplicates = (blocks: TokenizedBlock[]): DuplicateBlock[] => {
  const duplicates: DuplicateBlock[] = [];
  const hashMap: { [key: string]: TokenizedBlock[] } = {};
  
  // ハッシュによるブロックのグループ化
  for (const block of blocks) {
    if (!hashMap[block.hash]) {
      hashMap[block.hash] = [];
    }
    hashMap[block.hash].push(block);
  }
  
  // 2つ以上のブロックがある場合は重複
  for (const hash in hashMap) {
    const duplicateBlocks = hashMap[hash];
    if (duplicateBlocks.length >= 2) {
      // 最初のブロックと他のブロックを組み合わせて重複ペアを作成
      const firstBlock = duplicateBlocks[0];
      
      for (let i = 1; i < duplicateBlocks.length; i++) {
        const block = duplicateBlocks[i];
        
        duplicates.push({
          startLineA: firstBlock.startLine,
          endLineA: firstBlock.endLine,
          startLineB: block.startLine,
          endLineB: block.endLine,
          codeA: firstBlock.tokens.join(' '),
          codeB: block.tokens.join(' '),
          similarity: 1.0,  // 正確な一致は類似度 100%
          type: 'exact',
          impact: calculateDuplicateImpact(firstBlock.endLine - firstBlock.startLine + 1)
        });
      }
    }
  }
  
  return duplicates;
};

/**
 * 類似コードブロックを検出
 */
const findSimilarDuplicates = async (
  blocks: TokenizedBlock[],
  code: string,
  language: string,
  threshold: number
): Promise<DuplicateBlock[]> => {
  const duplicates: DuplicateBlock[] = [];
  const lines = code.split('\n');
  
  // すべてのブロックのペアを比較（不要な比較を避けるよう最適化）
  for (let i = 0; i < blocks.length; i++) {
    const blockA = blocks[i];
    
    for (let j = i + 1; j < blocks.length; j++) {
      const blockB = blocks[j];
      
      // 既に正確な重複として検出されていれば比較しない
      if (blockA.hash === blockB.hash) {
      continue;
    }
    
      // 重複範囲が重なる場合は比較しない
      if (
        (blockB.startLine >= blockA.startLine && blockB.startLine <= blockA.endLine) ||
        (blockA.startLine >= blockB.startLine && blockA.startLine <= blockB.endLine)
      ) {
        continue;
      }
      
      // コードの類似度を計算
      const similarity = await calculateSimilarity(blockA, blockB, language);
      
      // 閾値を超える場合は類似重複として追加
      if (similarity >= threshold) {
        // ブロックの実際のコードを取得
        const codeA = lines.slice(blockA.startLine - 1, blockA.endLine).join('\n');
        const codeB = lines.slice(blockB.startLine - 1, blockB.endLine).join('\n');
        
        const type = similarity > 0.9 ? 'similar' : 'refactorable';
        
        duplicates.push({
          startLineA: blockA.startLine,
          endLineA: blockA.endLine,
          startLineB: blockB.startLine,
          endLineB: blockB.endLine,
          codeA,
          codeB,
          similarity,
          type,
          impact: calculateDuplicateImpact(blockA.endLine - blockA.startLine + 1)
        });
      }
    }
  }
  
  return duplicates;
};

/**
 * ブロック間の類似度を計算
 */
const calculateSimilarity = async (
  blockA: TokenizedBlock,
  blockB: TokenizedBlock,
  language: string
): Promise<number> => {
  // トークン一致による類似度計算（シンプルな実装）
  const tokensA = new Set(blockA.tokens);
  const tokensB = new Set(blockB.tokens);
  
  // 共通トークン数
  let commonTokens = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      commonTokens++;
    }
  }
  
  // Jaccard類似度
  const similarity = commonTokens / (tokensA.size + tokensB.size - commonTokens);
  
  // より高度な類似度計算（必要に応じてMLモデルを使用）
  if (similarity > 0.5) {
    try {
      // TFサービスを使用してブロック間の特徴ベクトルを抽出
      const features = extractDuplicationFeatures(
        blockA.tokens.join(' '),
        blockB.tokens.join(' ')
      );
      
      // モデルによる類似度予測
      const predictedSimilarity = await predictCodeDuplication(features);
      
      // 最終類似度（0-1）
      return (similarity + predictedSimilarity) / 2;
    } catch (error) {
      console.error('重複予測エラー:', error);
      return similarity; // モデル予測に失敗した場合はトークンベースの類似度を使用
    }
  }
  
  return similarity;
};

/**
 * 重複の影響度を計算
 */
const calculateDuplicateImpact = (blockSize: number): 'low' | 'medium' | 'high' => {
  if (blockSize >= 20) {
    return 'high';
  } else if (blockSize >= 10) {
    return 'medium';
  }
  return 'low';
};

/**
 * 重複が重なる部分を解決
 */
const resolveOverlappingDuplicates = (
  duplicates: DuplicateBlock[]
): DuplicateBlock[] => {
  // 類似度でソート（高い順）
  duplicates.sort((a, b) => b.similarity - a.similarity);
  
  const resolvedDuplicates: DuplicateBlock[] = [];
  const coveredLinesA: Set<number> = new Set();
  const coveredLinesB: Set<number> = new Set();
  
  for (const duplicate of duplicates) {
    // 既に処理済みの行かどうかをチェック
    let hasOverlap = false;
    
    // A側の行をチェック
    for (let line = duplicate.startLineA; line <= duplicate.endLineA; line++) {
      if (coveredLinesA.has(line)) {
        hasOverlap = true;
        break;
      }
    }
    
    // B側の行をチェック
    for (let line = duplicate.startLineB; line <= duplicate.endLineB; line++) {
      if (coveredLinesB.has(line)) {
        hasOverlap = true;
        break;
      }
    }
    
    // 重複がない場合のみ追加
    if (!hasOverlap) {
      resolvedDuplicates.push(duplicate);
      
      // カバーした行を記録
      for (let line = duplicate.startLineA; line <= duplicate.endLineA; line++) {
        coveredLinesA.add(line);
      }
      
      for (let line = duplicate.startLineB; line <= duplicate.endLineB; line++) {
        coveredLinesB.add(line);
      }
    }
  }
  
  return resolvedDuplicates;
};

/**
 * 重複統計を計算
 */
const calculateDuplicationStats = (
  duplicates: DuplicateBlock[],
  totalLines: number,
  language: string
): DuplicationStats => {
  // 重複行数を計算
  let duplicateLines = 0;
  const allDuplicateLines: Set<number> = new Set();
  
  for (const dup of duplicates) {
    // A側の行を追加
    for (let line = dup.startLineA; line <= dup.endLineA; line++) {
      allDuplicateLines.add(line);
    }
    
    // B側の行を追加
    for (let line = dup.startLineB; line <= dup.endLineB; line++) {
      allDuplicateLines.add(line);
    }
  }
  
  duplicateLines = allDuplicateLines.size;
  
  // 統計値を計算
  const duplicatePercentage = totalLines > 0 ? (duplicateLines / totalLines) * 100 : 0;
  const duplicateBlocks = duplicates.length;
  const averageBlockSize = duplicateBlocks > 0 
    ? duplicates.reduce((sum, d) => sum + (d.endLineA - d.startLineA + 1), 0) / duplicateBlocks 
    : 0;
  
  // 影響スコアを計算（0-100）
  let impactScore = Math.min(100, Math.round(duplicatePercentage * 2));
  if (duplicateBlocks > 5) {
    impactScore += 10;
  }
  if (averageBlockSize > 15) {
    impactScore += 15;
  }
  impactScore = Math.min(100, impactScore);
  
  // 推奨事項を生成
  const recommendations: string[] = [];
  
  if (duplicatePercentage > 20) {
    recommendations.push('コードの重複率が高いです。共通機能を抽出してモジュール化を検討してください。');
  }
  
  if (duplicateBlocks > 3) {
    if (language === 'javascript' || language === 'typescript') {
      recommendations.push('ユーティリティ関数を作成して共通ロジックを集約してください。');
    } else if (language === 'python') {
      recommendations.push('共通機能をヘルパー関数として抽出してください。');
    }
  }
  
  if (impactScore > 70) {
    recommendations.push('コードの保守性向上のため、重複部分のリファクタリングを優先的に行ってください。');
  }
  
  // ユニークな推奨事項のみを残す
  const uniqueRecommendations = [...new Set(recommendations)];
  
  return {
    totalDuplicateLines: duplicateLines,
    duplicatePercentage: Math.round(duplicatePercentage * 10) / 10,
    duplicateBlocks,
    averageBlockSize: Math.round(averageBlockSize * 10) / 10,
    impactScore,
    recommendations: uniqueRecommendations
  };
};

/**
 * 重複検出レポートを生成
 */
export const generateDuplicationReport = (
  duplicates: DuplicateBlock[],
  stats: DuplicationStats
): string => {
  const duplicatesByType = {
    exact: duplicates.filter(d => d.type === 'exact'),
    similar: duplicates.filter(d => d.type === 'similar'),
    refactorable: duplicates.filter(d => d.type === 'refactorable')
  };
  
  const impactText = stats.impactScore < 30 
    ? '低（問題なし）' 
    : stats.impactScore < 70 
      ? '中（改善推奨）' 
      : '高（改善必須）';
  
  let report = `# コード重複分析レポート\n\n`;
  report += `## 概要\n`;
  report += `- 重複行: ${stats.totalDuplicateLines}行 (${stats.duplicatePercentage}%)\n`;
  report += `- 重複ブロック: ${stats.duplicateBlocks}ヶ所\n`;
  report += `- 平均ブロックサイズ: ${stats.averageBlockSize}行\n`;
  report += `- 影響度: ${stats.impactScore}/100 (${impactText})\n\n`;
  
  report += `## 重複タイプ別件数\n`;
  report += `- 完全一致: ${duplicatesByType.exact.length}件\n`;
  report += `- 類似コード: ${duplicatesByType.similar.length}件\n`;
  report += `- リファクタリング候補: ${duplicatesByType.refactorable.length}件\n\n`;
  
  report += `## 推奨事項\n`;
  stats.recommendations.forEach(rec => {
    report += `- ${rec}\n`;
  });
  report += '\n';
  
  report += `## 主要な重複箇所\n`;
  
  // 影響度の高い順にソート
  const priorityDuplicates = [...duplicates]
    .sort((a, b) => {
      const impactOrder = { high: 2, medium: 1, low: 0 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    })
    .slice(0, 5);  // 最大5件まで表示
  
  priorityDuplicates.forEach((dup, index) => {
    report += `### 重複 #${index + 1} (${dup.type}, 類似度: ${Math.round(dup.similarity * 100)}%)\n`;
    report += `- 箇所A: ${dup.startLineA}-${dup.endLineA}行\n`;
    report += `- 箇所B: ${dup.startLineB}-${dup.endLineB}行\n`;
    report += `- 影響度: ${dup.impact}\n\n`;
  });
  
  return report;
};

export default {
  detectDuplicates,
  generateDuplicationReport
}; 