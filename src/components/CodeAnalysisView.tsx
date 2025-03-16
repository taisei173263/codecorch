import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, AlertCircle, X } from 'lucide-react';

// 型定義
interface CodeIssue {
  type: string;
  severity: string;
  line: number;
  message: string;
  suggestion?: string;
}

interface FileAnalysisResult {
  fileName: string;
  language: string;
  lineCount: number;
  commentCount: number;
  functionCount: number;
  complexityScore: number;
  maxNestingDepth: number;
  codeStyleScore: number;
  namingScore: number;
  bestPracticesScore: number;
  issues: CodeIssue[];
}

interface CodeAnalysisViewProps {
  analysisResult: FileAnalysisResult;
  fileName: string;
}

const CodeAnalysisView: React.FC<CodeAnalysisViewProps> = ({ analysisResult, fileName }) => {
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    issues: true,
    metrics: false
  });

  // セクションの展開/折りたたみを切り替え
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // スコアに基づいて色を取得
  const getScoreColor = (score: number): string => {
    if (score >= 8) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // スコアバッジの色を取得
  const getScoreBadgeColor = (score: number): string => {
    if (score >= 8) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (score >= 6) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  // 深刻度に基づいて情報を取得
  const getSeverityInfo = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          icon: <X className="h-4 w-4" />,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          label: '致命的'
        };
      case 'high':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-100 dark:bg-orange-900/20',
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

  // プログラミング言語のフォーマット
  const formatLanguage = (language: string): string => {
    switch (language.toLowerCase()) {
      case 'typescript':
        return 'TypeScript';
      case 'javascript':
        return 'JavaScript';
      case 'python':
        return 'Python';
      case 'go':
        return 'Go';
      default:
        return language.charAt(0).toUpperCase() + language.slice(1);
    }
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

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          {fileName}
          <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            {formatLanguage(analysisResult.language)}
          </span>
        </h3>
      </div>

      {/* 概要セクション */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <button
          className="w-full p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none transition-colors"
          onClick={() => toggleSection('overview')}
        >
          <h4 className="font-medium text-gray-900 dark:text-white">概要</h4>
          {expandedSections.overview ? (
            <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>

        {expandedSections.overview && (
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">コードスタイル</div>
              <div className={`text-xl font-semibold ${getScoreColor(analysisResult.codeStyleScore)}`}>
                {analysisResult.codeStyleScore}/10
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">命名規則</div>
              <div className={`text-xl font-semibold ${getScoreColor(analysisResult.namingScore)}`}>
                {analysisResult.namingScore}/10
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">複雑度</div>
              <div className={`text-xl font-semibold ${getScoreColor(10 - analysisResult.complexityScore)}`}>
                {analysisResult.complexityScore}/10
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">ベストプラクティス</div>
              <div className={`text-xl font-semibold ${getScoreColor(analysisResult.bestPracticesScore)}`}>
                {analysisResult.bestPracticesScore}/10
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 問題点セクション */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <button
          className="w-full p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none transition-colors"
          onClick={() => toggleSection('issues')}
        >
          <h4 className="font-medium text-gray-900 dark:text-white">検出された問題 ({analysisResult.issues.length})</h4>
          {expandedSections.issues ? (
            <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>

        {expandedSections.issues && (
          <div className="p-4">
            {analysisResult.issues.length > 0 ? (
              <div className="space-y-3">
                {analysisResult.issues.map((issue, index) => {
                  const severityInfo = getSeverityInfo(issue.severity);
                  return (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className={`p-3 flex justify-between items-center ${severityInfo.bgColor}`}>
                        <div className="flex items-center">
                          <span className={`flex items-center mr-2 ${severityInfo.color}`}>
                            {severityInfo.icon}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {translateIssueType(issue.type)}
                          </span>
                          <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${getScoreBadgeColor(
                            issue.severity === 'low' ? 8 : issue.severity === 'medium' ? 6 : 4
                          )}`}>
                            {severityInfo.label}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          行 {issue.line}
                        </span>
                      </div>
                      <div className="p-3 bg-white dark:bg-gray-800">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{issue.message}</p>
                        {issue.suggestion && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            提案: {issue.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                問題は検出されませんでした。
              </div>
            )}
          </div>
        )}
      </div>

      {/* メトリクスセクション */}
      <div>
        <button
          className="w-full p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none transition-colors"
          onClick={() => toggleSection('metrics')}
        >
          <h4 className="font-medium text-gray-900 dark:text-white">コードメトリクス</h4>
          {expandedSections.metrics ? (
            <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>

        {expandedSections.metrics && (
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">総行数</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">{analysisResult.lineCount}</div>
              </div>
              
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">コメント行数</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {analysisResult.commentCount} ({Math.round((analysisResult.commentCount / analysisResult.lineCount) * 100)}%)
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">関数数</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">{analysisResult.functionCount}</div>
              </div>
              
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">複雑度スコア</div>
                <div className={`text-lg font-medium ${getScoreColor(10 - analysisResult.complexityScore)}`}>
                  {analysisResult.complexityScore}/10
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">最大ネスト深度</div>
                <div className={`text-lg font-medium ${
                  analysisResult.maxNestingDepth <= 3 
                    ? 'text-green-600 dark:text-green-400' 
                    : analysisResult.maxNestingDepth <= 5
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {analysisResult.maxNestingDepth}
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">平均関数行数</div>
                <div className={`text-lg font-medium ${
                  analysisResult.lineCount / analysisResult.functionCount <= 15
                    ? 'text-green-600 dark:text-green-400'
                    : analysisResult.lineCount / analysisResult.functionCount <= 30
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {Math.round(analysisResult.lineCount / Math.max(1, analysisResult.functionCount))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeAnalysisView; 