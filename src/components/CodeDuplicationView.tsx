import React, { useState } from 'react';
import { DuplicationResult } from '../services/duplicateDetectionService';

interface CodeDuplicationViewProps {
  duplications: DuplicationResult[];
}

const CodeDuplicationView: React.FC<CodeDuplicationViewProps> = ({ duplications }) => {
  const [expandedDuplication, setExpandedDuplication] = useState<number | null>(null);
  
  // 類似度に基づいた色を取得
  const getSimilarityColorClass = (similarity: number): string => {
    if (similarity >= 0.95) return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    if (similarity >= 0.9) return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
    if (similarity >= 0.85) return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
  };
  
  // パーセンテージ形式で類似度を表示
  const formatSimilarity = (similarity: number): string => {
    return `${Math.round(similarity * 100)}%`;
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        コード重複の検出結果
      </h3>
      
      {duplications.length === 0 ? (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          重複コードは検出されませんでした
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              検出された重複: {duplications.length}
            </span>
            <div className="flex space-x-2 text-xs">
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
                95%+ (厳密な重複)
              </span>
              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
                90-95% (高い重複)
              </span>
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                85-90% (部分的な重複)
              </span>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                80-85% (軽微な重複)
              </span>
            </div>
          </div>
          
          {duplications.map((duplication, index) => (
            <div 
              key={index}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              <div 
                className={`p-3 flex justify-between items-center cursor-pointer ${getSimilarityColorClass(duplication.similarity)}`}
                onClick={() => setExpandedDuplication(expandedDuplication === index ? null : index)}
              >
                <div className="flex items-center">
                  <span className="font-medium mr-2">
                    類似度: {formatSimilarity(duplication.similarity)}
                  </span>
                  <span className="text-sm">
                    {duplication.blockA.file.split('/').pop()} と {duplication.blockB.file.split('/').pop()}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-xs">
                    行 {duplication.blockA.startLine}-{duplication.blockA.endLine} と 
                    行 {duplication.blockB.startLine}-{duplication.blockB.endLine}
                  </span>
                  <svg 
                    className={`h-5 w-5 transform transition-transform ${expandedDuplication === index ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              {expandedDuplication === index && (
                <div className="bg-white dark:bg-gray-800 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {duplication.blockA.file}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          行 {duplication.blockA.startLine}-{duplication.blockA.endLine}
                        </span>
                      </div>
                      <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
                        {duplication.blockA.content}
                      </pre>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {duplication.blockB.file}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          行 {duplication.blockB.startLine}-{duplication.blockB.endLine}
                        </span>
                      </div>
                      <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
                        {duplication.blockB.content}
                      </pre>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      改善のためのアドバイス:
                    </h4>
                    <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400">
                      <li>重複するコードを共通の関数やヘルパーに抽出することを検討してください。</li>
                      <li>DRY原則（Don't Repeat Yourself）に従い、コードの再利用性を高めましょう。</li>
                      <li>共通の機能をユーティリティクラスやモジュールにまとめることで、保守性が向上します。</li>
                      {duplication.similarity >= 0.95 && (
                        <li className="text-red-600 dark:text-red-400">
                          このコードは完全に重複しています。早急にリファクタリングすることをお勧めします。
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
              コード重複に関するベストプラクティス
            </h4>
            <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li>重複コードはバグ修正時に問題を引き起こす可能性があります（一箇所だけ修正して他を忘れるなど）。</li>
              <li>共通の機能は適切に名前付けされた関数やクラスに抽出しましょう。</li>
              <li>ユーティリティ関数や共有コンポーネントを作成して、再利用可能なコードを促進しましょう。</li>
              <li>高レベルの抽象化（継承、コンポジション、ミックスインなど）を活用してコードの共有を実現しましょう。</li>
              <li>類似した機能には共通のインターフェースやベースクラスの使用を検討しましょう。</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeDuplicationView; 