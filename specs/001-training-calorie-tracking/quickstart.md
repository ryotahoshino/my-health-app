# Quickstart: 体重・トレーニング記録と消費カロリーの可視化

このガイドは、実装後に本機能がエンドツーエンドで動作することを確認するための手順である。データモデルは [data-model.md](./data-model.md)、GraphQL契約は [contracts/schema.graphql](./contracts/schema.graphql) を参照。

## 前提条件

- Node.js 22 LTS、Corepack有効(`corepack yarn --version` でYarn Berryが動くことを確認。グローバルシムの有効化に管理者権限が必要な環境では `corepack yarn <command>` の形で実行する)
- リポジトリルートで `yarn install`(Yarn workspaces により `apps/client`, `apps/server` の依存を一括インストール。research.md #1)

## セットアップ

```bash
# サーバーのGraphQLスキーマ(Pothos code-first)からSDLを生成
yarn workspace @my-health-app/server generate:schema

# クライアントの型・フックをSDLから生成(research.md #3)
yarn workspace @my-health-app/client codegen

# サーバー起動(SQLiteファイルは初回起動時に apps/server/data 配下へ自動作成)
yarn dev:server

# 別ターミナルでクライアント起動
yarn dev:client

# Storybookの起動(コンポーネント単位の確認用)
yarn storybook
```

## 自動テストの実行

```bash
# ドメインロジック・リポジトリ・リゾルバの単体/統合テスト
yarn workspace @my-health-app/server test

# UIコンポーネントのStorybook Interaction Test / a11yチェック
# (vite.config.ts の test.projects に addon-vitest 経由で組み込まれている)
yarn workspace @my-health-app/client test
```

各ストーリーの `[自動]` 受け入れ条件([spec.md](./spec.md) 参照)は、上記テストが通ることで検証される。

## 手動確認シナリオ(`[手動]`受け入れ条件)

ブラウザでクライアントを開き、以下を確認する。

1. **P1(体重)**: 体重入力フォームをマウスを使わずTabキーとEnterキーのみで操作し、記録の作成・保存が完了できること
2. **P2(トレーニング)**: セッション入力フォームで、種目の追加・削除を含む一連の操作をキーボードのみで完了できること
3. **P5(食材参照)**: スクリーンリーダー(例: NVDA/VoiceOver)で食材一覧を読み上げ、食材名・カロリー・PFCの対応が正しく伝わること

## エンドツーエンド確認の流れ(P1→P4の依存順)

1. 体重を1件記録する(P1) → 一覧・グラフに反映されることを確認
2. トレーニングセッションを1件、種目を含めて記録する(P2) → セッション詳細に反映されることを確認
3. 同じセッション詳細で消費カロリーと算出根拠(計算式・定数・出典)が表示されることを確認する(P3)。体重記録前の状態で確認すると「算出不可」の表示になることも確認する(FR-011)
4. 同日の歩数を記録し(P4)、歩数分の消費カロリーと、トレーニング分との合算値・「概算」注記が表示されることを確認する(FR-014)
5. 日次・週次・月次の集計表示を切り替え、5秒以内に表示されること(SC-007)、記録がない日が0ではなく欠測として扱われることを確認する
6. すべての記録を削除し、各画面が空状態メッセージと記録作成への導線を表示すること(FR-023)を確認する

## 既知の非対応(このspecの範囲外)

- 認証・複数ユーザー、端末間データ同期、任意の日付範囲指定、種目マスタ・食材一覧のCRUD、ヘルスケアアプリ連携、本番デプロイ・コンテナ化(spec.md スコープ外を参照)
