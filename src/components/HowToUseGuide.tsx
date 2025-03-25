import React, { useState } from 'react';
import { Github, ChevronDown, ChevronUp, ExternalLink, BookOpen, Code, BarChart3 } from 'lucide-react';

// 使い方ガイドの型定義
interface GuideSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface HowToUseGuideProps {
  onClose: () => void;
}

const HowToUseGuide: React.FC<HowToUseGuideProps> = ({ onClose }) => {
  const [expandedSection, setExpandedSection] = useState<string>('github');

  // セクションの開閉を切り替える
  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? '' : sectionId);
  };

  // ガイドセクションの定義
  const guideSections: GuideSection[] = [
    {
      id: 'github',
      title: 'GitHubの連携方法',
      content: (
        <div className="space-y-4">
          <p>
            CodeCoachでは、GitHubアカウントを連携することでリポジトリのコード分析や学習推奨が利用できます。
            以下の手順でGitHubとの連携を行ってください。
          </p>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">連携手順</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>ログイン画面で「GitHub」ボタンをクリック</li>
              <li>GitHubの認証画面が表示されたら、アカウント情報を入力</li>
              <li>要求される権限（リポジトリ閲覧など）を確認し、「Authorize」をクリック</li>
              <li>連携が完了すると、自動的にCodeCoachのダッシュボードに戻ります</li>
            </ol>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-300 flex items-center mb-2">
              <Github className="mr-2 h-5 w-5" />
              必要な権限について
            </h4>
            <p className="text-yellow-700 dark:text-yellow-400">
              CodeCoachはコード分析のために以下の権限を必要とします：
            </p>
            <ul className="list-disc list-inside mt-2 text-yellow-700 dark:text-yellow-400">
              <li><code>repo</code> - プライベートリポジトリを含むリポジトリへのアクセス</li>
              <li><code>read:user</code> - ユーザー情報の読み取り</li>
              <li><code>user:email</code> - メールアドレスの読み取り</li>
            </ul>
            <p className="mt-2 text-yellow-700 dark:text-yellow-400">
              これらの権限はコード分析とパーソナライズされた学習推奨のためだけに使用されます。
            </p>
          </div>
          
          <div className="mt-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">連携がうまくいかない場合</h4>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>ブラウザのCookieとキャッシュをクリアしてから再試行してください</li>
              <li>GitHubで二要素認証を使用している場合は、認証プロセスで追加の確認が必要な場合があります</li>
              <li>GitHubのアクセストークンが期限切れの場合は、一度ログアウトして再度連携を行ってください</li>
            </ul>
          </div>
          
          <div className="flex justify-end">
            <a 
              href="https://github.com/settings/connections/applications" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              GitHubのアプリ連携設定を確認する
              <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </div>
        </div>
      )
    },
    {
      id: 'analysis',
      title: 'コード分析の使い方',
      content: (
        <div className="space-y-4">
          <p>
            CodeCoachのコード分析機能を使って、コードの品質向上やベストプラクティスの学習ができます。
          </p>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">分析の手順</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>ダッシュボードの「リポジトリ一覧」から分析したいリポジトリを選択</li>
              <li>自動的にコード分析が開始されます</li>
              <li>分析結果から、コードスタイル、命名規則、複雑性などの評価を確認できます</li>
              <li>「推奨スキル」タブで、分析結果に基づいた学習リソースを確認できます</li>
            </ol>
          </div>
          
          <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <span>
              コード分析はTensorFlow.jsを使用して、ブラウザ内で安全に処理されます。
              コードはサードパーティには共有されません。
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'learning',
      title: 'パーソナライズされた学習',
      content: (
        <div className="space-y-4">
          <p>
            CodeCoachは分析結果に基づいて、あなたのスキルレベルとコーディングスタイルに合わせた学習リソースを提案します。
          </p>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">学習機能の使い方</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
              <li>コード分析が完了したら「推奨スキル」タブに移動</li>
              <li>言語やフレームワークごとに分類された学習リソースを確認</li>
              <li>各スキルをクリックすると、詳細な説明とリソースリンクが表示されます</li>
              <li>学習を進めながら、定期的にコード分析を実行して進捗を確認しましょう</li>
            </ol>
          </div>
          
          <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
            <BookOpen className="h-5 w-5 text-green-500" />
            <span>
              推奨スキルは定期的に更新され、最新のコーディングトレンドやベストプラクティスを反映します。
            </span>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            使い方ガイド
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {guideSections.map((section) => (
              <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  className="w-full p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <h3 className="font-medium text-gray-900 dark:text-white">{section.title}</h3>
                  {expandedSection === section.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  )}
                </button>
                
                {expandedSection === section.id && (
                  <div className="p-4 bg-white dark:bg-gray-800">
                    {section.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowToUseGuide; 