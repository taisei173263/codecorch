# CodeCoach

CodeCoachは、AIを活用したコード分析とパーソナライズされた学習パスを提供するWebアプリケーションです。GitHub上のプロジェクトを分析し、プログラミングスキルの向上をサポートします。

## 主な機能

- **GitHubリポジトリの分析**: コード品質、命名規則、複雑性などを評価
- **パーソナライズされた学習パス**: 分析結果に基づいて最適なスキル向上の道筋を提案
- **AIによる推奨**: TensorFlow.jsを活用したコード分析と学習リソースの提案
- **学習進捗管理**: 学習リソースの進捗を記録し、スキル向上を追跡
- **マルチプラットフォーム対応**: レスポンシブデザインとダークモード対応

## 技術スタック

- **フロントエンド**: React, TypeScript, TailwindCSS
- **認証**: Firebase Authentication
- **データストア**: Firebase Firestore
- **AI/ML**: TensorFlow.js
- **CI/CD**: Vercel/Netlify (推奨)

## セットアップ方法

### 前提条件

- Node.js 18.0.0以上
- npm 9.0.0以上
- Firebase プロジェクト

### インストール

1. リポジトリをクローンする
   ```
   git clone https://github.com/taisei173263/codecorch
   cd codecoach
   ```

2. 依存関係をインストールする
   ```
   npm install
   ```

3. 環境変数を設定する
   - `.env.example`ファイルを`.env`にコピーして、必要な値を設定します
   - Firebase設定を実際のプロジェクト情報に更新します

4. 開発サーバーを起動する
   ```
   npm run dev
   ```

5. ビルドする（本番環境用）
   ```
   npm run build
   ```

## Environment Setup

To set up the environment variables for Firebase:

1. Create a `.env.local` file in the project root
2. Add your Firebase configuration variables to this file:

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

⚠️ **Security Note**: Never commit API keys or secrets to the repository. The `.env.local` file is ignored by Git.

## Firebaseのセットアップ

1. [Firebase Console](https://console.firebase.google.com/)でプロジェクトを作成します
2. Authentication機能を有効にし、GitHub、Google、Emailプロバイダーを設定します
3. Firestoreデータベースを作成し、適切なセキュリティルールを設定します
4. Firebaseプロジェクト設定から取得したAPIキーと設定情報を`.env`ファイルに追加します

## GitHubとの連携

GitHub APIと連携するには：

1. [GitHub Developer Settings](https://github.com/settings/developers)で新しいOAuth Appを作成します
2. Authorization callback URLを設定します（例: `https://yourdomain.com/auth/github/callback`）
3. 取得したClient IDとClient Secretを環境変数に設定します

## デプロイ方法

### Vercelへのデプロイ（推奨）

1. [Vercel](https://vercel.com)アカウントを作成します
2. GitHubリポジトリと連携します
3. 環境変数を設定します
4. デプロイします

### Netlifyへのデプロイ

1. ビルドコマンド: `npm run build`
2. 公開ディレクトリ: `dist`
3. 環境変数を設定します

## 貢献方法

1. リポジトリをフォークします
2. 新しいブランチを作成します: `git checkout -b feature/amazing-feature`
3. 変更をコミットします: `git commit -m 'Add amazing feature'`
4. ブランチをプッシュします: `git push origin feature/amazing-feature`
5. プルリクエストを作成します

## ライセンス

MIT License - 詳細はLICENSEファイルを参照してください

## 開発者

- あなたの名前 - [プロフィールへのリンク](https://github.com/yourusername)

---

プロジェクトのサポートや質問がある場合は、Issueを作成するか、直接お問い合わせください。
