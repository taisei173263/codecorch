import React, { useEffect, useRef } from 'react';
import { ComplexityVisualization, FunctionComplexity } from '../services/complexityVisualizationService';

interface CodeComplexityVisualizerProps {
  complexityData: ComplexityVisualization;
}

const CodeComplexityVisualizer: React.FC<CodeComplexityVisualizerProps> = ({ complexityData }) => {
  // ヒートマップ表示用の参照
  const heatmapRef = useRef<HTMLDivElement>(null);
  
  // 複雑度スコアに基づいて色を取得
  const getComplexityColorClass = (score: number): string => {
    if (score >= 0.8) return 'bg-red-500';
    if (score >= 0.6) return 'bg-orange-500';
    if (score >= 0.4) return 'bg-yellow-500';
    if (score >= 0.2) return 'bg-green-500';
    return 'bg-blue-500';
  };
  
  // 複雑度スコアに基づいてテキスト色を取得
  const getComplexityTextClass = (score: number): string => {
    if (score >= 0.8) return 'text-red-600 dark:text-red-400';
    if (score >= 0.6) return 'text-orange-600 dark:text-orange-400';
    if (score >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 0.2) return 'text-green-600 dark:text-green-400';
    return 'text-blue-600 dark:text-blue-400';
  };
  
  // 全体スコアの表示用クラスを取得
  const getOverallScoreClasses = (score: number): string => {
    if (score >= 8) return 'text-red-600 dark:text-red-400';
    if (score >= 6) return 'text-orange-600 dark:text-orange-400';
    if (score >= 4) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 2) return 'text-green-600 dark:text-green-400';
    return 'text-blue-600 dark:text-blue-400';
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        コード複雑度の可視化
      </h3>
      
      <div className="flex flex-col md:flex-row items-center justify-between mb-6">
        <div className="text-center mb-4 md:mb-0">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            全体の複雑度スコア
          </div>
          <div className={`text-3xl font-bold ${getOverallScoreClasses(complexityData.overall)}`}>
            {complexityData.overall}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">/10</span>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-2">
          <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded text-xs">
            優良: 0-2
          </div>
          <div className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded text-xs">
            良好: 2-4
          </div>
          <div className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 rounded text-xs">
            普通: 4-6
          </div>
          <div className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 rounded text-xs">
            要注意: 6-8
          </div>
          <div className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded text-xs">
            危険: 8-10
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
          関数複雑度比較
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">関数名</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">行数</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">循環的複雑度</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ネスト深度</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">複雑度スコア</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {complexityData.functions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-center text-gray-500 dark:text-gray-400">
                    関数が見つかりません
                  </td>
                </tr>
              ) : (
                complexityData.functions.map((func, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {func.name}
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        行 {func.startLine}-{func.endLine}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {func.lineCount}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {func.cyclomaticComplexity}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {func.nestingDepth}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-16 h-3 rounded ${getComplexityColorClass(func.complexityScore)}`}></div>
                        <span className={`ml-2 text-sm ${getComplexityTextClass(func.complexityScore)}`}>
                          {(func.complexityScore * 10).toFixed(1)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
          複雑度の主な要因
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">長い関数</h5>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {getLongFunctionsCount(complexityData.functions)}個の関数が20行を超えています
            </p>
          </div>
          <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">深いネスト</h5>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {getDeepNestingCount(complexityData.functions)}個の関数が3レベル以上のネストを持っています
            </p>
          </div>
          <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">高い循環的複雑度</h5>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {getHighCyclomaticComplexityCount(complexityData.functions)}個の関数が循環的複雑度10を超えています
            </p>
          </div>
          <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">多すぎるパラメータ</h5>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {getManyParamsCount(complexityData.functions)}個の関数が4つ以上のパラメータを持っています
            </p>
          </div>
        </div>
      </div>
      
      <div>
        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
          複雑度を下げるためのアドバイス
        </h4>
        <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <li>長い関数を小さな関数に分割して、一つの関数が一つのタスクだけを担当するようにしましょう。</li>
          <li>ネストが深い条件文は、早期リターンパターンや関数抽出を使って単純化しましょう。</li>
          <li>複雑な条件式は、説明的な名前を持つ変数や関数に抽出しましょう。</li>
          <li>多すぎるパラメータは、オブジェクトにまとめるか、関数を分割して減らしましょう。</li>
          <li>循環的複雑度が高い関数は、より小さな関数に分割するか、ポリモーフィズムやパターンマッチングなどの代替手法を検討しましょう。</li>
        </ul>
      </div>
    </div>
  );
};

// 長い関数の数をカウント
const getLongFunctionsCount = (functions: FunctionComplexity[]): number => {
  return functions.filter(func => func.lineCount > 20).length;
};

// 深いネストを持つ関数の数をカウント
const getDeepNestingCount = (functions: FunctionComplexity[]): number => {
  return functions.filter(func => func.nestingDepth > 3).length;
};

// 高い循環的複雑度を持つ関数の数をカウント
const getHighCyclomaticComplexityCount = (functions: FunctionComplexity[]): number => {
  return functions.filter(func => func.cyclomaticComplexity > 10).length;
};

// 多すぎるパラメータを持つ関数の数をカウント
const getManyParamsCount = (functions: FunctionComplexity[]): number => {
  return functions.filter(func => func.parameterCount > 4).length;
};

export default CodeComplexityVisualizer; 