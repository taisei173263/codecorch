import React, { useState, useEffect } from 'react';
import { openAIService } from '../services/openaiService';
import ApiKeyModal from './ApiKeyModal';
import ReactMarkdown from 'react-markdown';

interface CodeExplainerProps {
  code: string;
  language: string;
}

const CodeExplainer: React.FC<CodeExplainerProps> = ({ code, language }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [monthlyUsage, setMonthlyUsage] = useState({ current: 0, limit: 50 });
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');

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

  const handleGetExplanation = async () => {
    if (!code.trim()) {
      setError('説明対象のコードが空です');
      return;
    }

    setLoading(true);
    setError(null);
    setExplanation(null);

    try {
      const response = await openAIService.explainCode({
        code,
        language,
        experienceLevel
      });

      if (response.success && response.data) {
        const content = response.data.choices[0]?.message?.content;
        if (content) {
          setExplanation(content);
          
          // 説明生成成功後に利用回数を更新
          setTimeout(async () => {
            // 少し遅延させてFirestoreの更新を待つ
            const usage = await openAIService.getMonthlyUsage();
            console.log('コード説明後の利用回数更新:', usage);
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
    handleGetExplanation();
  };

  return (
    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        コードエクスプレイナー
      </h2>
      
      <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
        <p>AIがコードの目的、ロジック、アルゴリズムを詳しく説明します。</p>
        <div className="mt-1 flex items-center">
          <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full">
            今月の利用回数: {monthlyUsage.current}/{monthlyUsage.limit}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          説明の詳細レベル
        </label>
        <div className="flex space-x-2">
          <button
            type="button"
            className={`px-3 py-2 text-sm rounded-md ${
              experienceLevel === 'beginner'
                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 border-green-300 dark:border-green-700'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
            } border`}
            onClick={() => setExperienceLevel('beginner')}
          >
            初心者向け
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm rounded-md ${
              experienceLevel === 'intermediate'
                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 border-green-300 dark:border-green-700'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
            } border`}
            onClick={() => setExperienceLevel('intermediate')}
          >
            中級者向け
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm rounded-md ${
              experienceLevel === 'advanced'
                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 border-green-300 dark:border-green-700'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
            } border`}
            onClick={() => setExperienceLevel('advanced')}
          >
            上級者向け
          </button>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={handleGetExplanation}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              生成中...
            </span>
          ) : 'コードを説明'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md mb-4">
          <p className="font-medium">エラーが発生しました</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {explanation && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
          <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">コードの説明</h3>
          <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
            <ReactMarkdown>{explanation}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* APIキー入力モーダル */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSuccess={handleApiKeySuccess}
        monthlyUsage={monthlyUsage}
      />
    </div>
  );
};

export default CodeExplainer; 