import { db, auth, firebase } from '../firebase/services';

// OpenAI API関連の型定義
interface ApiKeyStatus {
  hasCustomKey: boolean;
  customKey?: string;
  monthlyRequestCount: number;
  lastResetDate: Date;
}

// トランザクションの型定義
type FirestoreTransaction = any; // Firebaseの型が正確にインポートできない場合のフォールバック

interface ReviewRequest {
  code: string;
  language: string; 
  context?: string;
}

interface ExplainRequest {
  code: string;
  language: string;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

const MONTHLY_FREE_LIMIT = 50;
const API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-3.5-turbo-0125';

// サーバーサイドのAPIキー（環境変数から取得）
const SERVER_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

// サーバー側のAPIキーが設定されているかチェック
if (!SERVER_API_KEY) {
  console.warn('VITE_OPENAI_API_KEY is not set. OpenAI functionality will be limited.');
}

export class OpenAIService {
  private async getUserApiKeyStatus(): Promise<ApiKeyStatus | null> {
    // Firebaseが利用可能でない場合のデフォルト状態を返す
    if (!db || !auth) {
      console.warn('Firebase services not available');
      return {
        hasCustomKey: false,
        monthlyRequestCount: 0,
        lastResetDate: new Date()
      };
    }

    try {
      // 認証ユーザーの取得
      const user = auth.currentUser;
      if (!user) {
        console.warn('User not authenticated');
        return {
          hasCustomKey: false, 
          monthlyRequestCount: 0,
          lastResetDate: new Date()
        };
      }

      const userRef = db.collection('users').doc(user.uid);
      const settingsRef = userRef.collection('settings').doc('apiKey');
      const apiKeyDoc = await settingsRef.get();

      if (!apiKeyDoc.exists) {
        // 初期状態の作成
        const initialStatus: ApiKeyStatus = {
          hasCustomKey: false,
          monthlyRequestCount: 0,
          lastResetDate: new Date()
        };
        try {
          await settingsRef.set(initialStatus);
        } catch (error) {
          console.error('APIキー初期状態の保存に失敗:', error);
        }
        return initialStatus;
      }

      const data = apiKeyDoc.data() as ApiKeyStatus;
      // Firestoreのタイムスタンプを通常のDateに変換 (Firebase v8)
      const timestamp = data.lastResetDate as any;
      if (timestamp && typeof timestamp.toDate === 'function') {
        data.lastResetDate = timestamp.toDate();
      }
      
      // 月初めに利用回数をリセット
      const now = new Date();
      const lastReset = data.lastResetDate;
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        const updatedStatus = {
          ...data,
          monthlyRequestCount: 0,
          lastResetDate: now
        };
        try {
          await settingsRef.update(updatedStatus);
        } catch (error) {
          console.error('APIキー状態の更新に失敗:', error);
        }
        return updatedStatus;
      }

      return data;
    } catch (error) {
      console.error('APIキー状態の取得に失敗:', error);
      return {
        hasCustomKey: false,
        monthlyRequestCount: 0,
        lastResetDate: new Date()
      };
    }
  }

  private async incrementRequestCount(): Promise<void> {
    if (!auth || !auth.currentUser) {
      console.warn('認証が完了していないため、利用回数を記録できません');
      return;
    }

    const user = auth.currentUser;
    try {
      // トランザクションを使用して確実にカウントを更新
      const userRef = db.collection('users').doc(user.uid);
      const settingsRef = userRef.collection('settings').doc('apiKey');
      
      await db.runTransaction(async (transaction: FirestoreTransaction) => {
        const doc = await transaction.get(settingsRef);
        if (!doc.exists) {
          // ドキュメントが存在しない場合は新規作成
          transaction.set(settingsRef, {
            hasCustomKey: false,
            monthlyRequestCount: 1,
            lastResetDate: new Date()
          });
        } else {
          const currentCount = doc.data()?.monthlyRequestCount || 0;
          transaction.update(settingsRef, { 
            monthlyRequestCount: currentCount + 1 
          });
        }
      });
      
      console.log('利用回数を更新しました');
    } catch (error) {
      console.error('利用回数の更新に失敗:', error);
    }
  }

  public async saveCustomApiKey(apiKey: string): Promise<boolean> {
    if (!auth || !auth.currentUser) {
      console.error('認証が完了していないため、APIキーを保存できません');
      return false;
    }

    const user = auth.currentUser;
    try {
      const userRef = db.collection('users').doc(user.uid);
      const settingsRef = userRef.collection('settings').doc('apiKey');
      await settingsRef.update({
        hasCustomKey: true,
        customKey: apiKey
      });
      return true;
    } catch (error) {
      console.error('APIキーの保存に失敗しました:', error);
      // ドキュメントが存在しない場合はsetで作成を試みる
      try {
        const userRef = db.collection('users').doc(user.uid);
        const settingsRef = userRef.collection('settings').doc('apiKey');
        await settingsRef.set({
          hasCustomKey: true,
          customKey: apiKey,
          monthlyRequestCount: 0,
          lastResetDate: new Date()
        });
        return true;
      } catch (setError) {
        console.error('APIキーの新規作成に失敗しました:', setError);
        return false;
      }
    }
  }

  private async getApiKey(): Promise<string | null> {
    const keyStatus = await this.getUserApiKeyStatus();
    if (!keyStatus) return null;

    // カスタムキーがある場合はそれを使用
    if (keyStatus.hasCustomKey && keyStatus.customKey) {
      return keyStatus.customKey;
    }

    // 無料枠の使用回数を確認
    if (keyStatus.monthlyRequestCount >= MONTHLY_FREE_LIMIT) {
      return null; // 上限に達した場合、null返却でUIが対応
    }

    // サーバーキーを使用
    return SERVER_API_KEY;
  }

  public async getMonthlyUsage(): Promise<{ current: number, limit: number }> {
    // キャッシュを使わずに必ず最新データを取得
    try {
      if (!auth || !auth.currentUser) {
        console.warn('認証されていないため、利用数を取得できません');
        return { current: 0, limit: MONTHLY_FREE_LIMIT };
      }

      const user = auth.currentUser;
      const userRef = db.collection('users').doc(user.uid);
      const settingsRef = userRef.collection('settings').doc('apiKey');
      
      // キャッシュを使わず必ず最新データを取得
      const apiKeyDoc = await settingsRef.get({ source: 'server' });
      
      if (!apiKeyDoc.exists) {
        console.log('利用状況データが存在しません、デフォルト値を使用します');
        return { current: 0, limit: MONTHLY_FREE_LIMIT };
      }
      
      const data = apiKeyDoc.data() as ApiKeyStatus;
      console.log('最新の利用状況を取得しました:', data.monthlyRequestCount);
      
      return { 
        current: data.monthlyRequestCount || 0, 
        limit: MONTHLY_FREE_LIMIT 
      };
    } catch (error) {
      console.error('利用状況の取得に失敗:', error);
      return { current: 0, limit: MONTHLY_FREE_LIMIT };
    }
  }

  private async makeOpenAIRequest(
    messages: Array<{ role: string; content: string }>,
    temperature: number = 0.7
  ): Promise<ApiResponse> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        error: 'API_KEY_LIMIT_EXCEEDED'
      };
    }

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: messages,
          temperature: temperature,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error?.message || '不明なエラーが発生しました'
        };
      }

      const data = await response.json();
      
      // APIリクエストが成功したら必ず使用回数をインクリメント
      // カスタムキーの場合でも使用回数を記録
      await this.incrementRequestCount();
      console.log('OpenAI API使用回数をインクリメントしました');

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('OpenAI API呼び出しエラー:', error);
      return {
        success: false,
        error: '通信エラーが発生しました'
      };
    }
  }

  public async getCodeReview(request: ReviewRequest): Promise<ApiResponse> {
    const systemPrompt = `あなたは熟練したプログラマーであり、高品質なコードレビューを提供します。
以下のコードを分析し、次の点について具体的なフィードバックを日本語で提供してください：

1. コードの品質と読みやすさ
2. 潜在的なバグやエラー
3. パフォーマンスの最適化の機会
4. セキュリティ上の懸念
5. ベストプラクティスの適用
6. リファクタリングの提案

フィードバックは具体的な例とともに提供し、なぜその変更が重要なのかを説明してください。
建設的かつ教育的な口調を心がけ、コードの良い点も積極的に評価してください。`;

    const contextInfo = request.context 
      ? `\n\n追加コンテキスト情報: ${request.context}`
      : '';

    const messages = [
      { role: 'system', content: systemPrompt + contextInfo },
      { role: 'user', content: `以下の${request.language}コードをレビューしてください：\n\n\`\`\`${request.language}\n${request.code}\n\`\`\`` }
    ];

    return this.makeOpenAIRequest(messages, 0.7);
  }

  public async explainCode(request: ExplainRequest): Promise<ApiResponse> {
    let experienceLevelPrompt = '';
    
    switch(request.experienceLevel) {
      case 'beginner':
        experienceLevelPrompt = '初心者向けに基本的な概念からわかりやすく説明し、技術用語は必要に応じて解説してください。';
        break;
      case 'intermediate':
        experienceLevelPrompt = '中級者向けに、一般的なプログラミングの概念は既知として、より実践的な解説をしてください。';
        break;
      case 'advanced':
        experienceLevelPrompt = '上級者向けに、高度な概念や最適化、設計パターンに焦点を当てて解説してください。';
        break;
      default:
        experienceLevelPrompt = '様々な経験レベルの人が理解できるようバランスの取れた説明をしてください。';
    }

    const systemPrompt = `あなたは優れたプログラミング教育者です。提供されたコードを分析し、そのロジック、目的、実装の詳細を明確に説明してください。
${experienceLevelPrompt}
説明は日本語で、構造化された形式で提供してください：

1. コードの全体的な目的と機能
2. 主要なロジックとアルゴリズムの説明
3. 使用されている重要なデザインパターンやテクニック
4. コードの各部分がどのように連携しているか

専門用語を使う場合は適切に解説し、必要に応じて例やアナロジーを使って概念を説明してください。`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `以下の${request.language}コードを説明してください：\n\n\`\`\`${request.language}\n${request.code}\n\`\`\`` }
    ];

    return this.makeOpenAIRequest(messages, 0.5);
  }
}

export const openAIService = new OpenAIService(); 