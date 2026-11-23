# my-health-app

体重・トレーニング・歩数を記録し、消費カロリーを可視化する個人用ヘルスケアアプリ。
既存のトレーニング記録アプリが使いにくかったため、自分用に作っている。
あわせてアクセシビリティ準拠のUI実装と、業務では扱わないGraphQLの習得も目的とする
([constitution](.specify/memory/constitution.md)参照)。個人利用が前提で、
認証・複数ユーザー対応・本番デプロイは範囲外。

## 技術スタック

- **サーバー**: Node.js 22, TypeScript, GraphQL Yoga, Pothos(code-first schema builder),
  Zod, Postgres(本番は Neon / テストとローカルは PGlite), vitest
- **クライアント**: React 19, Vite, MUI, `@mui/x-charts`, react-hook-form + Zod,
  TanStack Query, GraphQL Code Generator, Storybook(Interaction Test + a11yアドオン),
  vite-plugin-pwa
- **パッケージ管理**: Yarn Berry(Corepack管理、`yarn workspaces`によるモノレポ)

GraphQLスキーマの一次ソースはPothosのcode-first定義のみで、`apps/server/schema.graphql`
はそこから`printSchema()`で書き出すビルド時生成物(手書き・手動編集はしない)。

## セットアップ

### 前提条件

- Node.js 22 以上
- Corepackが有効なこと(`corepack yarn --version` でYarn Berryが動くことを確認。
  グローバルシムの有効化に管理者権限が必要な環境では `corepack yarn <command>` の形で実行する)

### インストール

```bash
# リポジトリルートで一括インストール(apps/client, apps/server 両方)
corepack yarn install
```

### 開発サーバーの起動

```bash
# サーバーのGraphQLスキーマ(Pothos code-first)からSDLを生成
corepack yarn workspace @my-health-app/server generate:schema

# クライアントの型・フックをSDLから生成
corepack yarn workspace @my-health-app/client codegen

# サーバー起動(接続先は apps/server/.env.local の DATABASE_URL)
corepack yarn dev:server

# ネットワークに接続せずに動かす場合(保存先は apps/server/data/local-pgdata)
corepack yarn workspace @my-health-app/server dev:local

# 別ターミナルでクライアント起動
corepack yarn dev:client

# Storybookの起動(コンポーネント単位の確認用)
corepack yarn storybook
```

`generate:schema` → `codegen` は、サーバー側のGraphQL型を変更するたびに再実行する
(クライアントのコード生成はサーバーの実行中である必要はなく、静的な`schema.graphql`
ファイルのみを入力とする)。

### データベース

記録の保存先は Postgres。本番は Neon(無料プラン)、テストとローカル開発は
プロセス内で動く PGlite を使う(ネットワーク接続なしでテストできる)。

接続情報は環境変数 `DATABASE_URL` で渡す。`apps/server/.env.local` に置き、
リポジトリには含めない(`.gitignore` 対象)。

```bash
# apps/server/.env.local
# DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
```

スキーマの変更は `apps/server/migrations/` の番号付きSQLファイルで管理する。
アプリの起動時にスキーマは作成されないため、接続先を用意したら次を実行する。

```bash
# 未適用のスキーマ変更を順に適用(何度実行しても安全)
corepack yarn workspace @my-health-app/server migrate

# 固定データ(種目マスタ・食材)の投入(何度実行しても重複しない)
corepack yarn workspace @my-health-app/server seed
```

## テスト・Lint・フォーマット

```bash
# ドメインロジック・リポジトリ・リゾルバの単体/統合テスト
corepack yarn workspace @my-health-app/server test

# UIコンポーネントのStorybook Interaction Test(a11yチェック含む)
corepack yarn workspace @my-health-app/client test

# Lint・フォーマットチェック(リポジトリ全体)
corepack yarn lint
corepack yarn format:check
```

CI(`.github/workflows/ci.yml`)では、上記に加えてtypecheck・buildも実行する。

## 動作確認

実装後にエンドツーエンドで動作することを確認する手順は
[specs/001-training-calorie-tracking/quickstart.md](specs/001-training-calorie-tracking/quickstart.md)
にまとめている。自動テストで検証できる受け入れ条件(`[自動]`)と、
キーボード操作・スクリーンリーダーなど実機でのみ確認できるもの(`[手動]`)を
区別して記載している。

## ドキュメント

- [プロジェクト憲法](.specify/memory/constitution.md) — 目的・原則・技術スタック・非目標
- [feature spec](specs/001-training-calorie-tracking/spec.md) — 要件・受け入れ条件
- [実装計画](specs/001-training-calorie-tracking/plan.md) — アーキテクチャ・ディレクトリ構成
- [quickstart](specs/001-training-calorie-tracking/quickstart.md) — セットアップ・動作確認手順
