import React, { useState, useEffect } from 'react';
import { openAIService } from '../services/openaiService';
import ApiKeyModal from './ApiKeyModal';
import ReactMarkdown from 'react-markdown';

interface AICodeReviewProps {
  code: string;
  language: string;
  context?: string;
}

const AICodeReview: React.FC<AICodeReviewProps> = ({ code, language, context }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [monthlyUsage, setMonthlyUsage] = useState({ current: 0, limit: 50 });

  // 月間利用量を取得
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const usage = await openAIService.getMonthlyUsage();
        setMonthlyUsage(usage);
      } catch (err) {
        console.error('利用量の取得に失敗しました:', err);
      }
    };

    fetchUsage();
  }, []);

  const handleGetReview = async () => {
    if (!code.trim()) {
      setError('レビュー対象のコードが空です');
      return;
    }

    setLoading(true);
    setError(null);
    setReview(null);

    try {
      const response = await openAIService.getCodeReview({
        code,
        language,
        context
      });

      if (response.success && response.data) {
        const content = response.data.choices[0]?.message?.content;
        if (content) {
          setReview(content);
          
          // レビュー成功後に利用回数を更新
          setTimeout(async () => {
            // 少し遅延させてFirestoreの更新を待つ
            const usage = await openAIService.getMonthlyUsage();
            console.log('AIレビュー成功後の利用回数更新:', usage);
            setMonthlyUsage(usage);
          }, 500);
        } else {
          setError('レスポンスからコンテンツを取得できませんでした');
        }
      } else if (response.error === 'API_KEY_LIMIT_EXCEEDED') {
        // API利用上限に達した場合
        const usage = await openAIService.getMonthlyUsage();
        setMonthlyUsage(usage);
        
        // 月間利用回数が上限未満の場合はエラーメッセージを表示し、
        // 上限以上の場合のみAPIキーモーダルを表示する
        if (usage.current >= usage.limit) {
          setShowApiKeyModal(true);
        } else {
          setError('APIサービスにエラーが発生しました。しばらく待ってから再試行してください。');
        }
      } else if (response.error === 'INVALID_API_KEY') {
        // 無効なAPIキーの場合、エラーメッセージを表示してAPIキーモーダルを表示
        setError(response.errorMessage || '無効なAPIキーです。別のAPIキーを入力してください。');
        setShowApiKeyModal(true);
      } else {
        setError(response.error || '不明なエラーが発生しました');
      }
    } catch (err) {
      setError('エラーが発生しました: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeySuccess = async () => {
    setShowApiKeyModal(false);
    // APIキーが設定されたのでリクエストを再試行
    handleGetReview();
  };

  return (
    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        AIコードレビュー
      </h2>
      
      <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
        <p>AIを使用してコードの品質を分析し、改善点を提案します。</p>
        <div className="mt-1 flex items-center">
          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full">
            今月の利用回数: {monthlyUsage.current}/{monthlyUsage.limit}
          </span>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={handleGetReview}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              分析中...
            </span>
          ) : 'AIレビューを取得'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md mb-4">
          <p className="font-medium">エラーが発生しました</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {review && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
          <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">レビュー結果</h3>
          <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
            <ReactMarkdown>{review}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* APIキー入力モーダル */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSuccess={handleApiKeySuccess}
        monthlyUsage={monthlyUsage}
        initialError={error}
      />
    </div>
  );
};

export default AICodeReview; 