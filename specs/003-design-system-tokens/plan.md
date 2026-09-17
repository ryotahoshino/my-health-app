# Implementation Plan: デザインシステム準拠のデザイントークン整備と全画面適用

**Branch**: `003-design-system-tokens` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-design-system-tokens/spec.md`

## Summary

デジタル庁デザインシステムの公式デザイントークン(npm パッケージ `@digital-go-jp/design-tokens`)を
依存に追加し、その値を MUI テーマへ写し取ってトークンを一元化する。公式トークンに含まれない
余白は基準8pxのスケールとして自前定義し、テキストスタイル(見出し/本文/補足)は公式の
個別トークンを合成して定義する。そのテーマを4画面と全共通コンポーネントに適用し、
アプリシェルをヘッダー+ナビゲーションとして作り直すことで、情報の階層が視覚的に分かる状態にする。
トークンを迂回した生値の記述は Lint で禁止し、コントラストは既存のアクセシビリティ検査で担保する。

## Technical Context

**Language/Version**: TypeScript 5.9.3 / Node.js 22

**Primary Dependencies**: React 19、Vite 8、MUI v6(`styled` で統一)、MUI X Charts 7(Community)、
`@digital-go-jp/design-tokens` 2.0.1(新規)、Noto Sans JP(自ホスト、新規)

**Storage**: N/A(本フィーチャーは永続データに触れない。FR-013)

**Testing**: vitest、Storybook Interaction Test + アクセシビリティ検査(axe、CIで全ストーリー実行)、
ブラウザ自動操作による通し確認

**Target Platform**: モダンブラウザ(PC / スマートフォン)、PWA

**Project Type**: Web application(モノレポ: `apps/client` + `apps/server`)。本フィーチャーは
`apps/client` のみを変更する

**Performance Goals**: 書体の読み込み中も本文が判読でき、読み込み完了時にレイアウトが大きく
ずれないこと(SC-012)。既存の画面表示速度を明確に悪化させないこと

**Constraints**: 画面幅375pxで横スクロールを発生させない(FR-011)。コントラスト比は通常文字4.5:1・
非テキスト3:1以上(FR-008)。アクセシビリティ検査の違反0件を維持(FR-009)。
機能・データモデル・APIスキーマ・ドメインロジックは変更しない(FR-013)

**Scale/Scope**: 4画面(体重・トレーニング・歩数・食材)+アプリシェル、共通コンポーネント3種
(EmptyState / QueryState / PeriodSelector)、feature コンポーネント9種。単一利用者

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

憲法 v1.1.0 の原則 I〜X に対する評価:

| 原則 | 評価 | 根拠 |
|---|---|---|
| I. アクセシビリティ・ファースト | PASS | コントラスト比(FR-008)と検査違反0件(FR-009)を要件化。ナビゲーション作り直しに伴うキーボード操作・現在地表示も FR-016 / SC-011 で受け入れ条件化 |
| II. 仕様駆動開発 | PASS | spec を作成・確定済み(コミット `90aaf8d`)。受け入れ条件は `[自動]`/`[手動]` を区別 |
| III. テスト先行 | PASS(タスクで担保) | 既存ストーリーの期待値更新とトークン参照の検証を実装より先に行う。tasks で順序を固定する |
| IV. スキーマの一次ソースを一つにする | PASS | GraphQL スキーマに触れない(FR-013)。トークンについても一次ソースを公式パッケージ1つに限定し、値の二重管理をしない |
| V. 外部I/Oは端に寄せる | PASS | テーマ定義は純粋な設定値。I/O を新設しない |
| VI. データ層は差し替え可能にする | PASS | 該当なし(データ層を変更しない) |
| VII. 可視化は断定しない | PASS | グラフの配色をトークンに合わせるが、既存の非視覚的代替(表形式・テキスト要約)を維持する(FR-010) |
| VIII. 秘匿情報を扱わない | PASS | 追加する依存はいずれも公開物(MIT / SIL OFL 1.1)。鍵・トークンを扱わない |
| IX. ブランチ運用 | PASS | 実装は main から切ったブランチで行う |
| X. デザインシステムに準拠する | PASS | 参照元を公式トークンに限定(research #1)、生値の記述を Lint で禁止(research #4)、帰属表示を FR-017 で要件化 |

**Gate result**: 違反なし。Phase 0 に進行可。

### Post-Design Re-evaluation (Phase 1 完了後)

| 原則 | 再評価 | 補足 |
|---|---|---|
| I | PASS | アプリシェルの契約([contracts/app-shell.md](./contracts/app-shell.md))で現在地表示・キーボード操作・ランドマークを明文化 |
| III | PASS | [quickstart.md](./quickstart.md) に検証手順を定義。`[自動]`はテーマ単体テスト・Lint・ストーリー、`[手動]`は目視項目として分離 |
| IV | PASS | トークンの一次ソースは公式パッケージのみ。テーマは写像であり値を再定義しない([contracts/theme-tokens.md](./contracts/theme-tokens.md)) |
| X | PASS | 余白のみ自前定義になるが、その事実と根拠(公式に余白トークンが存在しない)を research #2 に記録済み |

**Gate result**: 違反なし。設計後も逸脱は発生していない。

## Project Structure

### Documentation (this feature)

```text
specs/003-design-system-tokens/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── theme-tokens.md  # テーマが公開するトークン面の契約
│   └── app-shell.md     # アプリシェル(ヘッダー・ナビゲーション)の契約
├── checklists/
│   └── requirements.md  # spec 品質チェックリスト
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/client/
├── src/
│   ├── app/
│   │   ├── theme/                    # 変更: theme.ts を分割してトークン層を明示する
│   │   │   ├── tokens.ts             # 公式トークンの写像 + 自前定義(余白スケール)
│   │   │   ├── textStyles.ts         # 見出し/本文/補足のテキストスタイル合成
│   │   │   ├── theme.ts              # MUIテーマ組み立て(palette/typography/shape/shadows/spacing)
│   │   │   ├── theme.test.ts         # 変更が全画面に波及することの検証(SC-004)
│   │   │   └── index.ts              # バレルエクスポート
│   │   ├── AppShell/                 # 新規: ヘッダー+ナビゲーション(FR-016)
│   │   │   ├── AppShell.tsx
│   │   │   ├── AppShell.stories.tsx
│   │   │   └── index.ts
│   │   └── App.tsx                   # 変更: AppShell を使う構成に差し替え
│   ├── components/                   # 変更: トークン参照へ置き換え
│   │   ├── EmptyState/
│   │   ├── PeriodSelector/
│   │   └── QueryState/
│   └── features/                     # 変更: トークン参照へ置き換え(9コンポーネント)
│       ├── weight/{WeightForm,WeightTrend,WeightTrendAggregate}/
│       ├── training/{TrainingSessionForm,TrainingSessionList,SessionCalorieCard}/
│       ├── steps/{StepsForm,DailyCalorieSummary}/
│       └── foods/{FoodList}/
├── public/fonts/                     # 新規: Noto Sans JP(自ホスト)+ ライセンス全文
├── index.html                        # 変更: 書体の読み込み指定
├── vite.config.ts                    # 変更: 事前キャッシュから書体を除外(research #3)
└── package.json                      # 変更: @digital-go-jp/design-tokens 等の追加

eslint.config.js                      # 変更: 生値(色コード・px)の直接記述を禁止(research #4)
README.md                             # 変更: 参照元と帰属表示の記載(FR-017)
```

**Structure Decision**: 既存のモノレポ構成を維持し、変更は `apps/client` とルートの Lint 設定・
README に限定する(`apps/server` は一切変更しない)。テーマは単一ファイルから
`src/app/theme/` ディレクトリへ分割し、「公式トークンの写像(tokens.ts)」→
「テキストスタイルの合成(textStyles.ts)」→「MUIテーマの組み立て(theme.ts)」という
依存の一方向を明示する。Storybook を持つコンポーネントは既存の規約どおり専用フォルダ
(`ComponentName/ComponentName.tsx` + `.stories.tsx` + `index.ts`)に配置するため、
新規の AppShell もこの規約に従う。

## Complexity Tracking

> Constitution Check に違反がないため記載事項なし。

トレードオフとして受け入れた事項のみ記録する:

| 事項 | 判断 | 理由 |
|---|---|---|
| 余白トークンを自前定義する | 受け入れ | 公式トークンに余白が含まれないため。基準8px・段階数を指針に合わせ、逸脱を最小化(research #2) |
| 書体を自ホストし事前キャッシュから除外する | 受け入れ | 外部依存とオフライン欠落を避けつつ、PWA の事前キャッシュ容量上限を超えないため(research #3) |
