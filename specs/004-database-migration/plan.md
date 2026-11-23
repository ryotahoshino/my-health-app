# Implementation Plan: 記録データの保存先をマネージドデータベースへ移す

**Branch**: `004-database-migration` | **Date**: 2026-11-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-database-migration/spec.md`

## Summary

記録の保存先を、開発用PCのファイル(better-sqlite3 による SQLite)から、無料枠のマネージド Postgres(Neon)へ移す。
テストとローカル開発はプロセス内で動く Postgres(PGlite)を使い、ネットワーク接続なしで検証できる状態を保つ。

技術的な中心は3つ。

1. **SQL 実行の抽象化**: `query` と `transaction` だけを持つ最小のインターフェースを定義し、
   実行時は `pg`(Neon 接続)、テスト・ローカルは PGlite を注入する(原則V・VI)。
2. **同期 → 非同期**: `better-sqlite3` は同期APIのため、リポジトリの戻り値が `Promise` になる。
   GraphQL は Promise を解決できるので、リゾルバは後続処理がある箇所だけ `await` を足す。
3. **スキーマ変更の履歴管理**: 番号付きSQLファイルと適用済み記録テーブル、小さな適用処理を用意し、
   アプリ起動時の DDL 実行をやめる。

GraphQL スキーマ・クライアントは変更しない。ドメインロジック(カロリー算出・期間集計)も変更しない。

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22(CI も 22)

**Primary Dependencies**:

- 追加: `pg`(実行時の Postgres 接続)、`@electric-sql/pglite`(テスト・ローカルの保存先)
- 維持: GraphQL Yoga、Pothos、Zod、vitest
- 用途変更: `better-sqlite3` は既存データの書き出しスクリプト専用(devDependencies へ移す)
- 追加しない: ORM・マイグレーションフレームワーク(001 research #2 の方針を維持)

**Storage**: Neon(マネージド Postgres、無料枠)。テスト・ローカル開発は PGlite(インメモリ / ファイル)

**Testing**: vitest。サーバーのテストは PGlite を注入して実行(ネットワーク不要)。
クライアントのテストは変更なし(Storybook Interaction Test + 単体テスト)

**Target Platform**: 開発者のPC(ローカル実行)。サーバーの公開先は本specの範囲外

**Project Type**: monorepo(`apps/client` + `apps/server`)。本specで変更するのは `apps/server` と CI

**Performance Goals**: 個人利用(1日あたり数十回の読み書き)。画面の操作感を移行前と同等に保つ

**Constraints**:

- Neon 無料プランはアイドル5分で停止し、次のクエリで復帰する(通常は数百ミリ秒、research #1)
- 無料枠はストレージ1GB/プロジェクト、コンピュート月100 CU-hours、データ転送月5GB(research #1)
- テストの実行時間は移行前の2倍以内(SC-006)
- 接続情報はコード・リポジトリに置かない(原則VIII)

**Scale/Scope**: 既存6テーブル、リポジトリ3つ、GraphQLリゾルバ6ファイル、サーバーのテスト17ファイル(107件)

## Constitution Check

*GATE: Phase 0 の前に通過必須。Phase 1 の設計後に再確認する。*

| 原則 | 評価 | 根拠 |
|---|---|---|
| I. アクセシビリティ・ファースト | 該当なし | 画面を変更しない。失敗時の表示は現状維持(FR-007) |
| II. 仕様駆動開発 | 通過 | 技術スタックの変更(保存先・依存の追加)を spec と本計画で合意する |
| III. テスト先行 | 通過 | PGlite により外部サービスなしでテストが書ける。既存107件を通したまま段階移行する(research #8) |
| IV. スキーマの一次ソースを一つにする | 通過 | GraphQL は Pothos のまま。DBスキーマの一次ソースはマイグレーションSQLに一本化し、`schema.sql` は削除する |
| V. 外部I/Oは端に寄せる | 通過 | SQL 実行の実体を `createApp` に注入する既存の形を維持。接続の生成は入口(CLI / index.ts)に限る |
| VI. データ層は差し替え可能にする | 通過 | `pg` と PGlite の2実装が同じインターフェースを満たすことで、差し替え可能性が実証される |
| VII. 可視化は断定しない | 該当なし | 算出ロジック・表示を変更しない |
| VIII. 秘匿情報を扱わない | 通過 | 接続情報は `.env.local`(gitignore)と CI Secrets。テストは接続情報を必要としない |
| IX. ブランチ運用 | 通過 | `004-database-migration` ブランチで作業する |
| X. デザインシステムに準拠する | 該当なし | 画面を変更しない |

**違反**: なし。SQL実行の抽象化レイヤを1つ増やすが、これは原則VIが要求する差し替え可能性の実装であり、
ORM を導入しない方針の中で最小の構成(`query` と `transaction` のみ)に留める。

### 設計後の再確認(Phase 1 完了時点)

| 原則 | 評価 | 設計上の根拠 |
|---|---|---|
| III. テスト先行 | 通過 | 適用処理・投入処理・移送処理の検証手段を [contracts/migrations.md](./contracts/migrations.md) に定義し、すべて `[自動]` にした。既存107件が回帰テストとして機能する |
| IV. スキーマの一次ソースを一つにする | 通過 | DBスキーマは `migrations/` に一本化(`schema.sql` は削除)。固定データは TypeScript 配列を一次ソースに保ち、SQL に `INSERT` を書かない |
| V. 外部I/Oは端に寄せる | 通過 | 接続の生成は入口(`index.ts` / `scripts/*.ts` / テスト支援)に限定し、リポジトリは `SqlExecutor` を受け取るだけ([contracts/database-access.md](./contracts/database-access.md) 規則3・4) |
| VI. データ層は差し替え可能にする | 通過 | `pg` と PGlite の2実装が同一インターフェースを満たす構成になっている |
| VIII. 秘匿情報を扱わない | 通過 | 接続情報の読み取りは入口のみ。CI は接続情報を必要としない(research #7) |

設計の過程で新たな違反・逸脱は発生していない。

## Project Structure

### Documentation (this feature)

```text
specs/004-database-migration/
├── plan.md              # このファイル
├── research.md           # Phase 0 の調査結果
├── data-model.md         # Phase 1: スキーマの対応表と制約
├── quickstart.md          # Phase 1: 動作確認の手順
├── contracts/
│   ├── database-access.md # SQL実行とリポジトリの契約
│   └── migrations.md      # マイグレーションと投入データの契約
├── checklists/
│   └── requirements.md    # 仕様の品質チェックリスト(作成済み)
└── tasks.md               # /speckit-tasks の出力(このコマンドでは作らない)
```

### Source Code (repository root)

```text
apps/server/
├── migrations/                    # 【新規】番号付きのスキーマ変更(SQL)
│   └── 0001_init.sql
├── scripts/
│   ├── generate-schema.ts         # 既存
│   ├── migrate.ts                 # 【新規】マイグレーションの適用(CLI)
│   ├── seed.ts                    # 【新規】固定データの投入(CLI)
│   ├── export-sqlite.ts           # 【新規】既存データの書き出し(使い捨て)
│   └── import-records.ts          # 【新規】書き出したデータの取り込み(使い捨て)
├── src/
│   ├── db/
│   │   ├── client.ts              # 【新規】SQL実行インターフェースと型
│   │   ├── postgresClient.ts      # 【新規】pg 実装(実行時)
│   │   ├── pgliteClient.ts        # 【新規】PGlite 実装(テスト・ローカル)
│   │   ├── migrate.ts             # 【新規】適用処理の本体
│   │   ├── seed.ts                # 【新規】固定データ投入の本体(冪等)
│   │   ├── connection.ts          # 【削除】SQLite 接続
│   │   ├── schema.sql             # 【削除】起動時DDL
│   │   └── seed/                  # 固定データの配列は維持(投入処理のみ変更)
│   ├── repositories/              # 非同期化(3ファイル + テスト)
│   ├── schema/                    # 後続処理がある箇所に await を追加
│   ├── app.ts                     # createApp の引数を SQL実行インターフェースに変更
│   └── index.ts                   # 接続の生成のみ。DDL・投入は行わない
└── test-support/
    └── createTestDatabase.ts      # 【新規】PGlite を用意して適用処理を実行する

.github/workflows/ci.yml           # サーバーのテストは接続情報なしで動く(変更の確認のみ)
apps/client/                        # 変更なし
```

**Structure Decision**: 既存の monorepo 構成を維持する。変更は `apps/server` に閉じ、クライアントには一切触れない。
データ層の新規ファイルは `apps/server/src/db/` に集約し、使い捨てのスクリプトは `apps/server/scripts/` に置いて、
移行完了後に削除できる単位にする。

## Complexity Tracking

> Constitution Check に違反がないため、記載は不要。
