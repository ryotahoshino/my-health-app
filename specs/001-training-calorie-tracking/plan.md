# Implementation Plan: 体重・トレーニング記録と消費カロリーの可視化

**Branch**: `001-training-calorie-tracking` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-training-calorie-tracking/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

体重・トレーニングセッション(種目・セット数・回数・重量)・歩数を記録し、METs方式で消費カロリーを算出して可視化する。あわせて、GraphQL APIとリポジトリ抽象を用いたアプリ全体のアーキテクチャ(UI → GraphQL API → 永続化)と、アクセシビリティ対応の実装パターン(キーボード操作、フィールド関連付けエラー、グラフの非視覚的代替)を確立し、以降の機能で再利用できる形にする。永続化は SQLite をリポジトリインターフェースの背後に置き、差し替え可能とする(research.md 参照)。

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 LTS

**Primary Dependencies**:
- クライアント: React, Vite, MUI v6(`@mui/material`, `@mui/x-charts`), `@emotion/react`/`@emotion/styled`, react-hook-form, `@hookform/resolvers`, Zod, TanStack Query, graphql-request, GraphQL Code Generator, `vite-plugin-pwa`
- サーバー: `graphql-yoga`, `@pothos/core`, `@pothos/plugin-zod`, `graphql`, Zod, `better-sqlite3`
- 共通: vitest, Storybook(Interaction Test / a11yアドオン)

**Storage**: SQLite(`better-sqlite3`によるファイルDB)。リポジトリインターフェースの背後に配置し、差し替え可能とする(research.md #2)

**Testing**: vitest(ドメインロジック単体テスト・GraphQLリゾルバ/リポジトリ統合テスト)、Storybook Interaction Test + a11yアドオン(UIコンポーネントの`[自動]`受け入れ条件)、ブラウザでの手動確認(`[手動]`受け入れ条件)

**Target Platform**: モダンブラウザ(デスクトップ・モバイル、レスポンシブ)。ローカル開発環境で完結するNode.jsサーバー(本番デプロイ・コンテナ化はこのspecの範囲外)

**Project Type**: Web application(frontend + backend の2ワークスペース構成、research.md #1)

**Performance Goals**: SC-003(セッション詳細を開いてから3秒以内に消費カロリーと算出根拠を表示)、SC-007(直近30日分のデータで日次・週次・月次集計を5秒以内に表示)を満たす。単一ユーザーのローカル利用のためスループット要件はなし

**Constraints**: 単一ユーザー・単一環境(認証なし)。GraphQLスキーマの一次ソースはPothos code-first定義のみ(原則IV)。ドメインロジックは純粋関数とし外部I/Oは端に寄せる(原則V)。秘匿情報は扱わない(原則VIII、該当する外部APIキー等は本機能にはない)

**Scale/Scope**: 開発者本人1名分のデータ。体重・トレーニングセッション・歩数の記録は数年分でも数千件程度を想定。ユーザーストーリー5件(P1〜P5)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 判定 | 根拠 |
|---|---|---|
| I. アクセシビリティ・ファースト | PASS | FR-018〜FR-023でキーボード操作・エラー関連付け・グラフの非視覚的代替を要求。UIコンポーネントの受け入れ条件はStorybook a11yアドオンで検証(research.md #6) |
| II. 仕様駆動開発 | PASS | 本planはユーザー承認済みのspec.mdに基づく(NEEDS CLARIFICATIONは全て解消済み) |
| III. テスト先行 | PASS(実装フェーズで担保) | `/speckit-tasks`でテストタスクを実装タスクより先に並べる。本plan自体はテストを書く段階ではない |
| IV. スキーマの一次ソースを一つにする | PASS | Pothos code-first定義のみを一次ソースとし、SDLは`printSchema`によるビルド時の副産物(research.md #3)。値の制約はZodが担当 |
| V. 外部I/Oは端に寄せる | PASS | リポジトリ層にDBアクセスを集約し、消費カロリー計算・総ボリューム計算・期間集計は純粋関数として実装(research.md #6) |
| VI. データ層は差し替え可能にする | PASS | SQLite実装はリポジトリインターフェースの背後に配置(research.md #2) |
| VII. 可視化は断定しない | PASS | FR-009・FR-013で計算式・定数・出典の画面表示を要求。相関を示す表現は本機能に含まない |
| VIII. 秘匿情報を扱わない | PASS | 本機能は外部APIキー等を必要としない。DBファイルパス等の設定が増える場合は`.env.local`を用いる |
| IX. ブランチ運用 | PASS | `001-training-calorie-tracking`をmainから作成済み。実装作業もこのブランチ内で行う |

違反なし。Complexity Trackingへの記載は不要。

## Project Structure

### Documentation (this feature)

```text
specs/001-training-calorie-tracking/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── schema.graphql
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
package.json              # npm workspaces root
apps/
├── client/                # React + TypeScript + Vite(SPA, PWA対応)
│   ├── src/
│   │   ├── features/
│   │   │   ├── weight/         # P1: 体重記録
│   │   │   ├── training/       # P2, P3: トレーニング記録・消費カロリー
│   │   │   ├── steps/          # P4: 歩数記録・消費カロリー
│   │   │   └── foods/          # P5: 食材参照
│   │   ├── components/         # 共通UIコンポーネント(slotProps/slot対応)
│   │   ├── graphql/            # GraphQL Code Generator 出力(生成物)
│   │   └── app/                # ルーティング・レイアウト
│   ├── .storybook/
│   └── codegen.ts               # apps/server/schema.graphql を入力元とする
└── server/                 # Node.js + GraphQL Yoga + Pothos(code-first)
    ├── src/
    │   ├── schema/              # Pothosによるcode-first型定義(一次ソース)
    │   ├── domain/               # 純粋関数(消費カロリー計算・総ボリューム計算・期間集計)
    │   ├── repositories/          # リポジトリインターフェースとSQLite実装
    │   └── db/                    # better-sqlite3接続・スキーマ作成
    ├── schema.graphql            # printSchema()によるビルド時生成物
    └── data/                      # SQLiteファイル(.gitignore対象)
```

**Structure Decision**: フロントエンド(`apps/client`)とサーバー(`apps/server`)を npm workspaces で分離するWebアプリケーション構成(research.md #1)。GraphQLスキーマの一次ソースは `apps/server/src/schema` のPothos定義のみとし、クライアントはビルド時に生成される `apps/server/schema.graphql` を介して型・フックを生成する(research.md #3)。ドメインロジック(`apps/server/src/domain`)とリポジトリ(`apps/server/src/repositories`)を分離し、原則V・VIを満たす。

## Complexity Tracking

*(Constitution Checkに違反なし。記載事項なし)*
