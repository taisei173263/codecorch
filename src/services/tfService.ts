/**
 * TensorFlow.jsを使用したクライアントサイドAIサービス
 * ブラウザ内で軽量なモデルを実行して、コード分析や推奨を強化します
 */

import * as tf from '@tensorflow/tfjs';
import { CodeAnalysisResult } from './codeAnalysisService';
import { Skill } from './learningPathService';

// モデルの初期化状態
let modelInitialized = false;
let codePatternModel: tf.Sequential | null = null;

/**
 * TensorFlowモデルの初期化
 * 注意: このモデルは単純化されたものであり、実際の本番環境では事前に訓練されたモデルをロードする必要があります
 */
export const initTensorFlowModel = async (): Promise<boolean> => {
  try {
    if (modelInitialized) return true;
    
    // シンプルな言語パターン認識のための軽量モデル
    // tf.sequentialを使用して正しく初期化
    codePatternModel = tf.sequential();
    
    // 入力レイヤー（特徴量として10個の値を使用）
    codePatternModel.add(tf.layers.dense({
      units: 16,
      activation: 'relu',
      inputShape: [10]
    }));
    
    // 隠れ層
    codePatternModel.add(tf.layers.dense({
      units: 8,
      activation: 'relu'
    }));
    
    // 出力レイヤー（4つの言語カテゴリ）
    codePatternModel.add(tf.layers.dense({
      units: 4,
      activation: 'softmax'
    }));
    
    // モデルをコンパイル
    codePatternModel.compile({
      optimizer: tf.train.adam(),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    modelInitialized = true;
    console.log('TensorFlow.jsモデルが初期化されました');
    
    return true;
  } catch (error) {
    console.error('TensorFlowモデル初期化エラー:', error);
    return false;
  }
};

/**
 * コード分析結果から特徴ベクトルを抽出
 * @param analysis コード分析結果
 */
export const extractFeatures = (analysis: CodeAnalysisResult): number[] => {
  // 10個の特徴量を抽出
  return [
    analysis.score / 100, // 総合スコア（0-1に正規化）
    analysis.codeStyle / 100, // コードスタイルスコア
    analysis.namingConventions / 100, // 命名規則スコア
    analysis.complexity / 100, // 複雑性スコア
    analysis.bestPractices / 100, // ベストプラクティススコア
    analysis.metrics.lineCount / 1000, // 行数（1000行で正規化）
    analysis.metrics.commentCount / analysis.metrics.lineCount || 0, // コメント率
    analysis.metrics.functionCount / 50, // 関数数（50で正規化）
    analysis.metrics.complexityScore / 20, // 複雑性指標（20で正規化）
    analysis.metrics.nestingDepth / 5 // ネスト深度（5で正規化）
  ];
};

/**
 * 言語コードをワンホットエンコーディングに変換
 * @param language 言語名
 */
export const languageToOneHot = (language: string): number[] => {
  switch (language.toLowerCase()) {
    case 'javascript':
      return [1, 0, 0, 0];
    case 'typescript':
      return [0, 1, 0, 0];
    case 'python':
      return [0, 0, 1, 0];
    case 'go':
      return [0, 0, 0, 1];
    default:
      return [0, 0, 0, 0];
  }
};

/**
 * ワンホットエンコーディングから言語に変換
 * @param oneHot ワンホットエンコーディング配列
 */
export const oneHotToLanguage = (oneHot: number[]): string => {
  const maxIndex = oneHot.indexOf(Math.max(...oneHot));
  switch (maxIndex) {
    case 0:
      return 'javascript';
    case 1:
      return 'typescript';
    case 2:
      return 'python';
    case 3:
      return 'go';
    default:
      return 'unknown';
  }
};

/**
 * コードパターンの分類（言語の予測）
 * @param features 特徴ベクトル
 */
export const classifyCodePattern = async (features: number[]): Promise<string> => {
  try {
    if (!modelInitialized || !codePatternModel) {
      await initTensorFlowModel();
    }
    
    if (!codePatternModel) {
      throw new Error('モデルが初期化されていません');
    }
    
    // 入力テンソルの作成
    const input = tf.tensor2d([features]);
    
    // 予測の実行
    const prediction = codePatternModel.predict(input) as tf.Tensor;
    
    // 結果の取得
    const result = await prediction.data();
    
    // クリーンアップ
    input.dispose();
    prediction.dispose();
    
    // 結果をワンホットエンコーディングとして処理
    const languageProbabilities = Array.from(result);
    return oneHotToLanguage(languageProbabilities);
  } catch (error) {
    console.error('コードパターン分類エラー:', error);
    return 'unknown';
  }
};

/**
 * モデルのトレーニング（簡易的なもの）
 * 注意: 実際の環境では、事前に訓練されたモデルをロードするほうが効率的です
 * @param examples トレーニングデータ
 */
export const trainModel = async (
  examples: {features: number[], language: string}[]
): Promise<boolean> => {
  try {
    if (!modelInitialized) {
      await initTensorFlowModel();
    }
    
    if (!codePatternModel) {
      throw new Error('モデルが初期化されていません');
    }
    
    // トレーニングデータの準備
    const featuresTensor = tf.tensor2d(examples.map(ex => ex.features));
    const labelsTensor = tf.tensor2d(examples.map(ex => languageToOneHot(ex.language)));
    
    // トレーニングの実行
    await codePatternModel.fit(featuresTensor, labelsTensor, {
      epochs: 10,
      batchSize: 4,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss = ${logs?.loss}, accuracy = ${logs?.acc}`);
        }
      }
    });
    
    // クリーンアップ
    featuresTensor.dispose();
    labelsTensor.dispose();
    
    return true;
  } catch (error) {
    console.error('モデルトレーニングエラー:', error);
    return false;
  }
};

/**
 * コード分析結果に基づく学習パスの推奨強化
 * @param analysisResults 分析結果
 * @param recommendedSkills 初期推奨スキル
 */
export const enhanceLearningRecommendation = async (
  analysisResults: CodeAnalysisResult[],
  recommendedSkills: Skill[]
): Promise<Skill[]> => {
  try {
    // TensorFlowが利用可能かチェック
    if (!tf) {
      console.warn('TensorFlow.jsが利用できません。基本的な推奨を返します。');
      return recommendedSkills;
    }
    
    // 既に十分な推奨があれば処理不要
    if (recommendedSkills.length >= 5) {
      return recommendedSkills;
    }
    
    // 分析結果から特徴を抽出
    const allFeatures = analysisResults.map(extractFeatures);
    
    // 特徴の平均を計算
    const featureCount = allFeatures[0].length;
    const avgFeatures = new Array(featureCount).fill(0);
    
    allFeatures.forEach(features => {
      for (let i = 0; i < featureCount; i++) {
        avgFeatures[i] += features[i] / allFeatures.length;
      }
    });
    
    // 平均特徴に基づいて言語を予測
    const predictedLanguage = await classifyCodePattern(avgFeatures);
    
    // 結果をログ出力
    console.log('AIモデルが予測した主要言語:', predictedLanguage);
    
    // この情報を使用して推奨を強化（実装例）
    // 実際の環境では、より複雑なロジックが必要かもしれません
    
    return recommendedSkills;
  } catch (error) {
    console.error('学習推奨強化エラー:', error);
    return recommendedSkills;
  }
};

/**
 * コード品質スコアの調整（AIモデルによる補正）
 * @param analysis 元の分析結果
 */
export const adjustCodeQualityScore = async (
  analysis: CodeAnalysisResult
): Promise<CodeAnalysisResult> => {
  try {
    // TensorFlowが利用可能かチェック
    if (!tf) {
      console.warn('TensorFlow.jsが利用できません。元の分析結果を返します。');
      return analysis;
    }
    
    // 特徴抽出
    const features = extractFeatures(analysis);
    
    // 特徴から言語を予測
    const predictedLanguage = await classifyCodePattern(features);
    
    // 元の言語と予測言語が一致するかチェック
    const languageMatch = predictedLanguage === analysis.language;
    
    // 言語が一致しない場合、スコアを補正
    if (!languageMatch && predictedLanguage !== 'unknown') {
      console.log(`言語の不一致を検出: 元=${analysis.language}, 予測=${predictedLanguage}`);
      
      // スコアを少し下げる（このロジックは調整が必要）
      const adjustedScore = Math.max(0, analysis.score - 10);
      
      return {
        ...analysis,
        score: adjustedScore,
        issues: [
          ...analysis.issues,
          {
            type: 'ai-detected',
            severity: 'medium',
            message: `このファイルは${analysis.language}として分析されましたが、${predictedLanguage}のパターンが多く含まれています`,
            line: 1,
            suggestion: `${predictedLanguage}の命名規則や構造を確認してください`
          }
        ]
      };
    }
    
    return analysis;
  } catch (error) {
    console.error('コード品質スコア調整エラー:', error);
    return analysis;
  }
};

/**
 * モデルの保存（LocalStorageを使用）
 */
export const saveModel = async (): Promise<boolean> => {
  try {
    if (!modelInitialized || !codePatternModel) {
      throw new Error('保存するモデルが初期化されていません');
    }
    
    await codePatternModel.save('localstorage://codecoach-model');
    console.log('モデルがLocalStorageに保存されました');
    
    return true;
  } catch (error) {
    console.error('モデル保存エラー:', error);
    return false;
  }
};

/**
 * モデルをlocalStorageからロード
 */
export const loadModel = async (): Promise<boolean> => {
  try {
    if (!tf) {
      console.warn('TensorFlow.jsが利用できません');
      return false;
    }
    
    const modelExists = localStorage.getItem('codecoach-model') !== null;
    
    if (!modelExists) {
      console.log('保存されたモデルが見つかりません。新しいモデルを初期化します。');
      return await initTensorFlowModel();
    }
    
    // モデルをロード
    const loadedModel = await tf.loadLayersModel('localstorage://codecoach-model');
    
    // Sequentialモデルとして使用するためには、新しいSequentialモデルを作成して
    // ロードしたモデルのレイヤーを転送する必要があります
    const sequential = tf.sequential();
    for (const layer of loadedModel.layers) {
      sequential.add(layer);
    }
    
    codePatternModel = sequential;
    
    modelInitialized = true;
    console.log('モデルを正常にロードしました');
    
    return true;
  } catch (error) {
    console.error('モデルロードエラー:', error);
    return initTensorFlowModel(); // 失敗したら新しいモデルを初期化
  }
};

// TensorFlowモデルの自動ロード/初期化を試みる
loadModel().catch(() => {
  console.log('既存のモデルがないため、新しいモデルを初期化します');
  initTensorFlowModel();
});

export default {
  initTensorFlowModel,
  extractFeatures,
  classifyCodePattern,
  trainModel,
  enhanceLearningRecommendation,
  adjustCodeQualityScore,
  saveModel,
  loadModel
}; 