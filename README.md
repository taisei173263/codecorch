# CodeCoach: AI搭載コード分析・スキル開発プラットフォーム
### YouTube Link:[https://youtu.be/0kUxogSL59U?si=8oQGb7rpcpdCO8dY]
### URL (https://codecoach2025.netlify.app/)
## 📋 プロジェクト概要

CodeCoachは、開発者のコード品質向上と技術スキルの成長を加速させるAI搭載Webアプリケーションです。GitHub認証を通じて開発者のリポジトリを分析し、コード品質の評価・改善提案から、パーソナライズされた学習パスの提案まで行います。従来は経験豊富なメンターからしか得られなかったコードレビューと成長アドバイスを、AIの力で誰でも利用できるようにすることを目指しています。

## 📢 最新アップデート情報 (2025年4月7日)

### 認証・セキュリティの強化
- **GitHub認証の信頼性向上**: Firebase認証フローを完全に刷新し、認証エラーを大幅に削減
- **非同期認証処理の改善**: 認証状態の適切な監視と状態管理によるUX向上
- **エラーハンドリングの強化**: 詳細なエラーメッセージとリカバリーオプションを実装

### AI機能の拡充
- **OpenAI API統合**: コード分析にOpenAIのGPT-3.5モデルを活用した高度なレビュー機能
- **利用回数カウンター**: 月間API利用回数の正確な追跡と表示機能
- **コードエクスプレイナー**: コードの目的・ロジック・アルゴリズムをAIが詳細に解説する機能を追加

### ユーザー体験の改善
- **ダークモード最適化**: ダークモードでのコントラスト比と可読性を向上
- **レスポンシブデザインの強化**: モバイルデバイスでの表示・操作性を改善
- **ローディング表示の改善**: 処理状態の視覚的フィードバックを強化

### パフォーマンス・安定性
- **Firebase接続の安定化**: 接続エラーの自動検出と復旧メカニズムを実装
- **ビルド最適化**: チャンク分割とコード分割による初期ロード時間の短縮
- **エラーログの拡充**: 詳細なエラー情報の記録と分析機能を追加

## 🚀 主要機能と技術的特徴

### コード分析エンジン
- **クライアントサイドAI処理**: TensorFlow.jsを活用し、ブラウザ上で完結する高度なコード分析を実現
- **ハイブリッド分析アルゴリズム**: AST(抽象構文木)パターンマッチングと深層学習を組み合わせた階層的分析手法
- **多言語対応**: JavaScript, TypeScript, Python, Javaなど複数言語に対応するコード解析
- **メモリ最適化**: Web Workersによる非同期処理とストリーミング分析でブラウザリソースを効率活用

### AIによる改善提案
- **コンテキスト認識**: ファイル全体の構造を理解した上で、局所的なコード改善を提案
- **学習モデル最適化**: モデル量子化とプルーニングによる軽量化で、ブラウザでの推論速度を5倍向上
- **説明可能性**: 問題検出の理由と改善提案を詳細に説明し、学習機会を最大化

### パーソナライズド学習システム
- **協調フィルタリング**: リアルタイム協調フィルタリングによるスキル推奨アルゴリズム
- **スキルグラフ**: スキル間の関連性グラフを活用した学習順序の最適化
- **進捗追跡**: 学習進捗の視覚化と次のステップの自動推奨

### セキュリティとUX
- **ゼロナレッジ設計**: ユーザーのコードはローカル分析のみで、機密情報を外部に送信しない設計
- **2要素認証**: 高度なセキュリティのための2FA実装
- **ダークモード**: システム設定連動と手動切替に対応したアクセシビリティ配慮

## 💻 技術スタック

### フロントエンド
- **フレームワーク**: React 18 + TypeScript
- **状態管理**: React Hooks + Context API
- **スタイリング**: Tailwind CSS + カスタムデザインシステム
- **コンポーネント設計**: アトミックデザイン + コンポーネント駆動開発

### AI/ML
- **モデル**: TensorFlow.js + カスタムCodeBERT軽量版
- **最適化**: 8ビット量子化 + 選択的プルーニング
- **推論**: WebGL/WebGPUアクセラレーション
- **特徴抽出**: AST解析 + GNNによるコード構造理解

### バックエンド連携
- **認証**: Firebase Authentication + GitHub OAuth
- **データ永続化**: Firestore + IndexedDB
- **API連携**: GitHub API + REST設計原則

### 開発・デプロイ
- **ビルド**: Vite + モジュールフェデレーション
- **CI/CD**: GitHub Actions + 自動テスト
- **デプロイ**: Firebase Hosting + Netlify

## 🔧 アーキテクチャ設計の工夫

### パフォーマンス最適化
- **コード分析の非同期処理**: メインスレッドをブロックせず、UIの応答性を維持
- **増分分析**: 大規模リポジトリでも段階的に結果を表示するストリーミング分析
- **スマートキャッシング**: 解析結果をIndexedDBに保存し、再分析を最小化

### スケーラブルなコード設計
- **関心の分離**: プレゼンテーション層とサービス層の明確な分離
- **カスタムHooks**: ロジック再利用のためのuseGitHubAuth、useRepositoryData等の抽象化
- **機能モジュール化**: 高い凝集度と低い結合度を実現する機能単位のモジュール構成

### ユーザー体験
- **エラーハンドリング**: 3層構造のエラー捕捉と回復メカニズム
- **プログレッシブUI**: 処理状態に応じたユーザーフィードバック
- **アクセシビリティ**: WCAG準拠のコントラスト比とキーボードナビゲーション

## 🛠️ 開発プロセスと工夫点

- **アジャイル開発**: イテレーティブな機能追加と改善サイクル
- **型安全設計**: TypeScriptによる堅牢な型システムの活用
- **パフォーマンスモニタリング**: Core Web Vitalsに基づく継続的最適化
- **ユーザーフィードバック**: 実際の開発者からのフィードバックを基にした機能改善

## 📚 実装で学んだこと

- **クライアントサイドML**: ブラウザ環境でのMLモデル実行の最適化技術
- **型駆動開発**: TypeScriptを活用した堅牢なコードベース構築
- **非同期処理パターン**: 複雑な非同期処理のエレガントな管理手法
- **セキュリティベストプラクティス**: OAuth実装とトークン管理の安全設計

## 🌟 今後の展望

- **追加言語サポート**: より多くのプログラミング言語への対応拡大
- **チーム分析機能**: 複数開発者間でのコードレビューと品質メトリクス共有
- **AIコード自動修正**: 検出された問題の自動修正提案と適用機能
- **ディープラーニングモデルのさらなる最適化**: エッジAI技術の応用

## 🚀 セットアップとデプロイ

### 開発環境構築

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/codecoach.git
cd codecoach

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.localファイルを編集して必要な値を設定

# 開発サーバーの起動
npm run dev
```

### 環境変数設定

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
VITE_FIREBASE_DATABASE_URL=your-database-url
```

### デプロイ

```bash
# 本番ビルド
npm run build

# Firebaseへのデプロイ（Firebase CLIが必要）
firebase deploy
```

## 👨‍💻 開発者

- [常木泰成](https://github.com/taisei173263) - フルスタック開発者

---

**注**: このプロジェクトは個人の学習・就職活動のために開発されたものです。プロジェクトに関するご質問やフィードバックは、GitHubのIssueまたは直接お問い合わせください。
