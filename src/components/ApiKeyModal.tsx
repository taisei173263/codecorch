import React, { useState, useEffect } from 'react';
import { openAIService } from '../services/openaiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  monthlyUsage: {
    current: number;
    limit: number;
  };
  initialError?: string | null;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  monthlyUsage,
  initialError = null
}) => {
  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyStatus, setKeyStatus] = useState<{ hasCustomKey: boolean; customKey?: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // APIキーの状態を取得
  useEffect(() => {
    if (isOpen) {
      const fetchKeyStatus = async () => {
        const status = await openAIService.getUserApiKeyStatus();
        setKeyStatus(status);
      };
      fetchKeyStatus();
    }
  }, [isOpen]);

  // エラーが設定されたら表示
  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!apiKey.trim()) {
      setError('APIキーを入力してください');
      return;
    }
    
    // APIキーの簡易バリデーション（sk-で始まる文字列）
    if (!apiKey.trim().startsWith('sk-')) {
      setError('有効なOpenAI APIキーを入力してください（sk-で始まります）');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = await openAIService.saveCustomApiKey(apiKey.trim());
      if (success) {
        // 保存成功後にAPIキーの状態を更新
        const status = await openAIService.getUserApiKeyStatus();
        setKeyStatus(status);
        setApiKey(''); // 入力をクリア
        onSuccess();
      } else {
        setError('APIキーの保存に失敗しました。再度お試しください。');
      }
    } catch (err) {
      setError('エラーが発生しました: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setIsRemoving(true);
    try {
      // APIキーを削除する新しいメソッドの呼び出し
      const success = await openAIService.saveCustomApiKey('');
      if (success) {
        // 削除成功後にAPIキーの状態を更新
        const status = await openAIService.getUserApiKeyStatus();
        setKeyStatus(status);
        onSuccess();
      } else {
        setError('APIキーの削除に失敗しました。再度お試しください。');
      }
    } catch (err) {
      setError('エラーが発生しました: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">APIキーの設定</h2>
          
          {/* 現在のAPIキー状態表示 */}
          <div className={`inline-flex items-center justify-center px-4 py-2 rounded-full 
            ${keyStatus?.hasCustomKey 
              ? 'bg-green-100 text-green-800' 
              : 'bg-amber-100 text-amber-800'} mb-4`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>
              {keyStatus?.hasCustomKey 
                ? '🔐 カスタムAPIキーを使用中（使用回数無制限）' 
                : monthlyUsage.current >= monthlyUsage.limit 
                  ? `🎯 今月の無料利用枠（${monthlyUsage.limit}回）を使い切りました！` 
                  : `🔑 残り無料回数: ${monthlyUsage.limit - monthlyUsage.current}/${monthlyUsage.limit}回`}
            </span>
          </div>
        </div>
        
        {/* カスタムAPIキー使用中の場合に削除ボタンを表示 */}
        {keyStatus?.hasCustomKey && (
          <div className="bg-gray-100 dark:bg-gray-700 rounded-md p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  カスタムAPIキーを使用中
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  使用回数カウントはされません
                </p>
              </div>
              <button
                type="button"
                className="px-3 py-1 rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 text-sm"
                onClick={handleRemoveApiKey}
                disabled={isRemoving}
              >
                {isRemoving ? '削除中...' : 'APIキーを削除'}
              </button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {keyStatus?.hasCustomKey ? '新しいOpenAI APIキー' : 'OpenAI APIキー'}
            </label>
            <input
              id="apiKey"
              type="password"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isSubmitting}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>
          
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3 mt-6">
            <button
              type="button"
              className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              onClick={onClose}
              disabled={isSubmitting}
            >
              閉じる
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? '保存中...' : 'APIキーを保存'}
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-xs text-gray-600 dark:text-gray-400">
          <p>📝 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">OpenAIのダッシュボード</a>からAPIキーを取得できます</p>
          <p className="mt-1">🔒 APIキーはあなたのブラウザと当サービスのデータベースのみに保存され、第三者と共有されることはありません</p>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal; 