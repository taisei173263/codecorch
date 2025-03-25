import React, { useState, useEffect } from 'react';
import { Book, BookOpen, ExternalLink, Check, Award, Clock, ChevronDown, ChevronUp, BookMarked } from 'lucide-react';
import { Skill, LearningResource, SkillLevel } from '../services/learningPathService';
import {
  getResourcesForSkill,
  getSkillsForLanguage,
  updateLearningProgress,
  getUserLearningProgress,
  LearningProgress
} from '../services/learningPathService';

interface SkillsAndLearningViewProps {
  recommendedSkills: Skill[];
  repoName: string;
  analysisResult: any;
  userId?: string;
}

const SkillLevelBadge: React.FC<{ level: SkillLevel }> = ({ level }) => {
  const getColor = () => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'intermediate':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'advanced':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getLabel = () => {
    switch (level) {
      case 'beginner':
        return '初級';
      case 'intermediate':
        return '中級';
      case 'advanced':
        return '上級';
      default:
        return level;
    }
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getColor()}`}>
      {getLabel()}
    </span>
  );
};

const SkillsAndLearningView: React.FC<SkillsAndLearningViewProps> = ({
  recommendedSkills,
  repoName,
  analysisResult,
  userId = 'anonymous'
}) => {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(
    recommendedSkills.length > 0 ? recommendedSkills[0] : null
  );
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [progress, setProgress] = useState<LearningProgress[]>([]);
  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  // 選択されたスキルが変更されたら、関連リソースを取得
  useEffect(() => {
    if (selectedSkill) {
      const skillResources = getResourcesForSkill(selectedSkill.id);
      setResources(skillResources);
    }
  }, [selectedSkill]);

  // コンポーネントマウント時に進捗情報を取得
  useEffect(() => {
    fetchProgress();
  }, [userId]);

  const fetchProgress = async () => {
    try {
      const userProgress = await getUserLearningProgress(userId);
      setProgress(userProgress);
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    }
  };

  // スキルの選択
  const handleSelectSkill = (skill: Skill) => {
    setSelectedSkill(skill);
  };

  // リソースの完了/未完了を切り替え
  const toggleResourceCompletion = async (resourceId: string, completed: boolean) => {
    setLoading(true);
    try {
      await updateLearningProgress(userId, resourceId, completed);
      // 進捗データを再取得
      await fetchProgress();
    } catch (error) {
      console.error('Failed to update progress:', error);
    } finally {
      setLoading(false);
    }
  };

  // リソースの進捗状態を取得
  const getResourceProgress = (resourceId: string): boolean => {
    const resourceProgress = progress.find(p => p.resourceId === resourceId);
    return resourceProgress ? resourceProgress.completed : false;
  };

  // カテゴリーごとにスキルをグループ化
  const groupedSkills: { [key: string]: Skill[] } = {};
  recommendedSkills.forEach(skill => {
    const category = skill.category;
    if (!groupedSkills[category]) {
      groupedSkills[category] = [];
    }
    groupedSkills[category].push(skill);
  });

  // カテゴリーの展開/折りたたみを切り替え
  const toggleCategory = (category: string) => {
    setExpandedSkills(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // カテゴリーごとに日本語名を取得
  const getCategoryDisplayName = (category: string): string => {
    const categoryMap: { [key: string]: string } = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'python': 'Python',
      'go': 'Go'
    };
    return categoryMap[category] || category;
  };

  // リソースタイプの表示名を取得
  const getResourceTypeLabel = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'tutorial': 'チュートリアル',
      'article': '記事',
      'video': '動画',
      'course': 'コース',
      'documentation': 'ドキュメント'
    };
    return typeMap[type] || type;
  };

  // リソースタイプのアイコンを取得
  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'tutorial':
        return <BookOpen className="w-4 h-4" />;
      case 'documentation':
        return <Book className="w-4 h-4" />;
      case 'article':
        return <BookMarked className="w-4 h-4" />;
      default:
        return <Book className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Award className="w-5 h-5 mr-2 text-blue-500" />
          スキルと学習パス
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          あなたのコードに基づいて推奨されるスキルと学習リソース
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
        {/* スキルリスト */}
        <div className="border-r border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
              推奨スキル
            </h3>

            {Object.entries(groupedSkills).map(([category, skills]) => (
              <div key={category} className="mb-2">
                <button
                  className="w-full flex items-center justify-between p-2 text-left bg-gray-50 dark:bg-gray-700 rounded-md"
                  onClick={() => toggleCategory(category)}
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {getCategoryDisplayName(category)}
                  </span>
                  {expandedSkills[category] ? (
                    <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  )}
                </button>
                
                {(expandedSkills[category] !== false) && (
                  <ul className="mt-1 space-y-1">
                    {skills.map(skill => (
                      <li key={skill.id}>
                        <button
                          className={`w-full text-left p-2 text-sm rounded-md ${
                            selectedSkill?.id === skill.id
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                          onClick={() => handleSelectSkill(skill)}
                        >
                          <div className="flex items-center justify-between">
                            <span>{skill.name}</span>
                            <SkillLevelBadge level={skill.level} />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* スキル詳細と学習リソース */}
        <div className="md:col-span-2 p-4">
          {selectedSkill ? (
            <>
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {selectedSkill.name}
                  </h3>
                  <SkillLevelBadge level={selectedSkill.level} />
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {selectedSkill.description}
                </p>
                {selectedSkill.resourceUrl && (
                  <a
                    href={selectedSkill.resourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <BookOpen className="w-4 h-4 mr-1" />
                    公式ドキュメントを見る
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </a>
                )}
              </div>

              <h4 className="font-medium text-gray-800 dark:text-white mt-6 mb-2">
                学習リソース
              </h4>

              {resources.length > 0 ? (
                <ul className="space-y-3">
                  {resources.map(resource => {
                    const isCompleted = getResourceProgress(resource.id);
                    return (
                      <li
                        key={resource.id}
                        className={`p-3 rounded-md border ${
                          isCompleted
                            ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center">
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center mr-2 ${
                                  isCompleted
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                }`}
                              >
                                {getResourceTypeIcon(resource.type)}
                                <span className="ml-1">{getResourceTypeLabel(resource.type)}</span>
                              </span>
                              <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                                {resource.title}
                              </h5>
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {resource.description}
                            </p>
                            <div className="mt-2 flex items-center">
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                リソースを開く
                              </a>
                              <button
                                className={`inline-flex items-center text-xs ${
                                  isCompleted
                                    ? 'text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300'
                                    : 'text-gray-600 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                                onClick={() => toggleResourceCompletion(resource.id, !isCompleted)}
                                disabled={loading}
                              >
                                {isCompleted ? (
                                  <>
                                    <Check className="w-3 h-3 mr-1" />
                                    完了済み
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 mr-1" />
                                    完了としてマーク
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Book className="mx-auto h-12 w-12 mb-2" />
                  <p>このスキルに関連する学習リソースはありません</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Book className="mx-auto h-12 w-12 mb-2" />
              <p>スキルを選択してください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkillsAndLearningView; 