/**
 * ブラウザでTransformersモデルを実行するサービス
 * WebワーカーとWebAssemblyを使用してCodeBERTモデルを実行します
 */

// CodeBERTモデルの状態管理
let modelLoading = false;
let modelLoaded = false;
let modelInstance: any = null;

// 特徴をキャッシュするためのオブジェクト
const featureCache: Record<string, number[]> = {};

// モデルのURL設定
const MODEL_BASE_URL = 'https://cdn.jsdelivr.net/npm/@xenova/transformers-js@2.6.0/';
const MODEL_NAME = 'Xenova/codebert-base';

/**
 * 文字列からハッシュを生成（キャッシュキー用）
 */
const hashCode = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
};

/**
 * WebAssembly版CodeBERTモデルをロード
 */
const loadModel = async () => {
  if (modelLoaded && modelInstance) return true;
  if (modelLoading) {
    // モデルがロード中の場合は待機
    while (modelLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return modelLoaded;
  }

  modelLoading = true;
  console.log('CodeBERTモデルをロード中...');

  try {
    // Transformers.jsのスクリプトを動的に読み込み
    await loadTransformersJS();

    // Web Workerの作成とモデルのロード
    await initializeWorker();
    
    modelLoaded = true;
    console.log('CodeBERTモデルのロードが完了しました');
    return true;
  } catch (error) {
    console.error('モデルのロードに失敗:', error);
    return false;
  } finally {
    modelLoading = false;
  }
};

/**
 * Transformers.jsライブラリを動的に読み込む
 */
const loadTransformersJS = async () => {
  return new Promise<void>((resolve, reject) => {
    // すでにロードされている場合はスキップ
    if ((window as any).transformers) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@xenova/transformers-js@2.6.0/dist/transformers.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Transformers.jsのロードに失敗しました'));
    document.head.appendChild(script);
  });
};

/**
 * Web Workerを初期化してモデルをロード
 */
const initializeWorker = async () => {
  const workerCode = `
    // Transformers.jsのインポート
    importScripts('${MODEL_BASE_URL}dist/transformers.min.js');

    let model = null;
    let tokenizer = null;

    // メインスレッドからのメッセージを処理
    self.onmessage = async function(e) {
      const { action, data } = e.data;
      
      if (action === 'loadModel') {
        try {
          // Pipeline APIを使用してモデルをロード
          const { pipeline } = await import('${MODEL_BASE_URL}dist/transformers.min.js');
          const featureExtraction = await pipeline('feature-extraction', '${MODEL_NAME}');
          
          // モデルとトークナイザへの参照を保存
          model = featureExtraction.model;
          tokenizer = featureExtraction.tokenizer;
          
          self.postMessage({ action: 'modelLoaded', success: true });
        } catch (error) {
          self.postMessage({ 
            action: 'error', 
            error: 'モデルのロードに失敗: ' + error.message,
            success: false 
          });
        }
      } 
      else if (action === 'extractFeatures') {
        if (!model || !tokenizer) {
          self.postMessage({ 
            action: 'error', 
            error: 'モデルがロードされていません',
            success: false 
          });
          return;
        }

        try {
          const { code } = data;
          
          // コードをトークン化
          const inputs = await tokenizer(code, {
            padding: true,
            truncation: true,
            max_length: 512,
            return_tensors: 'pt'
          });
          
          // モデルを使用して特徴ベクトルを抽出
          const output = await model(inputs);
          
          // 最初のトークンの特徴を取得 (CLS token)
          const features = Array.from(output.last_hidden_state.data[0]);
          
          self.postMessage({
            action: 'featuresExtracted',
            features,
            success: true
          });
        } catch (error) {
          self.postMessage({ 
            action: 'error', 
            error: '特徴抽出に失敗: ' + error.message,
            success: false 
          });
        }
      }
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  
  // Web Workerを作成
  const worker = new Worker(workerUrl);
  (window as any).codeFeatureWorker = worker;
  
  // モデルロードを要求
  return new Promise<void>((resolve, reject) => {
    const messageHandler = (e: MessageEvent) => {
      const { action, success, error } = e.data;
      
      if (action === 'modelLoaded' && success) {
        worker.removeEventListener('message', messageHandler);
        resolve();
      } else if (action === 'error') {
        worker.removeEventListener('message', messageHandler);
        reject(new Error(error));
      }
    };
    
    worker.addEventListener('message', messageHandler);
    worker.postMessage({ action: 'loadModel' });
  });
};

/**
 * CodeBERTモデルを使用してコードから特徴を抽出
 */
export const extractFeatures = async (code: string): Promise<number[]> => {
  // キャッシュをチェック
  const cacheKey = hashCode(code);
  if (featureCache[cacheKey]) {
    return featureCache[cacheKey];
  }

  // モデルをロード
  const isLoaded = await loadModel();
  if (!isLoaded) {
    throw new Error('モデルのロードに失敗しました');
  }

  return new Promise((resolve, reject) => {
    const worker = (window as any).codeFeatureWorker;
    
    // レスポンスハンドラを設定
    const messageHandler = (e: MessageEvent) => {
      const { action, features, success, error } = e.data;
      
      if (action === 'featuresExtracted' && success) {
        worker.removeEventListener('message', messageHandler);
        // キャッシュに保存
        featureCache[cacheKey] = features;
        resolve(features);
      } else if (!success) {
        worker.removeEventListener('message', messageHandler);
        reject(new Error(error || '特徴抽出に失敗しました'));
      }
    };
    
    worker.addEventListener('message', messageHandler);
    
    // 特徴抽出リクエストを送信
    worker.postMessage({
      action: 'extractFeatures',
      data: { code }
    });
  });
};

/**
 * 特徴ベクトルから各スコアを計算
 */
export const calculateScoresFromFeatures = (features: number[]): {
  codeStyleScore: number;
  namingScore: number;
  complexityScore: number;
  bestPracticesScore: number;
} => {
  // 特徴ベクトルの各部分からスコアを計算
  // CodeBERTの出力は768次元のベクトル
  
  // 特徴ベクトルを各スコアの計算に使用する部分に分割
  const styleFeatures = features.slice(0, 192);
  const namingFeatures = features.slice(192, 384);
  const complexityFeatures = features.slice(384, 576);
  const bestPracticesFeatures = features.slice(576, 768);
  
  // 各ベクトルから正規化されたスコアを計算
  const codeStyleScore = calculateScore(styleFeatures, 0.8);
  const namingScore = calculateScore(namingFeatures, 0.7);
  const complexityScore = calculateScore(complexityFeatures, 0.6);
  const bestPracticesScore = calculateScore(bestPracticesFeatures, 0.9);
  
  return {
    codeStyleScore: Math.round(codeStyleScore * 10),
    namingScore: Math.round(namingScore * 10),
    complexityScore: Math.round(complexityScore * 10),
    bestPracticesScore: Math.round(bestPracticesScore * 10)
  };
};

/**
 * 特徴ベクトルからスコアを計算
 * CodeBERTの特徴ベクトルを使用して品質スコアを生成
 */
const calculateScore = (features: number[], weight: number): number => {
  if (features.length === 0) return 0.5;
  
  // 特徴の平均を計算
  let sum = 0;
  let absSum = 0;
  for (const value of features) {
    sum += value;
    absSum += Math.abs(value);
  }
  
  // 分散を計算
  const mean = sum / features.length;
  let variance = 0;
  for (const value of features) {
    variance += Math.pow(value - mean, 2);
  }
  variance /= features.length;
  
  // 特徴ベクトルの統計情報からスコアを計算
  // 平均、分散、絶対値の平均を使用
  const normalizedMean = sigmoid(mean * 5);
  const normalizedVariance = sigmoid(Math.sqrt(variance) * 3);
  const normalizedAbsMean = sigmoid(absSum / features.length * 4);
  
  // 重み付き平均
  const score = (normalizedMean * 0.3 + normalizedVariance * 0.3 + normalizedAbsMean * 0.4) * weight;
  
  // 0.1から1.0の範囲に制限
  return Math.min(1.0, Math.max(0.1, score));
};

/**
 * シグモイド関数 - 値を0-1の範囲に変換
 */
const sigmoid = (x: number): number => {
  return 1 / (1 + Math.exp(-x));
};

/**
 * CodeBERTモデルを使用してコードを分析
 */
export const analyzeCodeWithCodeBERT = async (code: string) => {
  try {
    // 特徴を抽出
    const features = await extractFeatures(code);
    
    // スコアを計算
    const scores = calculateScoresFromFeatures(features);
    
    // ローカルストレージにキャッシュ
    const cacheKey = `codebert_${hashCode(code)}`;
    localStorage.setItem(cacheKey, JSON.stringify(scores));
    
    return scores;
  } catch (error) {
    console.error('CodeBERT分析エラー:', error);
    return null; // エラー時はnullを返す
  }
};

export default {
  analyzeCodeWithCodeBERT,
  extractFeatures,
  calculateScoresFromFeatures
}; 