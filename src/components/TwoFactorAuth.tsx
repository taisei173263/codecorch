import React, { useState } from 'react';
import { auth } from '../firebase/services';
import { enableTwoFactorAuth, verifyTwoFactorCode } from '../firebase/services';
import { QRCodeCanvas } from 'qrcode.react';
import * as speakeasy from 'speakeasy';
import firebase from 'firebase/app';

interface TwoFactorAuthProps {
  user: firebase.User;
  onComplete: () => void;
  onCancel: () => void;
}

const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({ user, onComplete, onCancel }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>('');
  const [isSettingUp, setIsSettingUp] = useState(true);
  const [secret, setSecret] = useState('');

  // 2FAのセットアップを開始
  const startSetup = async () => {
    try {
      if (!user) throw new Error('ユーザーが見つかりません');

      // シークレットキーの生成
      const generatedSecret = speakeasy.generateSecret({
        length: 20,
        name: `CodeCoach:${user.email}`
      });

      // シークレットを保存
      const result = await enableTwoFactorAuth(user.uid, generatedSecret.base32);
      if (result.success) {
        setSecret(generatedSecret.base32);
        setIsSettingUp(false);
      } else {
        setError('2FAの設定に失敗しました');
      }
    } catch (error) {
      console.error('2FA設定エラー:', error);
      setError('エラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
    }
  };

  // 2FAコードの検証
  const handleVerify = async () => {
    try {
      if (!user) throw new Error('ユーザーが見つかりません');

      const result = await verifyTwoFactorCode(user.uid, code);
      if (result.success) {
        onComplete();
      } else {
        // エラーが文字列でない場合は標準メッセージを使用
        const errorMsg = typeof result.error === 'string' ? result.error : '無効な認証コードです';
        setError(errorMsg);
      }
    } catch (error) {
      console.error('2FA検証エラー:', error);
      setError('エラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        2段階認証の設定
      </h2>

      {isSettingUp ? (
        <div>
          <p className="mb-4 text-gray-600 dark:text-gray-300">
            2段階認証を設定するには、以下の手順に従ってください：
          </p>
          <ol className="list-decimal list-inside mb-4 text-gray-600 dark:text-gray-300">
            <li>Google Authenticatorなどの認証アプリをインストール</li>
            <li>「セットアップを開始」をクリック</li>
            <li>表示されるQRコードをスキャン</li>
            <li>認証アプリに表示されるコードを入力</li>
          </ol>
          <button
            onClick={startSetup}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            セットアップを開始
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              以下のQRコードを認証アプリでスキャンしてください：
            </p>
            <div className="bg-white p-2 inline-block">
              <QRCodeCanvas
                value={`otpauth://totp/CodeCoach:${user.email}?secret=${secret}&issuer=CodeCoach`}
                size={200}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              認証コード
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="6桁のコードを入力"
            />
          </div>

          {error && (
            <p className="text-red-500 mb-4">{error}</p>
          )}

          <div className="flex justify-end space-x-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
            >
              キャンセル
            </button>
            <button
              onClick={handleVerify}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              検証
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TwoFactorAuth; 