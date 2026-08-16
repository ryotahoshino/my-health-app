<!--
Sync Impact Report
- Version change: [TEMPLATE] → 1.0.0
- Modified principles: N/A (initial ratification; template placeholders replaced with concrete principles)
- Added sections:
  - 目的 (Purpose preamble)
  - Core Principles I–IX (アクセシビリティ・ファースト, 仕様駆動開発, テスト先行,
    スキーマの一次ソースを一つにする, 外部I/Oは端に寄せる, データ層は差し替え可能にする,
    可視化は断定しない, 秘匿情報を扱わない, ブランチ運用)
  - 技術スタック (technology stack, change requires spec agreement)
  - 非目標 (explicit non-goals)
  - Governance
- Removed sections: none (template placeholder scaffold superseded)
- Follow-up TODOs: none
-->

# my-health-app Constitution

## 目的

既存のトレーニング記録アプリが自分には使いにくいため、自分が使いやすいものを作る。
あわせて、アクセシビリティ準拠のUI実装と、業務で扱っていない技術領域
(GraphQL・コンテナデプロイ)の習得を目的とする。個人利用が前提。

## Core Principles

### I. アクセシビリティ・ファースト
freeeアクセシビリティー・ガイドラインに準拠する。WCAGのレベルAに相当する項目は
MUST、レベルAAに相当する項目はSHOULDとして扱う。
UIコンポーネントを追加・変更する際は、該当するチェック項目を受け入れ条件に含める。
「後で対応する」は認めない。

### II. 仕様駆動開発
実装は必ず spec の作成と人間の承認から始める。
spec には目的・要件・受け入れ条件(Given/When/Then)・スコープ外を含める。
受け入れ条件は `[自動]`(vitest / Storybook Interaction Test)と
`[手動]`(実機・ブラウザでしか確認できないもの)を区別して記載する。
承認されていない spec の実装を進めない。

### III. テスト先行
受け入れ条件をテストに落としてから実装する。テストなしで実装を始めない。
実装完了時は受け入れ条件との対応表を提示する。

### IV. スキーマの一次ソースを一つにする
GraphQLスキーマの一次ソースはサーバー側のcode-first定義(Pothos)とし、
SDLとTypeScript型の二重管理を行わない。
クライアントの型・フック・バリデータはスキーマから生成する。
値の制約(範囲・必須・書式)はZodが担当し、型の形はGraphQLが担当する。

### V. 外部I/Oは端に寄せる
fetch・ストレージ・DBアクセスは各レイヤーの端に置き、
ドメインロジックは純粋関数に保つ。テストは依存を注入して検証する。

### VI. データ層は差し替え可能にする
永続化の実装(ローカル完結か、サーバー同期か)は抽象化の裏に置き、
アプリケーションコードが特定の実装に依存しないようにする。

### VII. 可視化は断定しない
記録データの相関を示す機能では、因果関係を主張する表現を用いない。
観察された事実の並置に留め、判断は利用者に委ねる。
算出値については計算式と仮定した定数を画面上で確認できるようにする。

### VIII. 秘匿情報を扱わない
APIキー・トークンはコードにも設定ファイルにも書かない。
ローカルは `.env.local`、CIは各サービスのSecretsで管理し、
`.gitignore` に必ず含める。

### IX. ブランチ運用
機能ブランチは main から切り、main へ戻す。機能ブランチ同士をマージしない。
ストーリーやフェーズ単位で分割する場合も、それぞれ main から独立して切る。
git操作はコマンドで行い、操作前に必ず現在のブランチと差分を確認する。

## 技術スタック
<!-- 変更には spec での合意を要する -->

- フロントエンド: React + TypeScript + Vite(SPA)、PWA対応
- UI: MUI v6(無料で利用できる範囲のみ)。スタイルは styled で統一
- 共通コンポーネント: slotProps / slot 形式で拡張点を提供する
- グラフ: MUI X Charts(Community版)
- API: GraphQL(RESTは採用しない)
- サーバー: Node.js + GraphQL Yoga + Pothos(code-first)
- バリデーション: Zod(サーバー側は Pothos の validation プラグイン経由)
- APIクライアント: TanStack Query + graphql-request + GraphQL Code Generator
- フォーム: react-hook-form + Zod + MUI
- テスト: vitest、Storybook(Interaction Test / a11yチェック)

## 非目標

このプロジェクトでは以下を作らない:

- 摂取カロリーの記録機能(入力コストに見合わないため)
- ネイティブアプリ化(HealthKit / Health Connect との直接連携)
- SSR / SEO対応
- MUI X の有償機能を要する実装
- 複数ユーザー・共有・SNS的な機能

## Governance

本憲法はプロジェクトの他のすべての慣行に優先する。原則 I〜IX、技術スタック、非目標の
変更は、spec 上での人間の承認を経た改訂によってのみ行う。

- **改訂手続き**: 変更提案は本ファイルへの diff として提示し、承認後にコミットする。
  技術スタックの変更は原則 II(仕様駆動開発)に従い、spec での合意を要する。
- **バージョニング**: セマンティックバージョニングに従う。
  - MAJOR: 既存原則の後方互換性のない削除・再定義。
  - MINOR: 新規原則・セクションの追加、既存内容の実質的拡張。
  - PATCH: 文言修正・明確化などの非意味的な変更。
- **コンプライアンスレビュー**: spec・plan・tasks の作成時、および実装完了時に本憲法との
  整合性を確認する。特に原則 I(アクセシビリティ)と III(テスト先行)は受け入れ条件で
  明示的に検証する。

**Version**: 1.0.0 | **Ratified**: 2026-08-16 | **Last Amended**: 2026-08-16
