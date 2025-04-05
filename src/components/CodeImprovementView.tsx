import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, AlertCircle, X, Code, ArrowRight } from 'lucide-react';
import { CodeImprovement, ImprovementUIData } from '../services/codeImprovementService';

interface CodeImprovementViewProps {
  improvements: CodeImprovement[];
  fileName: string;
}

const CodeImprovementView: React.FC<CodeImprovementViewProps> = ({ improvements, fileName }) => {
  const [uiData, setUIData] = useState<ImprovementUIData>({
    allImprovements: improvements.map(imp => ({ ...imp, isExpanded: false })),
    groupedByType: {},
    groupedBySeverity: {
      high: [],
      medium: [],
      low: []
    },
    totalCount: improvements.length,
    expandedCount: 0,
    toggleExpand: (id: string) => {
      setUIData(prev => {
        const newImprovements = prev.allImprovements.map(imp => 
          imp.originalIssue.id === id 
            ? { ...imp, isExpanded: !imp.isExpanded } 
            : imp
        );
        
        return {
          ...prev,
          allImprovements: newImprovements,
          expandedCount: newImprovements.filter(imp => imp.isExpanded).length,
          groupedByType: groupImprovementsByType(newImprovements),
          groupedBySeverity: groupImprovementsBySeverity(newImprovements)
        };
      });
    },
    expandAll: () => {
      setUIData(prev => {
        const newImprovements = prev.allImprovements.map(imp => ({ ...imp, isExpanded: true }));
        
        return {
          ...prev,
          allImprovements: newImprovements,
          expandedCount: newImprovements.length,
          groupedByType: groupImprovementsByType(newImprovements),
          groupedBySeverity: groupImprovementsBySeverity(newImprovements)
        };
      });
    },
    collapseAll: () => {
      setUIData(prev => {
        const newImprovements = prev.allImprovements.map(imp => ({ ...imp, isExpanded: false }));
        
        return {
          ...prev,
          allImprovements: newImprovements,
          expandedCount: 0,
          groupedByType: groupImprovementsByType(newImprovements),
          groupedBySeverity: groupImprovementsBySeverity(newImprovements)
        };
      });
    }
  });

  React.useEffect(() => {
    // 初期化時にグループ化を行う
    setUIData(prev => ({
      ...prev,
      groupedByType: groupImprovementsByType(prev.allImprovements),
      groupedBySeverity: groupImprovementsBySeverity(prev.allImprovements)
    }));
  }, []);

  // 問題タイプ別にグループ化
  const groupImprovementsByType = (improvements: CodeImprovement[]): { [key: string]: CodeImprovement[] } => {
    const grouped: { [key: string]: CodeImprovement[] } = {};
    improvements.forEach(improvement => {
      const type = improvement.originalIssue.type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(improvement);
    });
    return grouped;
  };

  // 重要度別にグループ化
  const groupImprovementsBySeverity = (improvements: CodeImprovement[]): { high: CodeImprovement[], medium: CodeImprovement[], low: CodeImprovement[] } => {
    return {
      high: improvements.filter(imp => imp.originalIssue.severity === 'high'),
      medium: improvements.filter(imp => imp.originalIssue.severity === 'medium'),
      low: improvements.filter(imp => imp.originalIssue.severity === 'low')
    };
  };

  // 問題タイプの日本語化
  const translateIssueType = (type: string): string => {
    switch (type) {
      case 'code_style':
        return 'コードスタイル';
      case 'naming':
        return '命名規則';
      case 'complexity':
        return '複雑性';
      case 'best_practice':
        return 'ベストプラクティス';
      case 'security':
        return 'セキュリティ';
      case 'performance':
        return 'パフォーマンス';
      default:
        return type;
    }
  };

  // 難易度に基づいて情報を取得
  const getDifficultyInfo = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'hard':
        return {
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          label: '難'
        };
      case 'medium':
        return {
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          label: '中'
        };
      case 'easy':
      default:
        return {
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          label: '易'
        };
    }
  };

  // 影響度に基づいて情報を取得
  const getImpactInfo = (impact: 'low' | 'medium' | 'high') => {
    switch (impact) {
      case 'high':
        return {
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-100 dark:bg-purple-900/20',
          label: '大'
        };
      case 'medium':
        return {
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          label: '中'
        };
      case 'low':
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-900/20',
          label: '小'
        };
    }
  };

  // 重要度に基づいて情報を取得
  const getSeverityInfo = (severity: string) => {
    switch (severity) {
      case 'high':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          label: '高'
        };
      case 'medium':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          label: '中'
        };
      case 'low':
      default:
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          label: '低'
        };
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          コード改善提案: {fileName}
        </h3>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-700 flex flex-wrap gap-2 justify-between items-center">
        <div>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            検出された問題: <strong>{uiData.totalCount}</strong>
          </span>
          <span className="mx-2 text-gray-400">|</span>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            展開中: <strong>{uiData.expandedCount}</strong>
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={uiData.expandAll}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            すべて展開
          </button>
          <button
            onClick={uiData.collapseAll}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            すべて折りたたむ
          </button>
        </div>
      </div>

      <div className="p-4">
        {uiData.allImprovements.length > 0 ? (
          <div className="space-y-4">
            {uiData.allImprovements.map((improvement, index) => {
              const { originalIssue, isExpanded } = improvement;
              const severityInfo = getSeverityInfo(originalIssue.severity);
              const difficultyInfo = getDifficultyInfo(improvement.difficulty);
              const impactInfo = getImpactInfo(improvement.estimatedImpact);
              
              return (
                <div key={originalIssue.id || index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {/* ヘッダー部分 */}
                  <div 
                    className={`p-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${severityInfo.bgColor}`}
                    onClick={() => uiData.toggleExpand(originalIssue.id || '')}
                  >
                    <div className="flex items-center">
                      <span className={`flex items-center mr-2 ${severityInfo.color}`}>
                        {severityInfo.icon}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {translateIssueType(originalIssue.type)}
                      </span>
                      <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${severityInfo.bgColor}`}>
                        {severityInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                        行 {originalIssue.line}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* 問題の説明 */}
                  <div className="p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{originalIssue.message}</p>
                  </div>
                  
                  {/* 展開時の詳細 */}
                  {isExpanded && (
                    <div className="bg-white dark:bg-gray-800">
                      {/* 問題のあるコード */}
                      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                          <Code className="h-4 w-4 mr-1" />
                          問題のあるコード
                        </h4>
                        <pre className="p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                          {improvement.originalCode}
                        </pre>
                      </div>
                      
                      {/* 改善提案 */}
                      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                          <ArrowRight className="h-4 w-4 mr-1" />
                          改善案
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{improvement.suggestion}</p>
                        <pre className="p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs overflow-x-auto">
                          {improvement.improvedCode}
                        </pre>
                      </div>
                      
                      {/* 説明 */}
                      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">説明</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{improvement.explanation}</p>
                      </div>
                      
                      {/* 難易度と影響度 */}
                      <div className="p-3 grid grid-cols-2 gap-3 border-b border-gray-200 dark:border-gray-700">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">実装の難易度</h4>
                          <div className={`inline-flex items-center px-2 py-1 rounded ${difficultyInfo.bgColor}`}>
                            <span className={`text-xs font-medium ${difficultyInfo.color}`}>{difficultyInfo.label}</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">予想される影響</h4>
                          <div className={`inline-flex items-center px-2 py-1 rounded ${impactInfo.bgColor}`}>
                            <span className={`text-xs font-medium ${impactInfo.color}`}>{impactInfo.label}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 実装手順 */}
                      {improvement.implementationSteps && improvement.implementationSteps.length > 0 && (
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">実装手順</h4>
                          <ol className="list-decimal list-inside space-y-1">
                            {improvement.implementationSteps.map((step, idx) => (
                              <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      
                      {/* 潜在的なリスク */}
                      {improvement.potentialRisks && improvement.potentialRisks.length > 0 && (
                        <div className="p-3">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">潜在的なリスク</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {improvement.potentialRisks.map((risk, idx) => (
                              <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">{risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            改善提案はありません。
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeImprovementView; 