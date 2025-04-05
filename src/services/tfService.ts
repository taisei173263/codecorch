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
let modelLoadAttempted = false;

// モデル格納用の変数
let codeQualityModel: tf.LayersModel | null = null;
let bugPredictionModel: tf.LayersModel | null = null;
let securityModel: tf.LayersModel | null = null;
let styleModel: tf.LayersModel | null = null;
let complexityModel: tf.LayersModel | null = null;
let duplicationModel: tf.LayersModel | null = null;

// モデル初期化状態
const modelInitStatus = {
  codeQuality: false,
  bugPrediction: false,
  security: false,
  style: false,
  complexity: false,
  duplication: false
};

/**
 * TensorFlowモデルの初期化
 * 注意: このモデルは単純化されたものであり、実際の本番環境では事前に訓練されたモデルをロードする必要があります
 */
export const initTensorFlowModel = async (): Promise<boolean> => {
  try {
    // 既にモデルが初期化されている場合は処理をスキップ
    if (modelInitialized && codePatternModel) return true;
    
    // 初期化を一度だけ試行するフラグをセット
    if (modelLoadAttempted) {
      console.warn('TensorFlowモデルの初期化は既に試行されました。');
      return false;
    }
    
    modelLoadAttempted = true;
    console.log('TensorFlow.jsモデルを初期化中...');
    
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
    
    // モデルの状態を確認
    if (codePatternModel) {
      modelInitialized = true;
      console.log('TensorFlow.jsモデルが正常に初期化されました');
    } else {
      throw new Error('モデルオブジェクトが正しく作成されませんでした');
    }
    
    return true;
  } catch (error) {
    console.error('TensorFlowモデル初期化エラー:', error);
    // エラーが発生しても最小限の機能で続行できるようにする
    modelInitialized = false;
    codePatternModel = null;
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

/**
 * TensorFlow.jsモデルをロード（またはキャッシュから取得）
 */
export const loadModels = async (): Promise<void> => {
  console.log('機械学習モデルを初期化中...');
  
  try {
    // キャッシュからモデルのロードを試みる
    codeQualityModel = await loadCachedModel('code-quality');
    
    // キャッシュになければ新規作成
    if (!codeQualityModel) {
      codeQualityModel = await createCodeQualityModel();
      // キャッシュに保存
      await cacheModel(codeQualityModel, 'code-quality');
    }
    
    modelInitStatus.codeQuality = true;
    
    // バグ予測モデル
    bugPredictionModel = await loadCachedModel('bug-prediction');
    if (!bugPredictionModel) {
      bugPredictionModel = await createBugPredictionModel();
      await cacheModel(bugPredictionModel, 'bug-prediction');
    }
    modelInitStatus.bugPrediction = true;
    
    // セキュリティモデル
    securityModel = await loadCachedModel('security');
    if (!securityModel) {
      securityModel = await createSecurityModel();
      await cacheModel(securityModel, 'security');
    }
    modelInitStatus.security = true;
    
    // スタイルモデル
    styleModel = await loadCachedModel('style');
    if (!styleModel) {
      styleModel = await createStyleModel();
      await cacheModel(styleModel, 'style');
    }
    modelInitStatus.style = true;
    
    // 複雑度モデル
    complexityModel = await loadCachedModel('complexity');
    if (!complexityModel) {
      complexityModel = await createComplexityModel();
      await cacheModel(complexityModel, 'complexity');
    }
    modelInitStatus.complexity = true;
    
    // コード重複モデル
    duplicationModel = await loadCachedModel('duplication');
    if (!duplicationModel) {
      duplicationModel = await createDuplicationModel();
      await cacheModel(duplicationModel, 'duplication');
    }
    modelInitStatus.duplication = true;
    
    console.log('全てのモデルが正常に初期化されました');
  } catch (error) {
    console.error('モデル初期化エラー:', error);
    throw error;
  }
};

/**
 * コード品質評価用モデルの作成
 */
const createCodeQualityModel = async (): Promise<tf.LayersModel> => {
  const model = tf.sequential();
  model.add(tf.layers.dense({
    units: 16, 
    activation: 'relu',
    inputShape: [10] // 複雑度、行数、コメント率などの特徴
  }));
  model.add(tf.layers.dense({
    units: 8,
    activation: 'relu'
  }));
  model.add(tf.layers.dense({
    units: 4, // コードスタイル、命名規則、複雑性、ベストプラクティス
    activation: 'sigmoid'
  }));
  
  model.compile({
    optimizer: tf.train.adam(),
    loss: 'meanSquaredError'
  });
  
  return model;
};

/**
 * バグ予測モデルの作成
 */
const createBugPredictionModel = async (): Promise<tf.LayersModel> => {
  const model = tf.sequential();
  model.add(tf.layers.dense({
    units: 10,
    activation: 'relu',
    inputShape: [8] // コードメトリクスの特徴
  }));
  model.add(tf.layers.dense({
    units: 5,
    activation: 'relu'
  }));
  model.add(tf.layers.dense({
    units: 1, // バグ発生確率
    activation: 'sigmoid'
  }));
  
  model.compile({
    optimizer: tf.train.adam(),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy']
  });
  
  return model;
};

/**
 * セキュリティチェック用モデルの作成
 */
const createSecurityModel = async (): Promise<tf.LayersModel> => {
  const model = tf.sequential();
  model.add(tf.layers.embedding({
    inputDim: 5000, // 語彙サイズ
    outputDim: 16,
    inputLength: 50 // シーケンス長
  }));
  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({
    units: 8,
    activation: 'relu'
  }));
  model.add(tf.layers.dense({
    units: 5, // 脆弱性タイプの数
    activation: 'softmax'
  }));
  
  model.compile({
    optimizer: tf.train.adam(),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  return model;
};

/**
 * コードスタイル評価モデルの作成
 */
const createStyleModel = async (): Promise<tf.LayersModel> => {
  const model = tf.sequential();
  model.add(tf.layers.dense({
    units: 12,
    activation: 'relu',
    inputShape: [6] // スタイル関連の特徴
  }));
  model.add(tf.layers.dense({
    units: 6,
    activation: 'relu'
  }));
  model.add(tf.layers.dense({
    units: 3, // スタイルスコア、命名規則スコア、整形性スコア
    activation: 'sigmoid'
  }));
  
  model.compile({
    optimizer: tf.train.adam(),
    loss: 'meanSquaredError'
  });
  
  return model;
};

/**
 * 複雑度評価モデルの作成
 */
const createComplexityModel = async (): Promise<tf.LayersModel> => {
  const model = tf.sequential();
  model.add(tf.layers.dense({
    units: 8,
    activation: 'relu',
    inputShape: [5] // 複雑度関連の特徴
  }));
  model.add(tf.layers.dense({
    units: 4,
    activation: 'relu'
  }));
  model.add(tf.layers.dense({
    units: 1, // 複雑度スコア
    activation: 'sigmoid'
  }));
  
  model.compile({
    optimizer: tf.train.adam(),
    loss: 'meanSquaredError'
  });
  
  return model;
};

/**
 * コード重複モデルの作成
 */
const createDuplicationModel = async (): Promise<tf.LayersModel> => {
  const model = tf.sequential();
  model.add(tf.layers.dense({
    units: 24,
    activation: 'relu',
    inputShape: [50] // コードの特徴
  }));
  model.add(tf.layers.dense({
    units: 12,
    activation: 'relu'
  }));
  model.add(tf.layers.dense({
    units: 1, // 重複度
    activation: 'sigmoid'
  }));
  
  model.compile({
    optimizer: tf.train.adam(),
    loss: 'binaryCrossentropy'
  });
  
  return model;
};

/**
 * IndexedDBからキャッシュされたモデルをロード
 */
export const loadCachedModel = async (modelId: string): Promise<tf.LayersModel | null> => {
  try {
    return await tf.loadLayersModel(`indexeddb://${modelId}`);
  } catch (error) {
    console.log(`キャッシュされたモデル ${modelId} が見つかりません`);
    return null;
  }
};

/**
 * モデルをIndexedDBにキャッシュ
 */
export const cacheModel = async (model: tf.LayersModel, modelId: string): Promise<void> => {
  try {
    await model.save(`indexeddb://${modelId}`);
    console.log(`モデル ${modelId} をキャッシュしました`);
  } catch (error) {
    console.error(`モデル ${modelId} のキャッシュに失敗しました:`, error);
  }
};

/**
 * コード品質の予測
 */
export const predictCodeQuality = async (
  features: number[]
): Promise<{codeStyle: number; naming: number; complexity: number; bestPractices: number}> => {
  if (!codeQualityModel || !modelInitStatus.codeQuality) {
    await loadModels();
  }
  
  const tensor = tf.tensor2d([features]);
  const prediction = codeQualityModel!.predict(tensor) as tf.Tensor;
  const values = await prediction.data();
  
  tensor.dispose();
  prediction.dispose();
  
  return {
    codeStyle: Math.min(1, Math.max(0, values[0])),
    naming: Math.min(1, Math.max(0, values[1])),
    complexity: Math.min(1, Math.max(0, values[2])),
    bestPractices: Math.min(1, Math.max(0, values[3]))
  };
};

/**
 * バグ発生確率の予測
 */
export const predictBugProbability = async (features: number[]): Promise<number> => {
  if (!bugPredictionModel || !modelInitStatus.bugPrediction) {
    await loadModels();
  }
  
  const tensor = tf.tensor2d([features]);
  const prediction = bugPredictionModel!.predict(tensor) as tf.Tensor;
  const values = await prediction.data();
  
  tensor.dispose();
  prediction.dispose();
  
  return values[0];
};

/**
 * セキュリティ脆弱性の予測
 */
export const predictSecurityVulnerabilities = async (
  features: number[]
): Promise<number[]> => {
  if (!securityModel || !modelInitStatus.security) {
    await loadModels();
  }
  
  const tensor = tf.tensor2d([features]);
  const prediction = securityModel!.predict(tensor) as tf.Tensor;
  const values = await prediction.data();
  
  tensor.dispose();
  prediction.dispose();
  
  // 9種類の脆弱性に対する確率を返す
  return Array.from(values).map(v => Math.min(1, Math.max(0, v)));
};

/**
 * 複雑度スコアの予測
 */
export const predictComplexity = async (features: number[]): Promise<number> => {
  if (!complexityModel || !modelInitStatus.complexity) {
    await loadModels();
  }
  
  const tensor = tf.tensor2d([features]);
  const prediction = complexityModel!.predict(tensor) as tf.Tensor;
  const values = await prediction.data();
  
  tensor.dispose();
  prediction.dispose();
  
  return values[0];
};

/**
 * コードスタイルの予測
 */
export const predictCodeStyle = async (
  features: number[]
): Promise<{style: number; naming: number; formatting: number}> => {
  if (!styleModel || !modelInitStatus.style) {
    await loadModels();
  }
  
  const tensor = tf.tensor2d([features]);
  const prediction = styleModel!.predict(tensor) as tf.Tensor;
  const values = await prediction.data();
  
  tensor.dispose();
  prediction.dispose();
  
  return {
    style: values[0],
    naming: values[1],
    formatting: values[2]
  };
};

/**
 * 特徴抽出：コード品質
 */
export const extractCodeQualityFeatures = (
  code: string,
  language: string,
  metrics: {
    lineCount: number;
    commentCount: number;
    functionCount: number;
    nestingDepth: number;
  }
): number[] => {
  // コードから特徴を抽出
  const { lineCount, commentCount, functionCount, nestingDepth } = metrics;
  
  // 言語別の特徴抽出（言語固有の重み付け）
  const languageWeight = getLanguageWeight(language);
  
  const commentRatio = lineCount > 0 ? commentCount / lineCount : 0;
  const avgFunctionSize = functionCount > 0 ? lineCount / functionCount : lineCount;
  const complexityEstimate = calculateComplexityEstimate(code, language);
  
  // ここでは単純な特徴セットを返す
  return [
    lineCount / 1000, // 行数（正規化）
    commentRatio, // コメント率
    nestingDepth / 10, // ネスト深度（正規化）
    functionCount / 50, // 関数数（正規化）
    avgFunctionSize / 50, // 平均関数サイズ（正規化）
    complexityEstimate / 10, // 複雑度（正規化）
    languageWeight, // 言語特有の重み
    commentRatio > 0.1 ? 1 : 0, // コメント十分フラグ
    commentRatio > 0.3 ? 1 : 0, // コメント過多フラグ
    nestingDepth > 5 ? 1 : 0 // 深すぎるネストフラグ
  ];
};

/**
 * シーケンスを指定長に調整
 */
const padSequence = (sequence: number[], maxLen: number): number[] => {
  if (sequence.length > maxLen) {
    return sequence.slice(0, maxLen);
  }
  return [...sequence, ...new Array(maxLen - sequence.length).fill(0)];
};

/**
 * 言語別の重み付け値を取得
 */
const getLanguageWeight = (language: string): number => {
  const weights: Record<string, number> = {
    'javascript': 0.8,
    'typescript': 0.9,
    'python': 0.85,
    'java': 0.75,
    'go': 0.8,
    'c': 0.7,
    'cpp': 0.7,
    'csharp': 0.8,
    'jupyter': 0.85
  };
  
  return weights[language.toLowerCase()] || 0.75;
};

/**
 * 複雑度の簡易推定
 */
const calculateComplexityEstimate = (code: string, language: string): number => {
  let complexity = 0;
  
  // 制御構造を数える
  const controlStructures = [
    'if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch', 'finally'
  ];
  
  // 言語に基づいて制御構造を調整
  let langSpecificStructures: string[] = [];
  if (language === 'python') {
    langSpecificStructures = ['def', 'class', 'with', 'except', 'elif'];
  } else if (language === 'javascript' || language === 'typescript') {
    langSpecificStructures = ['function', 'class', 'async', 'await', '=>'];
  }
  
  // すべての制御構造を結合
  const allStructures = [...controlStructures, ...langSpecificStructures];
  
  // 各制御構造の出現回数をカウント
  allStructures.forEach(structure => {
    const regex = new RegExp(`\\b${structure}\\b`, 'g');
    const matches = code.match(regex);
    if (matches) {
      complexity += matches.length * 0.5;
    }
  });
  
  // ネストされたブロックを検出（簡易版）
  const lines = code.split('\n');
  let maxIndentation = 0;
  
  for (const line of lines) {
    const indentation = line.search(/\S/);
    if (indentation > 0) {
      maxIndentation = Math.max(maxIndentation, indentation);
    }
  }
  
  // ネスト深度に基づいて複雑度を加算
  complexity += maxIndentation / 4;
  
  return Math.min(10, complexity);
};

/**
 * コード重複の予測
 */
export const predictCodeDuplication = async (
  features: number[]
): Promise<number> => {
  if (!duplicationModel || !modelInitStatus.duplication) {
    await loadModels();
  }
  
  const tensor = tf.tensor2d([features]);
  const prediction = duplicationModel!.predict(tensor) as tf.Tensor;
  const values = await prediction.data();
  
  tensor.dispose();
  prediction.dispose();
  
  // 重複度（0-1の値）を返す
  return Math.min(1, Math.max(0, values[0]));
};

/**
 * 特徴抽出：セキュリティ
 */
export const extractSecurityFeatures = (
  code: string,
  language: string
): number[] => {
  // セキュリティ脆弱性の特徴を検出するためのパターン
  const securityPatterns = [
    { pattern: /eval\s*\(/g, weight: 1.0 }, // 動的コード実行
    { pattern: /document\.write\s*\(/g, weight: 0.8 }, // XSS脆弱性
    { pattern: /\.innerHTML\s*=/g, weight: 0.7 }, // XSS脆弱性
    { pattern: /exec\s*\(/g, weight: 0.9 }, // コマンドインジェクション
    { pattern: /child_process/g, weight: 0.8 }, // コマンドインジェクション
    { pattern: /\.query\s*\(/g, weight: 0.9 }, // SQLインジェクション
    { pattern: /password\s*=\s*['"`][^'"`]+['"`]/g, weight: 1.0 }, // ハードコードされた認証情報
    { pattern: /console\.log\s*\(\s*.*(?:password|token|key|secret)/g, weight: 0.6 }, // 情報漏洩
    { pattern: /Math\.random\s*\(\s*\)/g, weight: 0.5 } // 安全でない乱数生成
  ];
  
  // 特徴ベクトルの初期化
  let features: number[] = new Array(100).fill(0);
  
  // コードの行数と単語数
  const lines = code.split('\n');
  const words = code.split(/\s+/);
  
  // 基本的な特徴
  features[0] = lines.length / 1000; // 行数（正規化）
  features[1] = words.length / 5000; // 単語数（正規化）
  
  // セキュリティパターンの検出
  securityPatterns.forEach((pattern, index) => {
    const matches = code.match(pattern.pattern);
    const count = matches ? matches.length : 0;
    if (index + 2 < features.length) {
      features[index + 2] = Math.min(1, count * pattern.weight / 10);
    }
  });
  
  // 言語固有の特徴
  const languageIndex = {
    'javascript': 20,
    'typescript': 21,
    'python': 22,
    'java': 23,
    'php': 24
  }[language.toLowerCase()] || 20;
  
  if (languageIndex < features.length) {
    features[languageIndex] = 1; // 言語フラグを設定
  }
  
  return features;
};

/**
 * 特徴抽出：コード重複
 */
export const extractDuplicationFeatures = (
  code1: string,
  code2: string
): number[] => {
  // 特徴ベクトルの初期化
  let features: number[] = new Array(50).fill(0);
  
  // 両方のコードの行数
  const lines1 = code1.split('\n');
  const lines2 = code2.split('\n');
  
  // 行数の差（正規化）
  features[0] = Math.abs(lines1.length - lines2.length) / Math.max(lines1.length, lines2.length);
  
  // 単語の一致率
  const words1 = code1.split(/\s+/).filter(w => w.length > 0);
  const words2 = code2.split(/\s+/).filter(w => w.length > 0);
  
  const wordSet1 = new Set(words1);
  const wordSet2 = new Set(words2);
  
  // 共通の単語数
  const commonWords = [...wordSet1].filter(word => wordSet2.has(word));
  
  // ジャッカード係数（重複度）
  features[1] = commonWords.length / (wordSet1.size + wordSet2.size - commonWords.length);
  
  // 行の類似度
  let commonLineCount = 0;
  for (const line1 of lines1) {
    const trimmedLine1 = line1.trim();
    if (trimmedLine1.length > 0) {
      for (const line2 of lines2) {
        const trimmedLine2 = line2.trim();
        if (trimmedLine1 === trimmedLine2) {
          commonLineCount++;
          break;
        }
      }
    }
  }
  
  // 行の一致率
  features[2] = commonLineCount / Math.max(lines1.length, lines2.length);
  
  // 残りの特徴は0のまま
  
  return features;
};

/**
 * ファイル拡張子からプログラミング言語を判定
 * @param extension ファイル拡張子
 */
export const getLanguageFromExtension = (extension: string): string => {
  const extensionMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    go: 'go',
    rb: 'ruby',
    php: 'php',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    md: 'markdown'
  };
  
  return extensionMap[extension.toLowerCase()] || 'unknown';
};

/**
 * コード改善提案のための特徴量を抽出
 * @param code 分析対象のコード
 * @param language プログラミング言語
 * @returns コード改善用の特徴量ベクトル
 */
export const extractCodeImprovementFeatures = async (
  code: string, 
  language: string
): Promise<number[]> => {
  try {
    // コードの基本的な特徴を抽出
    const lines = code.split('\n');
    const codeLength = lines.length;
    
    // コメント率の計算
    const commentCount = lines.filter(line => {
      const trimmed = line.trim();
      if (language === 'javascript' || language === 'typescript') {
        return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.endsWith('*/');
      } else if (language === 'python') {
        return trimmed.startsWith('#');
      }
      return false;
    }).length;
    
    const commentRatio = commentCount / Math.max(1, codeLength);
    
    // 空白行の計算
    const emptyLineCount = lines.filter(line => line.trim() === '').length;
    const emptyLineRatio = emptyLineCount / Math.max(1, codeLength);
    
    // インデントの深さと一貫性
    let maxIndent = 0;
    let totalIndent = 0;
    let inconsistentIndentCount = 0;
    let prevIndentSize = -1;
    
    for (const line of lines) {
      if (line.trim() === '') continue;
      
      const leadingSpaces = line.length - line.trimLeft().length;
      maxIndent = Math.max(maxIndent, leadingSpaces);
      totalIndent += leadingSpaces;
      
      // インデントの一貫性をチェック
      if (prevIndentSize >= 0 && leadingSpaces > prevIndentSize) {
        const indentDiff = leadingSpaces - prevIndentSize;
        if (indentDiff !== 2 && indentDiff !== 4) {
          inconsistentIndentCount++;
        }
      }
      prevIndentSize = leadingSpaces;
    }
    
    const avgIndent = totalIndent / (codeLength - emptyLineCount);
    const indentConsistencyRatio = 1 - (inconsistentIndentCount / Math.max(1, codeLength - emptyLineCount));
    
    // 行の長さ
    const lineLengths = lines.map(line => line.length);
    const maxLineLength = Math.max(...lineLengths);
    const avgLineLength = lineLengths.reduce((sum, len) => sum + len, 0) / Math.max(1, codeLength);
    const longLineRatio = lines.filter(line => line.length > 80).length / Math.max(1, codeLength);
    
    // 命名パターン（短い変数名の割合）
    const shortNameCount = (code.match(/\b[a-zA-Z][0-9]?\b/g) || []).length;
    const allNameCount = (code.match(/\b[a-zA-Z][a-zA-Z0-9]*\b/g) || []).length;
    const shortNameRatio = shortNameCount / Math.max(1, allNameCount);
    
    // 複雑度指標（簡易版）
    const conditionCount = (code.match(/if|else|switch|case|for|while|do|try|catch/g) || []).length;
    const complexityScore = conditionCount / Math.max(10, codeLength);
    
    // 最終的な特徴量ベクトル
    const features = [
      codeLength / 1000, // 正規化したコードの長さ
      commentRatio,
      emptyLineRatio,
      avgIndent / 10,
      indentConsistencyRatio,
      maxLineLength / 120,
      avgLineLength / 80,
      longLineRatio,
      shortNameRatio,
      complexityScore
    ];
    
    // 言語固有の特徴
    if (language === 'javascript' || language === 'typescript') {
      // varの使用
      const varCount = (code.match(/\bvar\b/g) || []).length;
      const varRatio = varCount / Math.max(1, codeLength);
      
      // == vs ===
      const looseEqCount = (code.match(/==/g) || []).length - (code.match(/===/g) || []).length;
      const strictEqCount = (code.match(/===/g) || []).length;
      const looseEqRatio = looseEqCount / Math.max(1, looseEqCount + strictEqCount);
      
      features.push(varRatio);
      features.push(looseEqRatio);
    } else if (language === 'python') {
      // 例外処理のパターン
      const bareExceptCount = (code.match(/except\s*:/g) || []).length;
      const specificExceptCount = (code.match(/except\s+[A-Za-z]/g) || []).length;
      const bareExceptRatio = bareExceptCount / Math.max(1, bareExceptCount + specificExceptCount);
      
      features.push(bareExceptRatio);
    }
    
    // 特徴量を正規化して返す
    return features.map(f => Math.min(1, Math.max(0, f)));
  } catch (error) {
    console.error('コード改善特徴量抽出中にエラーが発生しました:', error);
    // エラー時はデフォルトの特徴量を返す
    return Array(12).fill(0.5);
  }
};

export default {
  initTensorFlowModel,
  extractFeatures,
  classifyCodePattern,
  trainModel,
  enhanceLearningRecommendation,
  adjustCodeQualityScore,
  saveModel,
  loadModel,
  loadModels,
  predictCodeQuality,
  predictBugProbability,
  predictSecurityVulnerabilities,
  predictComplexity,
  predictCodeStyle,
  extractCodeQualityFeatures,
  extractSecurityFeatures,
  extractDuplicationFeatures,
  getLanguageFromExtension,
  extractCodeImprovementFeatures
}; 