/**
 * セキュリティチェックサービス
 * コードの潜在的なセキュリティ脆弱性を検出し、修正提案を提供
 */

import * as tf from '@tensorflow/tfjs';
import { extractSecurityFeatures, predictSecurityVulnerabilities } from './tfService';
import { tokenizeCode } from './duplicateDetectionService';

// セキュリティ脆弱性の種類（OWASP Top 10に基づく）
export enum VulnerabilityType {
  INJECTION = 'injection',                    // インジェクション
  BROKEN_AUTH = 'broken_authentication',      // 認証の不備
  SENSITIVE_DATA = 'sensitive_data_exposure', // 機密データの露出
  XXE = 'xxe',                                // XXE
  BROKEN_ACCESS = 'broken_access_control',    // アクセス制御の不備
  SECURITY_MISCONFIG = 'security_misconfiguration', // セキュリティの設定ミス
  XSS = 'xss',                                // クロスサイトスクリプティング
  INSECURE_DESERIAL = 'insecure_deserialization', // 安全でないデシリアライゼーション
  VULNERABLE_COMPONENTS = 'vulnerable_components', // 脆弱なコンポーネントの使用
  INSUFFICIENT_LOGGING = 'insufficient_logging', // 不十分なロギングと監視
  OTHER = 'other'                             // その他の脆弱性
}

// セキュリティ脆弱性の重大度
export enum Severity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

// 検出された脆弱性
export interface SecurityVulnerability {
  type: VulnerabilityType;        // 脆弱性の種類
  severity: Severity;             // 重大度
  line: number;                   // 行番号
  column?: number;                // 列番号（オプション）
  message: string;                // 説明メッセージ
  code: string;                   // 問題のあるコード
  cwe?: string;                   // Common Weakness Enumeration ID
  recommendation: string;         // 修正提案
  exampleFix?: string;            // 修正例
  references?: string[];          // 参考情報へのリンク
  falsePositiveLikelihood: 'low' | 'medium' | 'high'; // 誤検出の可能性
}

// セキュリティチェックの結果
export interface SecurityCheckResult {
  vulnerabilities: SecurityVulnerability[];
  summary: {
    critical: number;             // 重大な脆弱性の数
    high: number;                 // 高リスクの脆弱性の数
    medium: number;               // 中リスクの脆弱性の数
    low: number;                  // 低リスクの脆弱性の数
    info: number;                 // 情報レベルの脆弱性の数
    total: number;                // 全脆弱性の数
    score: number;                // セキュリティスコア（0-100）
  };
  recommendations: string[];      // 全体的な推奨事項
}

// 言語別の脆弱性パターン
const VULNERABILITY_PATTERNS: {
  [key: string]: {
    [key in VulnerabilityType]?: {
      pattern: RegExp;
      severity: Severity;
      message: string;
      cwe?: string;
      recommendation: string;
      exampleFix?: string;
      references?: string[];
    }[];
  };
} = {
  javascript: {
    [VulnerabilityType.INJECTION]: [
      {
        pattern: /eval\s*\(/g,
        severity: Severity.HIGH,
        message: 'eval()の使用は非常に危険です。任意のコードが実行される可能性があります。',
        cwe: 'CWE-95',
        recommendation: 'eval()の使用を避け、JSONデータの場合はJSON.parseを使用してください。',
        exampleFix: '// 危険なコード:\neval(userInput);\n\n// 安全なコード:\nJSON.parse(userInput);',
        references: ['https://owasp.org/www-community/attacks/Code_Injection']
      },
      {
        pattern: /exec\s*\(\s*(['"`].*['"`]|\$\{.*\}|\w+)/g,
        severity: Severity.HIGH,
        message: 'コマンドインジェクションの脆弱性があります。ユーザー入力がコマンドに含まれる可能性があります。',
        cwe: 'CWE-78',
        recommendation: 'ユーザー入力を適切にサニタイズしてください。可能であれば、execの使用を避けてください。',
        references: ['https://owasp.org/www-community/attacks/Command_Injection']
      }
    ],
    [VulnerabilityType.XSS]: [
      {
        pattern: /innerHTML\s*=\s*(?!\s*['"`]<[^>]*>\s*['"`])/g,
        severity: Severity.MEDIUM,
        message: 'innerHTMLを使用する際は、ユーザー入力がそのまま挿入される可能性があり、XSS攻撃の危険性があります。',
        cwe: 'CWE-79',
        recommendation: 'innerHTMLの代わりにtextContentを使用するか、DOMPurifyなどのライブラリでサニタイズしてください。',
        exampleFix: "// 危険なコード:\nelement.innerHTML = userInput;\n\n// 安全なコード:\nelement.textContent = userInput;\n// または\nimport DOMPurify from 'dompurify';\nelement.innerHTML = DOMPurify.sanitize(userInput);",
        references: ['https://owasp.org/www-community/attacks/xss/']
      },
      {
        pattern: /document\.write\s*\(/g,
        severity: Severity.MEDIUM,
        message: 'document.writeはXSS攻撃に弱いため、使用は避けるべきです。',
        cwe: 'CWE-79',
        recommendation: 'document.writeの代わりに、DOMメソッドでHTMLを構築することを検討してください。',
        references: ['https://owasp.org/www-community/attacks/xss/']
      }
    ],
    [VulnerabilityType.SENSITIVE_DATA]: [
      {
        pattern: /(password|token|secret|key|credential)s?\s*=\s*['"][^'"]+['"](?!\s*os\.environ)/gi,
        severity: Severity.MEDIUM,
        message: 'コード内にハードコードされた機密情報が含まれている可能性があります。',
        cwe: 'CWE-798',
        recommendation: '環境変数または適切なシークレット管理サービスを使用してください。',
        exampleFix: "# 危険なコード:\napi_key = 'abcd1234'\n\n# 安全なコード:\nimport os\napi_key = os.environ.get('API_KEY')",
        references: ['https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure']
      }
    ],
    [VulnerabilityType.BROKEN_ACCESS]: [
      {
        pattern: /\.\.\/|\.\.\\|file:\/\/\//g,
        severity: Severity.MEDIUM,
        message: 'パス走査（ディレクトリトラバーサル）の脆弱性が存在する可能性があります。',
        cwe: 'CWE-22',
        recommendation: 'ユーザー入力からパスを構築する際は、path.normalizeやpath.resolveを使用し、許可されたディレクトリ内に制限してください。',
        references: ['https://owasp.org/www-community/attacks/Path_Traversal']
      }
    ]
  },
  typescript: {
    [VulnerabilityType.INJECTION]: [
      {
        pattern: /eval\s*\(/g,
        severity: Severity.HIGH,
        message: 'eval()の使用は非常に危険です。任意のコードが実行される可能性があります。',
        cwe: 'CWE-95',
        recommendation: 'eval()の使用を避け、JSONデータの場合はJSON.parseを使用してください。',
        exampleFix: '// 危険なコード:\neval(userInput);\n\n// 安全なコード:\nJSON.parse(userInput);',
        references: ['https://owasp.org/www-community/attacks/Code_Injection']
      }
    ],
    [VulnerabilityType.XSS]: [
      {
        pattern: /innerHTML\s*=\s*(?!\s*['"`]<[^>]*>\s*['"`])/g,
        severity: Severity.MEDIUM,
        message: 'innerHTMLを使用する際は、ユーザー入力がそのまま挿入される可能性があり、XSS攻撃の危険性があります。',
        cwe: 'CWE-79',
        recommendation: 'innerHTMLの代わりにtextContentを使用するか、DOMPurifyなどのライブラリでサニタイズしてください。',
        references: ['https://owasp.org/www-community/attacks/xss/']
      }
    ]
  },
  python: {
    [VulnerabilityType.INJECTION]: [
      {
        pattern: /exec\s*\(/g,
        severity: Severity.HIGH,
        message: 'exec()でユーザー入力を実行すると、任意のコードが実行される可能性があります。',
        cwe: 'CWE-95',
        recommendation: 'exec()の代わりに、より安全な方法でタスクを実行してください。',
        references: ['https://owasp.org/www-community/attacks/Code_Injection']
      },
      {
        pattern: /subprocess\.(?:call|Popen|run)\s*\(\s*(?:f['"]{1}|['"]{1}.*\{.*\}.*['"]{1}|\w+\s*\+)/g,
        severity: Severity.HIGH,
        message: 'コマンドインジェクションの脆弱性があります。文字列フォーマットやコマンド文字列が動的に作成されています。',
        cwe: 'CWE-78',
        recommendation: 'コマンドを引数リストとして渡し、shellパラメータをFalseに設定してください。',
        exampleFix: "# 危険なコード:\nsubprocess.call('grep ' + user_input + ' file.txt', shell=True)\n\n# 安全なコード:\nsubprocess.call(['grep', user_input, 'file.txt'], shell=False)",
        references: ['https://owasp.org/www-community/attacks/Command_Injection']
      }
    ],
    [VulnerabilityType.SENSITIVE_DATA]: [
      {
        pattern: /(password|token|secret|key|credential)s?\s*=\s*['"][^'"]+['"](?!\s*os\.environ)/gi,
        severity: Severity.MEDIUM,
        message: 'コード内にハードコードされた機密情報が含まれています。',
        cwe: 'CWE-798',
        recommendation: '環境変数または適切なシークレット管理サービスを使用してください。',
        exampleFix: "# 危険なコード:\napi_key = 'abcd1234'\n\n# 安全なコード:\nimport os\napi_key = os.environ.get('API_KEY')",
        references: ['https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure']
      }
    ],
    [VulnerabilityType.XSS]: [
      {
        pattern: /\.format\s*\(.*request\.|request\..*\)/g,
        severity: Severity.MEDIUM,
        message: 'ユーザー入力をテンプレートに直接挿入すると、XSS攻撃のリスクがあります。',
        cwe: 'CWE-79',
        recommendation: 'ユーザー入力をエスケープしてください。Djangoなどのフレームワークではテンプレートエンジンの自動エスケープ機能を利用してください。',
        references: ['https://owasp.org/www-community/attacks/xss/']
      }
    ],
    [VulnerabilityType.SQL_INJECTION]: [
      {
        pattern: /execute\s*\(\s*f['"]{1}|['"]{1}.*\{.*\}.*['"]{1}|\w+\s*\+/g,
        severity: Severity.HIGH,
        message: 'SQLインジェクションの脆弱性があります。',
        cwe: 'CWE-89',
        recommendation: 'パラメータ化クエリを使用してください。',
        exampleFix: "# 危険なコード:\ncursor.execute(\"SELECT * FROM users WHERE name = '\" + user_input + \"'\")\n\n# 安全なコード:\ncursor.execute(\"SELECT * FROM users WHERE name = %s\", (user_input,))",
        references: ['https://owasp.org/www-community/attacks/SQL_Injection']
      }
    ]
  }
};

/**
 * コードのセキュリティ脆弱性を検出
 * @param code 分析対象のコード
 * @param language プログラミング言語
 * @param options 検出オプション
 */
export const performSecurityCheck = async (
  code: string,
  language: string,
  options = { useMl: true, minSeverity: Severity.LOW }
): Promise<SecurityCheckResult> => {
  const vulnerabilities: SecurityVulnerability[] = [];
  const lines = code.split('\n');
  
  // パターンベースの検出
  const patternVulnerabilities = detectPatternBasedVulnerabilities(code, lines, language);
  vulnerabilities.push(...patternVulnerabilities);
  
  // 機械学習ベースの検出（オプション）
  if (options.useMl) {
    try {
      const mlVulnerabilities = await detectMlBasedVulnerabilities(code, lines, language);
      vulnerabilities.push(...mlVulnerabilities);
    } catch (error) {
      console.error('ML脆弱性検出エラー:', error);
      // MLベースの検出に失敗しても続行
    }
  }
  
  // 重大度でフィルタリング
  const severityRank = {
    [Severity.CRITICAL]: 4,
    [Severity.HIGH]: 3,
    [Severity.MEDIUM]: 2,
    [Severity.LOW]: 1,
    [Severity.INFO]: 0
  };
  
  const minSeverityRank = severityRank[options.minSeverity];
  const filteredVulnerabilities = vulnerabilities.filter(
    v => severityRank[v.severity] >= minSeverityRank
  );
  
  // 重大度が高いものを先に表示するようソート
  filteredVulnerabilities.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
  
  // サマリーと全体的な推奨事項を作成
  const summary = calculateVulnerabilitySummary(filteredVulnerabilities);
  const recommendations = generateOverallRecommendations(filteredVulnerabilities, language);
  
  return {
    vulnerabilities: filteredVulnerabilities,
    summary,
    recommendations
  };
};

/**
 * パターンベースの脆弱性検出
 */
const detectPatternBasedVulnerabilities = (
  code: string,
  lines: string[],
  language: string
): SecurityVulnerability[] => {
  const vulnerabilities: SecurityVulnerability[] = [];
  const languagePatterns = VULNERABILITY_PATTERNS[language] || {};
  
  // 各脆弱性タイプに対してパターンマッチング
  for (const type in languagePatterns) {
    const patterns = languagePatterns[type as VulnerabilityType] || [];
    
    for (const patternInfo of patterns) {
      const { pattern, severity, message, cwe, recommendation, exampleFix, references } = patternInfo;
      
      // コード全体からパターンを検索
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const matchPosition = match.index;
        
        // マッチした位置から行番号を特定
        const line = getLineNumber(code, matchPosition);
        const matchedCode = lines[line - 1].trim();
        
        vulnerabilities.push({
          type: type as VulnerabilityType,
          severity,
          line,
          message,
          code: matchedCode,
          cwe,
          recommendation,
          exampleFix,
          references,
          falsePositiveLikelihood: 'medium' // パターンベースは中程度の誤検出可能性
        });
      }
    }
  }
  
  return vulnerabilities;
};

/**
 * 機械学習ベースの脆弱性検出
 */
const detectMlBasedVulnerabilities = async (
  code: string,
  lines: string[],
  language: string
): Promise<SecurityVulnerability[]> => {
  const vulnerabilities: SecurityVulnerability[] = [];
  
  try {
    // 特徴ベクトルを抽出
    const features = extractSecurityFeatures(code, language);
    
    // 脆弱性予測
    const predictions = await predictSecurityVulnerabilities(features);
    
    // 脆弱性タイプのマッピング
    const vulnerabilityTypes = [
      VulnerabilityType.INJECTION,
      VulnerabilityType.XSS,
      VulnerabilityType.BROKEN_ACCESS,
      VulnerabilityType.SENSITIVE_DATA
    ];
    
    // 脆弱性スコアが閾値を超えた場合に検出
    for (let i = 0; i < predictions.length; i++) {
      const score = predictions[i];
      
      if (score > 0.7) { // 閾値: 0.7（70%の確信度）
        // コードの潜在的な脆弱部分を特定（簡略化）
        // 実際のシステムではより高度なコード解析が必要
        const type = vulnerabilityTypes[i];
        const suspiciousLines = findSuspiciousLines(code, type, language);
        
        for (const lineInfo of suspiciousLines) {
          vulnerabilities.push({
            type,
            severity: score > 0.9 ? Severity.HIGH : Severity.MEDIUM,
            line: lineInfo.line,
            message: getMlVulnerabilityMessage(type),
            code: lineInfo.code,
            recommendation: getVulnerabilityRecommendation(type, language),
            falsePositiveLikelihood: 'high' // ML検出は誤検出の可能性が高い
          });
        }
      }
    }
  } catch (error) {
    console.error('ML脆弱性検出エラー:', error);
    throw error;
  }
  
  return vulnerabilities;
};

/**
 * コード内の疑わしい行を特定（簡略化）
 */
const findSuspiciousLines = (
  code: string,
  vulnerabilityType: VulnerabilityType,
  language: string
): { line: number; code: string; }[] => {
  const lines = code.split('\n');
  const suspiciousLines: { line: number; code: string; }[] = [];
  
  // 脆弱性タイプに基づくキーワード
  const keywords: Record<VulnerabilityType, string[]> = {
    [VulnerabilityType.INJECTION]: ['exec', 'eval', 'spawn', 'subprocess', 'shell'],
    [VulnerabilityType.XSS]: ['innerHTML', 'document.write', 'innerText', 'dangerouslySetInnerHTML'],
    [VulnerabilityType.BROKEN_ACCESS]: ['../', 'file://', 'readFile', 'writeFile', 'fs.'],
    [VulnerabilityType.SENSITIVE_DATA]: ['password', 'token', 'secret', 'key', 'credential'],
    [VulnerabilityType.BROKEN_AUTH]: ['auth', 'login', 'password', 'session'],
    [VulnerabilityType.SECURITY_MISCONFIG]: ['config', 'setting', 'debug', 'dev'],
    [VulnerabilityType.XXE]: ['parseXml', 'DOMParser', 'SAXParser'],
    [VulnerabilityType.INSECURE_DESERIAL]: ['deserialize', 'unserialize', 'JSON.parse'],
    [VulnerabilityType.VULNERABLE_COMPONENTS]: ['import', 'require', 'load'],
    [VulnerabilityType.INSUFFICIENT_LOGGING]: ['log', 'error', 'exception', 'catch'],
    [VulnerabilityType.OTHER]: []
  };
  
  const relevantKeywords = keywords[vulnerabilityType] || [];
  
  // キーワードに基づいて疑わしい行を特定
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (relevantKeywords.some(keyword => line.includes(keyword))) {
      suspiciousLines.push({
        line: i + 1,
        code: line.trim()
      });
    }
  }
  
  return suspiciousLines;
};

/**
 * ML検出された脆弱性のメッセージを取得
 */
const getMlVulnerabilityMessage = (type: VulnerabilityType): string => {
  const messages: Record<VulnerabilityType, string> = {
    [VulnerabilityType.INJECTION]: '潜在的なコードインジェクションの脆弱性が検出されました。',
    [VulnerabilityType.XSS]: '潜在的なクロスサイトスクリプティングの脆弱性が検出されました。',
    [VulnerabilityType.BROKEN_ACCESS]: '潜在的なアクセス制御の脆弱性が検出されました。',
    [VulnerabilityType.SENSITIVE_DATA]: '潜在的な機密データの露出が検出されました。',
    [VulnerabilityType.BROKEN_AUTH]: '潜在的な認証の不備が検出されました。',
    [VulnerabilityType.SECURITY_MISCONFIG]: '潜在的なセキュリティ設定の誤りが検出されました。',
    [VulnerabilityType.XXE]: '潜在的なXXE脆弱性が検出されました。',
    [VulnerabilityType.INSECURE_DESERIAL]: '潜在的な安全でないデシリアライゼーションが検出されました。',
    [VulnerabilityType.VULNERABLE_COMPONENTS]: '潜在的に脆弱なコンポーネントの使用が検出されました。',
    [VulnerabilityType.INSUFFICIENT_LOGGING]: '不十分なロギングとモニタリングが検出されました。',
    [VulnerabilityType.OTHER]: '潜在的なセキュリティの脆弱性が検出されました。'
  };
  
  return messages[type] || '潜在的なセキュリティの脆弱性が検出されました。';
};

/**
 * 脆弱性に対する推奨対策を取得
 */
const getVulnerabilityRecommendation = (type: VulnerabilityType, language: string): string => {
  const recommendations: Record<VulnerabilityType, Record<string, string>> = {
    [VulnerabilityType.INJECTION]: {
      javascript: 'ユーザー入力を適切にサニタイズし、evalやexecの使用を避けてください。',
      typescript: 'ユーザー入力を適切にサニタイズし、evalやexecの使用を避けてください。',
      python: 'ユーザー入力を適切にサニタイズし、execやeval、subprocessの使用には十分注意してください。'
    },
    [VulnerabilityType.XSS]: {
      javascript: 'ユーザー入力をエスケープし、innerHTMLの代わりにtextContentを使用するか、DOMPurifyなどのライブラリでサニタイズしてください。',
      typescript: 'ユーザー入力をエスケープし、innerHTMLの代わりにtextContentを使用するか、DOMPurifyなどのライブラリでサニタイズしてください。',
      python: 'テンプレートエンジンのエスケープ機能を利用し、ユーザー入力が直接出力されないようにしてください。'
    },
    [VulnerabilityType.SENSITIVE_DATA]: {
      javascript: '機密情報をコード内にハードコードせず、環境変数や適切なシークレット管理サービスを使用してください。',
      typescript: '機密情報をコード内にハードコードせず、環境変数や適切なシークレット管理サービスを使用してください。',
      python: '機密情報を環境変数やconfigパーサーを使用して外部化してください。'
    },
    [VulnerabilityType.BROKEN_ACCESS]: {
      javascript: 'ユーザー入力によるファイルパスは適切に検証し、許可されたディレクトリのみにアクセスを制限してください。',
      typescript: 'ユーザー入力によるファイルパスは適切に検証し、許可されたディレクトリのみにアクセスを制限してください。',
      python: 'os.path.joinを使用してファイルパスを構築し、許可されたディレクトリに限定してください。'
    },
    [VulnerabilityType.OTHER]: {
      default: 'コードをセキュリティの専門家にレビューしてもらい、最新のセキュリティベストプラクティスに従ってください。'
    }
  };
  
  return recommendations[type]?.[language] || recommendations[type]?.['default'] || recommendations[VulnerabilityType.OTHER]['default'];
};

/**
 * テキスト位置から行番号を取得
 */
const getLineNumber = (code: string, position: number): number => {
  const textBeforePosition = code.substring(0, position);
  return (textBeforePosition.match(/\n/g) || []).length + 1;
};

/**
 * 脆弱性の概要を計算
 */
const calculateVulnerabilitySummary = (vulnerabilities: SecurityVulnerability[]) => {
  const summary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
    total: vulnerabilities.length,
    score: 100 // デフォルトのスコア（脆弱性がない場合は100点）
  };
  
  // 脆弱性の数をカウント
  for (const vuln of vulnerabilities) {
    switch (vuln.severity) {
      case Severity.CRITICAL:
        summary.critical++;
        break;
      case Severity.HIGH:
        summary.high++;
        break;
      case Severity.MEDIUM:
        summary.medium++;
        break;
      case Severity.LOW:
        summary.low++;
        break;
      case Severity.INFO:
        summary.info++;
        break;
    }
  }
  
  // セキュリティスコアを計算（脆弱性の重大度に基づく）
  const deductions = {
    [Severity.CRITICAL]: 20,
    [Severity.HIGH]: 10,
    [Severity.MEDIUM]: 5,
    [Severity.LOW]: 2,
    [Severity.INFO]: 0
  };
  
  let totalDeduction = 0;
  
  for (const vuln of vulnerabilities) {
    totalDeduction += deductions[vuln.severity];
  }
  
  // スコアは最大100、最小0
  summary.score = Math.max(0, Math.min(100, 100 - totalDeduction));
  
  return summary;
};

/**
 * 全体的な推奨事項を生成
 */
const generateOverallRecommendations = (
  vulnerabilities: SecurityVulnerability[],
  language: string
): string[] => {
  const recommendations: string[] = [];
  
  // 脆弱性タイプごとの発生数をカウント
  const typeCount: Record<VulnerabilityType, number> = Object.values(VulnerabilityType).reduce(
    (acc, type) => ({...acc, [type]: 0}),
    {} as Record<VulnerabilityType, number>
  );
  
  for (const vuln of vulnerabilities) {
    typeCount[vuln.type]++;
  }
  
  // 最も多い脆弱性タイプに基づいて推奨事項を生成
  const priorityTypes = Object.entries(typeCount)
    .filter(([, count]) => count > 0)
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([type]) => type as VulnerabilityType);
  
  // 言語固有の推奨事項
  if (language === 'javascript' || language === 'typescript') {
    if (typeCount[VulnerabilityType.XSS] > 0) {
      recommendations.push('React、Vue、Angularなどのフレームワークのエスケープ機能を活用するか、DOMPurifyなどのライブラリを使用してXSS対策を強化してください。');
    }
    
    if (typeCount[VulnerabilityType.INJECTION] > 0) {
      recommendations.push('eval()やnew Function()の使用を避け、JSONデータの場合はJSON.parseを使用してください。');
      recommendations.push('child_process.execの代わりにchild_process.execFileを使用して、コマンドインジェクションを防止してください。');
    }
  } else if (language === 'python') {
    if (typeCount[VulnerabilityType.INJECTION] > 0) {
      recommendations.push('subprocess.runを使用する際は、shellパラメータをFalseに設定し、配列として引数を渡すことでコマンドインジェクションを防止してください。');
      recommendations.push('SQL文を構築する際はパラメータ化クエリを使用し、引数には入力データを使用してください。');
    }
    
    if (typeCount[VulnerabilityType.SENSITIVE_DATA] > 0) {
      recommendations.push('configparserやdotenvを使用して、機密情報を設定ファイルや環境変数として管理してください。');
    }
  }
  
  // 全般的な推奨事項
  if (vulnerabilities.length > 5) {
    recommendations.push('セキュリティテストを自動化し、継続的インテグレーションパイプラインに組み込んでください。');
  }
  
  if (typeCount[VulnerabilityType.SECURITY_MISCONFIG] > 0) {
    recommendations.push('セキュリティ設定のためのチェックリストを作成し、本番環境へのデプロイ前に確認してください。');
  }
  
  // 必ず何らかの推奨事項を返す
  if (recommendations.length === 0) {
    recommendations.push('一般的なセキュリティベストプラクティスに従い、定期的なセキュリティレビューを実施してください。');
  }
  
  return [...new Set(recommendations)]; // 重複を排除
};

/**
 * セキュリティレポートを生成
 */
export const generateSecurityReport = (
  result: SecurityCheckResult
): string => {
  const { vulnerabilities, summary, recommendations } = result;
  
  // スコアに基づくセキュリティレベル
  const getSecurityLevel = (score: number): string => {
    if (score >= 90) return 'A（優）';
    if (score >= 80) return 'B（良）';
    if (score >= 70) return 'C（可）';
    if (score >= 60) return 'D（要改善）';
    return 'F（危険）';
  };
  
  let report = `# セキュリティ脆弱性検出レポート\n\n`;
  
  report += `## 概要\n`;
  report += `- セキュリティスコア: ${summary.score}/100 ${getSecurityLevel(summary.score)}\n`;
  report += `- 検出された脆弱性: ${summary.total}件\n`;
  report += `  - 重大: ${summary.critical}件\n`;
  report += `  - 高リスク: ${summary.high}件\n`;
  report += `  - 中リスク: ${summary.medium}件\n`;
  report += `  - 低リスク: ${summary.low}件\n`;
  report += `  - 情報: ${summary.info}件\n\n`;
  
  report += `## 推奨対策\n`;
  recommendations.forEach(rec => {
    report += `- ${rec}\n`;
  });
  report += '\n';
  
  if (vulnerabilities.length > 0) {
    report += `## 検出された脆弱性\n\n`;
    
    vulnerabilities.forEach((vuln, index) => {
      const severityLabel = {
        [Severity.CRITICAL]: '【重大】',
        [Severity.HIGH]: '【高】',
        [Severity.MEDIUM]: '【中】',
        [Severity.LOW]: '【低】',
        [Severity.INFO]: '【情報】'
      }[vuln.severity];
      
      report += `### ${severityLabel} ${vuln.type} (${index + 1}/${vulnerabilities.length})\n`;
      report += `- 行番号: ${vuln.line}\n`;
      report += `- メッセージ: ${vuln.message}\n`;
      if (vuln.cwe) {
        report += `- CWE: ${vuln.cwe}\n`;
      }
      report += `- コード: \`${vuln.code}\`\n`;
      report += `- 対応策: ${vuln.recommendation}\n`;
      
      if (vuln.exampleFix) {
        report += `- 修正例:\n\`\`\`\n${vuln.exampleFix}\n\`\`\`\n`;
      }
      
      if (vuln.references && vuln.references.length > 0) {
        report += `- 参考情報:\n`;
        vuln.references.forEach(ref => {
          report += `  - ${ref}\n`;
        });
      }
      
      report += '\n';
    });
  } else {
    report += `## 脆弱性なし\n`;
    report += `検出された脆弱性はありません。良好なセキュリティ状態です。\n`;
  }
  
  return report;
};

export default {
  performSecurityCheck,
  generateSecurityReport
}; 