---

description: "Task list for デザインシステム準拠のデザイントークン整備と全画面適用(API依存の注入を含む)"
---

# Tasks: デザインシステム準拠のデザイントークン整備と全画面適用(API依存の注入を含む)

**Input**: Design documents from `/specs/003-design-system-tokens/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/theme-tokens.md](./contracts/theme-tokens.md), [contracts/app-shell.md](./contracts/app-shell.md), [contracts/api-injection.md](./contracts/api-injection.md), [quickstart.md](./quickstart.md)

**Tests**: 憲法原則III(テスト先行)により必須。各フェーズでテストタスクを実装タスクより先に置き、実装前に失敗することを確認する。見た目の階層そのもの(SC-001〜003・SC-010)は `[手動]` のため quickstart の手動シナリオで確認する。

**Organization**: spec.md のユーザーストーリーごとにフェーズを分ける。US5(API依存の注入)と US1 はともに P1 だが、見た目の変更の安全網(画面単位のテスト)を先に用意するため US5 を先に実施する(spec.md Assumptions)。

**改訂履歴**: 2026-09-19 レビュー反映 — (1) アクセシビリティ(カラーコントラスト)は適用前の水準を優先、(2) Lint は最初から error で導入し違反が解消するまでリファクタ、(3) API依存の注入(US5)とテスト拡充を追加。憲法 v1.2.0 に対応。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行実行可能(別ファイル・未完了タスクへの依存なし)
- **[Story]**: 対応するユーザーストーリー(US1〜US5)
- 各タスクに具体的なファイルパスを含める

## Path Conventions

plan.md の Project Structure に基づく。

- テーマ: `apps/client/src/app/theme/`
- API依存の注入: `apps/client/src/app/api/`
- テスト支援(フェイク・デコレーター): `apps/client/src/test-support/`
- アプリシェル: `apps/client/src/app/AppShell/`
- 共通コンポーネント: `apps/client/src/components/`
- 機能: `apps/client/src/features/<feature>/`(`hooks/`・`<Feature>Page/`・表示部品)
- サーバー: `apps/server/src/app.ts`・`apps/server/src/index.ts` のみ変更(スキーマ・リゾルバ・リポジトリ・ドメインは変更しない、FR-013)

---

## Phase 1: Setup(依存・書体・テスト基盤)

**Purpose**: 公式トークンと書体を利用可能にし、単体テストを実行できる状態にする

- [X] T001 `@digital-go-jp/design-tokens@2.0.1` を `apps/client/package.json` の dependencies に追加し(`corepack yarn workspace @my-health-app/client add @digital-go-jp/design-tokens@2.0.1`)、default export `tokens` の各トークンの `$value` の実際の型(単位付き文字列か数値か)を確認して `specs/003-design-system-tokens/research.md` の #1 に追記する
- [X] T002 [P] Noto Sans JP(ウェイト400・700)を `@fontsource/noto-sans-jp@5.3.0` として `apps/client/package.json` に追加し、SIL Open Font License 1.1 の全文を `apps/client/public/licenses/noto-sans-jp-OFL.txt` に同梱する(research.md #3「実装時の変更」・#7。当初計画の `public/fonts/` への手動配置から変更)
- [X] T003 `@fontsource/noto-sans-jp` の `400.css` / `700.css`(日本語を unicode-range で約120分割、`font-display: swap`)を読み込む `apps/client/src/app/theme/fonts.css` を作成する。単一ファイルで約1MBになるサブセット別の `japanese-*.css` は使わない。読み込み(`main.tsx` / Storybook)は Phase 2 の T014・T015 で行う(FR-014 / SC-012、依存: T002)
- [X] T004 [P] `apps/client/vite.config.ts` の VitePWA 設定で、書体(`**/*.woff`・`**/*.woff2`)を事前キャッシュの対象から除外し(`workbox.globIgnores`)、書体を実行時キャッシュ(CacheFirst、`fonts`)で扱う設定を追加する。一時的に書体を読み込んだビルドで、事前キャッシュ内の書体が0件であることを確認する(research.md #3 のリスク対処)
- [X] T005 `apps/client/vite.config.ts` の `test.projects` に、Storybook 用とは別の単体テスト用プロジェクト(名前 `unit`、環境 node、対象 `src/**/*.test.{ts,tsx}`)を追加する。現状は Storybook のストーリーしか実行されず、`*.test.ts` を置いても実行されないため必須。`corepack yarn workspace @my-health-app/client test` で両プロジェクトが実行されることを確認する(依存: T004 と同一ファイルのため T004 の後)

---

## Phase 2: Foundational(すべてのユーザーストーリーをブロックする前提作業)

**Purpose**: トークン層・テーマ・コントラストの基準値・Lint を整え、生値を解消した状態を作る

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装に着手しない

### Tests for Foundational ⚠️

> テストを先に書き、実装前に失敗することを確認する(憲法原則III)

- [X] T006 [P] コントラスト比の算出関数のテストを `apps/client/src/app/theme/contrast.test.ts` に作成する。WCAG の相対輝度に基づく既知の値(例: 黒と白が 21:1)を検証する。実装前に失敗することを確認する(research.md #10)
- [X] T007 [P] テーマの単体テストを `apps/client/src/app/theme/theme.test.ts` に作成する。(a) 本文のテキストスタイルが16px以上・行高1.5以上(INV-2 / FR-012)、(b) 余白スケールが 4 / 8 / 16 / 24 / 32 / 48 px の6段階(INV-3 / FR-007)、(c) palette の各役割色が公式トークンの値と一致(INV-4)、ただし FR-018 により従来値を維持した組み合わせは research.md #10 に記録したものだけを例外とする、(d) `createAppTheme` に差し替えたトークンを渡すと、それを参照するテーマ全体の値に反映される(SC-004)。実装前に失敗することを確認する
- [X] T008 [P] `eslint.config.js` に、トークンを迂回した生値を検出するルールを **error** で追加する。対象は `apps/client/src/**/*.{ts,tsx}` の (a) 色コード文字列(`#rgb` / `#rrggbb` / `#rrggbbaa`)、(b) `px` / `rem` 付き寸法文字列、(c) スタイル定義(`styled`・`sx`・`style`)と JSX 属性への数値リテラル(許可リスト方式。2026-09-20 に名前の列挙方式から改訂、research.md #4)。`apps/client/src/app/theme/**`・`**/*.stories.tsx`・`**/*.test.{ts,tsx}` は対象外。あわせて既存の warn ルール `react-refresh/only-export-components` を error に引き上げる。`corepack yarn lint` が既存の9箇所(`maxWidth: 640/480/320`、`gap: 16`)をエラーとして検出することを確認する(research.md #4 / FR-003 / FR-023)

### Implementation for Foundational

- [X] T009 コントラスト比の算出関数(WCAG の相対輝度)を `apps/client/src/app/theme/contrast.ts` に実装し、T006 を成功させる(依存: T006)
- [X] T010 **テーマを差し替える前に**、現行テーマ(MUI 既定)で主要な6組(本文/背景、補足/背景、主ボタンの文字/主色、リンク/背景、エラー文字/背景、表の見出し/背景)のコントラスト比を算出し、基準値として `apps/client/src/app/theme/contrast.test.ts` に定数で記録するとともに `specs/003-design-system-tokens/research.md` の #10 に表で記録する。新テーマの同じ6組が「基準値以上」かつ「WCAG AA 以上」であることを検証するテストを追加する(新テーマ未実装のため失敗する)(FR-018 / SC-013、依存: T009)
- [X] T011 公式トークンの写像と自前定義を `apps/client/src/app/theme/tokens.ts` に実装する。公式値は `@digital-go-jp/design-tokens` の default export から参照し、書き換えない(INV-4 / contracts/theme-tokens.md 規則3)。自前定義は余白スケール(基準8px・6段階、research.md #2)と、画面・フォームのコンテンツ幅(現状の 640 / 480 / 320 に相当するレイアウト幅)に限る(依存: T001)
- [X] T012 見出し・本文・補足のテキストスタイル(画面見出し / 節見出し / 本文 / 補足 / UIラベル)を `apps/client/src/app/theme/textStyles.ts` に実装する。各スタイルが対応するデジタル庁デザインシステムの区分(Standard / Oneline)と `Std-16N-175` 形式の名称をコメントで記録する(data-model.md #3、依存: T011)
- [X] T013 `createAppTheme`(トークンを受け取ってMUIテーマを組み立てる関数)と既定テーマを `apps/client/src/app/theme/theme.ts` と `apps/client/src/app/theme/index.ts` に実装し、T007・T010 を成功させる。typography の割り当ては h1=画面見出し、h2=節見出し、body1=本文、body2=補足、button=UIラベル。**アクセシビリティ優先(憲法 原則X / FR-018)**: いずれかの組み合わせが基準値または AA を下回る場合は、基準を満たす別の公式トークンを選ぶ。それでも満たせない場合は従来(MUI 既定)の値を維持し、組み合わせ・理由を research.md #10 に記録する(依存: T010, T011, T012, T007)
- [X] T014 旧 `apps/client/src/app/theme.ts` を削除し、`apps/client/src/app/App.tsx` の import を `./theme` ディレクトリのバレルへ切り替え、`apps/client/src/main.tsx` で `fonts.css` を読み込む(依存: T003, T013)
- [X] T015 [P] `apps/client/.storybook/preview.tsx` に ThemeProvider + CssBaseline + `fonts.css` の読み込みを行うデコレーターを追加し、全ストーリーとアクセシビリティ検査が実テーマで描画されるようにする。現状はテーマ未適用(MUI既定)で描画されており、新しい配色のコントラスト検査が効かないため必須(依存: T013)
- [X] T016 [P] コンテンツ幅の数値リテラル(`maxWidth: 640 / 480 / 320`)をレイアウト幅トークンの参照に置き換える: `apps/client/src/features/weight/WeightPage.tsx`・`apps/client/src/features/training/TrainingPage.tsx`・`apps/client/src/features/steps/StepsPage.tsx`・`apps/client/src/features/foods/FoodsPage.tsx`・`apps/client/src/features/weight/WeightForm/WeightForm.tsx`・`apps/client/src/features/steps/StepsForm/StepsForm.tsx`・`apps/client/src/features/training/TrainingSessionForm/TrainingSessionForm.tsx`(依存: T008, T011)
- [X] T017 [P] 余白の数値リテラル(`gap: 16`)をテーマの spacing 参照に置き換える: `apps/client/src/features/training/TrainingSessionList/TrainingSessionList.tsx`・`apps/client/src/features/weight/WeightTrend/WeightTrend.tsx`(依存: T008, T013)
- [X] T018 `corepack yarn lint` がエラー0件になるまでリファクタを続ける(T016・T017 以外に検出された違反も同様にトークン参照へ置き換える)。続けてクライアントの全テストを実行し、実テーマの適用で顕在化したアクセシビリティ違反を T013 と同じアクセシビリティ優先の手順で解消する。Lint エラー0件・a11y 違反0件・T007/T010 成功をもってこのフェーズを完了とする(FR-003 / FR-009 / FR-018 / FR-023、依存: T014〜T017)

**Checkpoint**: テーマ・トークン・コントラスト基準・Lint(error)の土台が完成し、生値は0件。ここからユーザーストーリーに着手できる

---

## Phase 3: User Story 5 - API依存を差し替えて画面単位でテストできる (Priority: P1、US1 より先に実施)

**Goal**: 4画面が直接参照している API クライアントの実体を、composition root での生成と Provider による注入に改め、データ取得フックと表示コンポーネントに役割を分ける。4画面に画面単位のテストを新設し、サーバーは起動処理を `createApp` に分離して HTTP 経由の統合テストを追加する

**Independent Test**: フェイクの API を注入した状態で4画面を描画し、読み込み中・0件・記録あり・追加/削除後の再取得を実サーバーなしで確認する。サーバーは一時DBを注入して HTTP 経由の作成・取得を確認する(spec.md US5)

### Tests for User Story 5 ⚠️

- [X] T019 [P] [US5] フェイクの ApiClient のテストを `apps/client/src/test-support/createFakeApiClient.test.ts` に作成する。上書きしたメソッドは指定の値を返し、上書きしていないメソッドは呼ばれた時点でメソッド名を含むエラーで失敗すること。実装前に失敗することを確認する(contracts/api-injection.md「フェイク」)
- [X] T020 [P] [US5] 注入の仕組みのテストを `apps/client/src/app/api/apiClient.test.ts` に作成する。(a) Provider の外で ApiClient を要求した場合に明示的なエラーになる(注入忘れの検出)、(b) `createApiClient(endpoint)` が生成SDKのメソッドを備えた ApiClient を返す。実装前に失敗することを確認する(contracts/api-injection.md 規則3)
- [X] T021 [P] [US5] `eslint.config.js` に `no-restricted-imports`(error)を追加し、`apps/client/src/features/**` と `apps/client/src/components/**` から `graphql-request` および API クライアントの生成・実体(`app/api` の `createApiClient`、`app/queryClient` の実体)の import を禁止する。現状の4画面がエラーとして検出されることを確認する(SC-014 / contracts/api-injection.md 規則1)
- [X] T022 [P] [US5] 体重画面の画面テストを `apps/client/src/features/weight/WeightPage/WeightPage.stories.tsx` に作成する。フェイクの ApiClient を注入し、(a) 読み込み中の表示、(b) 0件で空状態、(c) 記録ありで一覧表示、(d) 記録の追加後に一覧が再取得される、(e) 削除後に再取得される、(f) 週次・月次への切替で集計が取得される、(g) API 失敗時は現状どおり空状態になる(現状の振る舞いの固定、spec Edge Cases)を検証する。実装前に失敗することを確認する(SC-015)
- [X] T023 [P] [US5] トレーニング画面の画面テストを `apps/client/src/features/training/TrainingPage/TrainingPage.stories.tsx` に作成する。読み込み中 / 0件 / 記録あり(種目マスタの取得を含む)/ 追加後の再取得 / 削除後の再取得 / API 失敗時の現状の振る舞いを検証する。実装前に失敗することを確認する(SC-015)
- [X] T024 [P] [US5] 歩数画面の画面テストを `apps/client/src/features/steps/StepsPage/StepsPage.stories.tsx` に作成する。読み込み中 / 0件 / 記録あり / 追加後の再取得 / 期間切替で集計が取得される / API 失敗時の現状の振る舞いを検証する。実装前に失敗することを確認する(SC-015)
- [X] T025 [P] [US5] 食材画面の画面テストを `apps/client/src/features/foods/FoodsPage/FoodsPage.stories.tsx` に作成する。読み込み中 / 0件 / 一覧表示 / API 失敗時の現状の振る舞いを検証する。実装前に失敗することを確認する(SC-015)
- [X] T026 [P] [US5] サーバーの統合テストを `apps/server/src/app.test.ts` に作成する。`createApp` に一時DB(`createConnection(":memory:")`)と固定の日付を注入し、GraphQL Yoga の `fetch` で体重記録の作成(mutation)→ 取得(query)を行って作成した記録が返ること、期間集計が注入した日付を基準に計算されることを検証する。実装前に失敗することを確認する(SC-016 / research.md #9)

### Implementation for User Story 5

- [X] T027 [US5] `apps/client/src/app/api/apiClient.ts`(`ApiClient` 型 = 生成SDKの `getSdk` の戻り値の型、`createApiClient(endpoint)`、Provider 外を検出する関数)と `apps/client/src/app/api/ApiProvider.tsx`(Provider と `useApi()`)と `apps/client/src/app/api/index.ts` を実装し、T020 を成功させる。ApiClient の型を手書きしない(原則IV)
- [X] T028 [P] [US5] `apps/client/src/test-support/createFakeApiClient.ts` と、ストーリーごとに新しい QueryClient(再試行なし)とフェイクの ApiClient を注入するデコレーター `apps/client/src/test-support/withApiProviders.tsx` を実装し、T019 を成功させる(依存: T027)
- [X] T029 [P] [US5] 体重のデータフック(記録一覧・期間集計の取得、追加・削除とキャッシュ無効化、クエリキー)を `apps/client/src/features/weight/hooks/` に実装する。既存の取得条件(日次のときだけ記録一覧、週次・月次のときだけ集計を有効化)と無効化の範囲を変えない(FR-013、依存: T027)
- [X] T030 [P] [US5] トレーニングのデータフック(セッション一覧・種目マスタの取得、追加・削除とキャッシュ無効化、クエリキー)を `apps/client/src/features/training/hooks/` に実装する(FR-013、依存: T027)
- [X] T031 [P] [US5] 歩数のデータフック(期間別の日次消費カロリーの取得、追加とキャッシュ無効化、クエリキー)を `apps/client/src/features/steps/hooks/` に実装する(FR-013、依存: T027)
- [X] T032 [P] [US5] 食材のデータフック(食材一覧の取得、クエリキー)を `apps/client/src/features/foods/hooks/` に実装する(依存: T027)
- [X] T033 [P] [US5] `apps/client/src/features/weight/WeightPage.tsx` を `apps/client/src/features/weight/WeightPage/WeightPage.tsx` と `index.ts` に移し(`git mv`)、データフックと表示部品を組み合わせるだけの構成にして T022 を成功させる(依存: T028, T029)
- [X] T034 [P] [US5] `apps/client/src/features/training/TrainingPage.tsx` を `apps/client/src/features/training/TrainingPage/` に移し、同様に再構成して T023 を成功させる(依存: T028, T030)
- [X] T035 [P] [US5] `apps/client/src/features/steps/StepsPage.tsx` を `apps/client/src/features/steps/StepsPage/` に移し、同様に再構成して T024 を成功させる(依存: T028, T031)
- [X] T036 [P] [US5] `apps/client/src/features/foods/FoodsPage.tsx` を `apps/client/src/features/foods/FoodsPage/` に移し、同様に再構成して T025 を成功させる(依存: T028, T032)
- [X] T037 [US5] `apps/client/src/app/queryClient.ts` からモジュールレベルの `graphqlClient` を削除して QueryClient の生成関数のみにし、`apps/client/src/app/App.tsx` を composition root として、ApiClient と QueryClient を `useState` の遅延初期化で1度だけ生成して Provider で注入する構成にする。ルートの import を各画面フォルダへ切り替える(contracts/api-injection.md 規則2、依存: T033〜T036)
- [X] T038 [P] [US5] サーバーの起動処理を `apps/server/src/app.ts` の `createApp({ db, today })` に切り出し、`apps/server/src/index.ts` を実DBの接続・シード・`createApp` の呼び出し・待ち受けのみにする。当日の日付は関数として注入する。スキーマ・リゾルバ・リポジトリには手を入れない。T026 と既存のサーバーテストがすべて成功することを確認する(FR-022 / FR-013、依存: T026)
- [X] T039 [US5] `corepack yarn lint` でエラー0件(T021 を含む)、クライアント・サーバーの全テスト成功を確認する。実サーバー+クライアントを起動して4画面の取得・追加・削除・期間切替がリファクタ前と同じように動くことをブラウザ自動操作で確認する(振る舞いの非破壊、FR-013、依存: T037, T038)
  - 自動検証は完了(2026-09-20): Lint エラー0件、クライアント・サーバーのテスト成功、両ワークスペースの typecheck とクライアントの build。実サーバー(別ポート・一時DB)を起動して HTTP 経由で記録の作成→取得と食材一覧の取得を確認した。
  - ブラウザ自動操作の代わりに、Interaction Test で検証する方針に変更(2026-09-22、research.md #5)。`app/AppRoutes.stories.tsx`(4画面への遷移とデータ表示)と `app/theme/ThemeAppearance.stories.tsx`(書体・配色・余白・角丸・影が実際の描画でトークンどおりか)を追加し、T073 として記録した。

**Checkpoint**: 4画面に画面単位のテストが揃い、見た目の変更に対する安全網ができた。API 依存は注入され、直接参照は Lint で禁止されている

---

## Phase 4: User Story 1 - 画面内の情報の階層がひと目で分かる (Priority: P1) 🎯 MVP

**Goal**: 見出し・本文・補足の役割をタイポグラフィで区別し、情報のまとまりを面(カード・境界線・elevation)と余白のリズムで示す。素朴なテキストリンクのナビゲーションをヘッダー+ナビゲーションに作り直す

**Independent Test**: 4画面を順に開き、見出し・本文・補足が区別でき、情報のまとまりの境界が識別できることを確認する(spec.md US1)。アプリシェルの現在地表示とキーボード操作は自動テストで確認する

### Tests for User Story 1 ⚠️

- [ ] T040 [P] [US1] アプリシェルの Storybook Interaction Test を `apps/client/src/app/AppShell/AppShell.stories.tsx` に作成する。(a) ヘッダー・名前付きナビゲーション・主要コンテンツの各ランドマークが存在する、(b) 4画面(体重 / トレーニング / 歩数 / 食材)へのリンクがある、(c) 表示中の画面の項目にのみ `aria-current="page"` が付く、(d) Tab キーのみで4項目すべてに到達できる(contracts/app-shell.md / SC-011)。実装前に失敗することを確認する
- [ ] T041 [P] [US1] 結果表示系コンポーネントの既存ストーリーに、まとまりの見出しが見出し要素(role=heading)として取得できることのアサーションを追加する。対象: `apps/client/src/features/steps/DailyCalorieSummary/DailyCalorieSummary.stories.tsx`(日付)、`apps/client/src/features/training/TrainingSessionList/TrainingSessionList.stories.tsx`(各セッションの日付)、`apps/client/src/features/weight/WeightTrendAggregate/WeightTrendAggregate.stories.tsx`(集計の見出し)。実装前に失敗することを確認する

### Implementation for User Story 1

- [ ] T042 [US1] ヘッダー+ナビゲーションの `AppShell` を `apps/client/src/app/AppShell/AppShell.tsx` と `apps/client/src/app/AppShell/index.ts` に実装する。現在地は `aria-current="page"` と、色以外の視覚的手がかり(下線または太字)の両方で示す。画面幅375pxで項目が横スクロールを発生させずに収まるようにする(FR-016 / FR-011、依存: T040)
- [ ] T043 [US1] `apps/client/src/app/App.tsx` の素朴なテキストリンクの `<nav>` を `AppShell` に置き換え、各ルートを主要コンテンツ領域の中に配置する(依存: T042)
- [ ] T044 [P] [US1] `apps/client/src/components/EmptyState/EmptyState.tsx` を、メッセージ=本文・説明=補足のテキストスタイルと面の構成で描画するよう再構成する(US1 受け入れシナリオ3)
- [ ] T045 [P] [US1] `apps/client/src/components/QueryState/QueryState.tsx` の読み込み中表示を、本文のテキストスタイルとトークンの余白で描画し、平坦な1行表示にならないようにする(US1 受け入れシナリオ3)
- [ ] T046 [P] [US1] `apps/client/src/features/training/SessionCalorieCard/SessionCalorieCard.tsx` で、算出値を本文、算出根拠(計算式・定数・出典)を補足のテキストスタイルで区別する(原則VII の算出根拠表示は維持)
- [ ] T047 [P] [US1] `apps/client/src/features/steps/DailyCalorieSummary/DailyCalorieSummary.tsx` で、日付を節見出し、トレーニング分・歩数分・合計を本文、算出根拠を補足で描画し、概算の合計を視覚的に強調する(依存: T041)
- [ ] T048 [P] [US1] `apps/client/src/features/training/TrainingSessionList/TrainingSessionList.tsx` で、各セッションを1つの面にまとめ、日付を節見出しとして描画する。入れ子の面は2段までとする(data-model.md #5、依存: T041)
- [ ] T049 [P] [US1] `apps/client/src/features/weight/WeightTrend/WeightTrend.tsx` と `apps/client/src/features/weight/WeightTrendAggregate/WeightTrendAggregate.tsx` で、要約テキスト・表・グラフを面にまとめ、見出しを付ける。表形式・テキスト要約の非視覚的代替は維持する(FR-010、依存: T041)
- [ ] T050 [P] [US1] `apps/client/src/features/foods/FoodList/FoodList.tsx` の表を面に収め、列見出しに UIラベルのテキストスタイルを適用する。行見出し・列見出しの対応(スクリーンリーダー向け)は維持する
- [ ] T051 [US1] 4画面 `apps/client/src/features/weight/WeightPage/WeightPage.tsx`・`apps/client/src/features/training/TrainingPage/TrainingPage.tsx`・`apps/client/src/features/steps/StepsPage/StepsPage.tsx`・`apps/client/src/features/foods/FoodsPage/FoodsPage.tsx` の画面見出しを画面見出しのテキストスタイル(h1)に揃え、結果表示領域に節見出し(h2)を付けて面で区切る(依存: T044〜T050)
- [ ] T052 [US1] T040・T041 と US5 の画面テスト(T022〜T025)の成功、Lint エラー0件、a11y 違反0件、コントラストが基準値以上(T010)であることを確認し、quickstart.md の手動シナリオ1(階層)・2(まとまり)・5(空状態・読み込み中)を実施する

**Checkpoint**: User Story 1 が完結(MVP)。「のっぺり」の主要因(平坦なタイポグラフィ・面の欠如・素朴なナビゲーション)が解消されている

---

## Phase 5: User Story 2 - 入力領域と結果表示領域が視覚的に分離される (Priority: P2)

**Goal**: 記録画面で、入力フォームの領域と結果表示の領域を別の面として区別できるようにする

**Independent Test**: 体重・トレーニング・歩数の記録画面を開き、入力フォームと結果表示が別の面として区別できることを確認する(spec.md US2)

### Tests for User Story 2 ⚠️

- [ ] T053 [P] [US2] フォーム系の既存ストーリー `apps/client/src/features/weight/WeightForm/WeightForm.stories.tsx`・`apps/client/src/features/steps/StepsForm/StepsForm.stories.tsx`・`apps/client/src/features/training/TrainingSessionForm/TrainingSessionForm.stories.tsx` に、フォームが名前付きの form ランドマーク(role=form、アクセシブルな名前あり)として取得できることのアサーションを追加する。実装前に失敗することを確認する

### Implementation for User Story 2

- [ ] T054 [P] [US2] `apps/client/src/features/weight/WeightForm/WeightForm.tsx` を入力用の面に収め、フォームに節見出しとアクセシブルな名前を付ける(依存: T053)
- [ ] T055 [P] [US2] `apps/client/src/features/steps/StepsForm/StepsForm.tsx` を入力用の面に収め、フォームに節見出しとアクセシブルな名前を付ける(依存: T053)
- [ ] T056 [P] [US2] `apps/client/src/features/training/TrainingSessionForm/TrainingSessionForm.tsx` を入力用の面に収め、フォームに節見出しとアクセシブルな名前を付ける。種目の入力行は内側の面として扱い、入れ子は2段までとする(data-model.md #5、依存: T053)
- [ ] T057 [US2] 記録3画面(`apps/client/src/features/weight/WeightPage/WeightPage.tsx`・`apps/client/src/features/training/TrainingPage/TrainingPage.tsx`・`apps/client/src/features/steps/StepsPage/StepsPage.tsx`)で入力面と結果面の間の余白をトークンの段階で統一し、検証エラーの表示が該当フィールドと同じ面の中に収まることを確認する(US2 受け入れシナリオ2、依存: T054〜T056)
- [ ] T058 [US2] T053 と画面テストの成功、Lint エラー0件、a11y 違反0件を確認し、quickstart.md の手動シナリオ3(入力と結果の分離)を実施する

**Checkpoint**: User Story 1・2・5 がそれぞれ独立して動作確認可能

---

## Phase 6: User Story 3 - デザインの変更が定義1箇所で完結する (Priority: P3)

**Goal**: トークン定義1箇所の変更が全画面に波及する状態を確認し、固定する

**Independent Test**: トークン定義の値を1箇所変更し、全画面の表示が連動して変わることを確認する(spec.md US3)

> 生値の除去と Lint の error 化は Phase 2(T008・T016〜T018)で完了済み。SC-004 の自動テストも T007(d) で作成済み。ここでは US1・US2 で追加したスタイルを含めた最終確認を行う

- [ ] T059 [US3] US1・US2 で追加・変更したスタイルの余白がすべて定義済みの6段階から選ばれていることを点検し、外れているものをトークン参照に直す(INV-3 / FR-007)。`corepack yarn lint` エラー0件を確認する(SC-005)
- [ ] T060 [US3] 余白の基準値を一時的に変更して Storybook 上で全ストーリーに波及することを目視で確かめ、元に戻す(SC-004、依存: T059)

**Checkpoint**: 変更が定義1箇所で完結することを確認済み

---

## Phase 7: User Story 4 - 全画面・全コンポーネントで見た目が一貫している (Priority: P4)

**Goal**: 共通コンポーネント・グラフ・PWA の外観まで同じトークン規則に揃える

**Independent Test**: 4画面とアプリシェルを巡回し、同じ役割の要素が画面をまたいで同じ見え方をしていることを確認する(spec.md US4)

### Implementation for User Story 4

- [ ] T061 [P] [US4] `apps/client/src/components/PeriodSelector/PeriodSelector.tsx` のトグルに UIラベルのテキストスタイルとテーマの配色を適用する。既存ストーリーのキーボード操作・再クリック時の挙動・アクセシビリティ検査は維持する
- [ ] T062 [P] [US4] `apps/client/src/features/weight/WeightTrend/WeightTrend.tsx` のグラフの系列色をテーマの palette から取得するようにする。表形式・テキスト要約の非視覚的代替は維持する(FR-010 / 原則VII / contracts/theme-tokens.md 規則5)
- [ ] T063 [P] [US4] `apps/client/vite.config.ts` の PWA マニフェストの `theme_color`・`background_color` を、生値(`#1976d2` 等)ではなく公式トークンから参照する
- [ ] T064 [US4] quickstart.md の手動シナリオ4(4画面巡回での一貫性)を実施し、ばらつきがあれば該当コンポーネントをトークン参照で修正する

**Checkpoint**: すべてのユーザーストーリーが独立して機能する

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 帰属表示・横断的な検証・最終確認

- [ ] T065 [P] デジタル庁デザインシステムのドキュメント本体およびデザインデータの利用条件を一次情報で確認し、結果を `specs/003-design-system-tokens/research.md` の #7(未確認事項)に追記する
- [ ] T066 `README.md` に、参照元としてのデジタル庁デザインシステム、`@digital-go-jp/design-tokens`(MIT)、Noto Sans JP(SIL OFL 1.1)の帰属表示を追記する。T065 の結果に応じて表記を調整する(FR-017、依存: T065)
- [ ] T067 [P] 実サーバー+クライアントを起動し、ブラウザ自動操作で4画面を幅375pxで開いて `scrollWidth` が `clientWidth` を超えないことを確認する(quickstart.md 手動シナリオ7 / SC-008)
- [ ] T068 [P] キャッシュを無効化して再読込し、書体の適用前も本文が判読でき、適用後に主要な要素の位置が大きく飛ばないことを確認する(quickstart.md 手動シナリオ6 / SC-012)
- [ ] T069 アクセシビリティ優先で従来値を維持した組み合わせ(research.md #10 に記録したもの)を一覧化し、適用後の主要6組のコントラスト比が基準値以上であることを最終確認する(SC-013 / FR-018)
- [ ] T070 CI 相当の検証を通す: `corepack yarn lint`(警告・エラー0件)・`corepack yarn format:check`・両ワークスペースの typecheck と test・クライアントの build。あわせて `git diff --stat main -- apps/server` の変更が `app.ts`・`app.test.ts`・`index.ts` の3ファイルに限られることを確認する(SC-009 / SC-017 / FR-013)
- [ ] T071 quickstart.md の手動シナリオ8として、適用前後を比較し「のっぺりしている」状態が解消されたかを開発者本人が判断する(SC-010)
- [ ] T072 描画を伴う全コンポーネント(`apps/client/src/**/*.tsx` のうち `main.tsx`・`App.tsx` を除く)に `*.stories.tsx` が存在することを確認し、無いものはストーリーを追加する。Lint では検出できない生値(`styled`・`sx`・`style` の外で組み立てたスタイル用オブジェクト)を、実テーマで描画したアクセシビリティ検査で担保するための最終確認(research.md #4、依存: T022〜T025, T040)
- [X] T073 ブラウザでの目視確認を Interaction Test に置き換える: ルーティングを `apps/client/src/app/AppRoutes.tsx` に切り出し、`AppRoutes.stories.tsx` で4画面への遷移とデータ表示を検証する。`apps/client/src/app/theme/ThemeAppearance.stories.tsx` で、書体・文字サイズ・行高・文字色・主ボタンの配色・余白・角丸・影・面の色が実際の描画でトークンどおりであること、および描画された色から算出したコントラスト比が AA 以上であることを検証する(research.md #5 / SC-013)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。すぐに開始できる
- **Foundational (Phase 2)**: Setup の完了が前提。すべてのユーザーストーリーをブロックする
- **User Story 5 (Phase 3)**: Foundational の完了が前提。US1 より先に実施する(画面テストを安全網として用意するため)
- **User Story 1〜4 (Phase 4〜7)**: US5 の完了が前提(画面ファイルがフォルダ化され、画面テストが揃っているため)
- **Polish (Phase 8)**: 対象とするユーザーストーリーの完了が前提

### User Story Dependencies

- **User Story 5 (P1)**: Foundational 完了後に開始可能。サーバー側(T026・T038)はクライアント側と独立して並行できる
- **User Story 1 (P1)**: US5 完了後に開始。画面ファイルのパスが US5 でフォルダ化後のものに変わるため
- **User Story 2 (P2)**: US1 の後が安全(記録3画面のページファイルを US1 の T051 と共有するため)
- **User Story 3 (P3)**: US1・US2 で追加したスタイルを点検するため、その後に行う
- **User Story 4 (P4)**: T062 は `WeightTrend.tsx` を US1 の T049 と共有するため US1 の後に行う

### Within Each User Story

- テストを先に書き、実装前に失敗することを確認する(原則III)
- 注入の仕組み → フェイク・データフック → 画面、の順に進める(US5)
- 共通・部品側のコンポーネント → それを配置するページ、の順に進める(US1〜US4)
- ストーリー完了時に Lint エラー0件・a11y 違反0件・画面テスト成功を確認してから次へ進む

### Parallel Opportunities

- Setup: T002 と T004 は並行可能(T003 は T002、T005 は T004 の後)
- Foundational: テストの T006〜T008 は並行可能。T016・T017 は並行可能
- US5: テストの T019〜T026 はすべて並行可能。フックの T029〜T032、画面の T033〜T036 はそれぞれ並行可能。サーバーの T038 はクライアント側と並行可能
- US1: T040・T041 は並行可能。T044〜T050 はすべて別ファイルのため並行可能
- US2: T054〜T056 は並行可能
- US4: T061〜T063 は並行可能
- Polish: T065・T067・T068 は並行可能

---

## Parallel Example: User Story 5

```text
# テストをまとめて作成(実装前に失敗を確認):
Task: "フェイクの ApiClient のテストを apps/client/src/test-support/createFakeApiClient.test.ts に作成"
Task: "注入の仕組みのテストを apps/client/src/app/api/apiClient.test.ts に作成"
Task: "no-restricted-imports を eslint.config.js に追加"
Task: "4画面の画面テスト(WeightPage / TrainingPage / StepsPage / FoodsPage の stories)を作成"
Task: "サーバーの統合テストを apps/server/src/app.test.ts に作成"

# 注入の仕組み(T027)ができたら、フックを並行で実装:
Task: "体重のデータフックを apps/client/src/features/weight/hooks/ に実装"
Task: "トレーニングのデータフックを apps/client/src/features/training/hooks/ に実装"
Task: "歩数のデータフックを apps/client/src/features/steps/hooks/ に実装"
Task: "食材のデータフックを apps/client/src/features/foods/hooks/ に実装"
```

---

## Implementation Strategy

### MVP First

1. Phase 1(Setup)を完了 — 単体テストが実行できる状態にする
2. Phase 2(Foundational)を完了 — テーマ・コントラスト基準・Lint(error)、生値0件
3. Phase 3(User Story 5)を完了 — API 依存の注入と画面テスト(安全網)
4. Phase 4(User Story 1)を完了
5. **STOP and VALIDATE**: 画面テストが通ったまま、4画面で階層と面が認識でき、ナビゲーションが作り直されていることを確認(quickstart 手動シナリオ1・2・5)

### Incremental Delivery

1. Setup + Foundational → 土台完成(見た目の変化は書体と配色のみ、生値0件)
2. User Story 5 → 依存の注入と画面テスト(利用者から見た振る舞いは変わらない)
3. User Story 1 → 階層と面、ナビゲーション(MVP)
4. User Story 2 → 入力と結果の分離
5. User Story 3 → 変更が1箇所で完結することの確認
6. User Story 4 → 共通コンポーネント・グラフ・PWA の外観まで一貫
7. Polish → 帰属表示と横断的な最終確認

---

## Notes

- [P] タスク = 別ファイル・依存なし
- [Story] ラベルはトレーサビリティのためにタスクをユーザーストーリーへ対応づける
- 実装ブランチは原則IX に従い、フェーズ(またはストーリー)ごとに main から切る(例: `003-design-system-tokens-phase1`)。機能ブランチ同士をマージしない
- Lint は error のみで運用する(憲法 技術スタック「静的解析」)。エラーを残したまま次のタスクへ進まない
- アクセシビリティとデザイントークンが衝突した場合はアクセシビリティを優先する(憲法 原則X)。従来値を維持した場合は必ず research.md #10 に記録する
- コード規約(既存の合意事項): 関数・コンポーネントはアロー関数で定義する / 条件分岐は三項演算子ではなく if/else を使う / 型定義は interface ではなく type を使う / スタイルは `styled` で統一する / Storybook を持つコンポーネントは専用フォルダ(`Name/Name.tsx` + `Name.stories.tsx` + `index.ts`)に置く
- コミットメッセージ・PR は日本語、conventional-commit 形式(`feat:` / `refactor:` / `test:` / `docs:` など)
- 各タスクまたは論理的なまとまりごとにコミットし、チェックポイントで各ストーリーを独立に検証する
- 避けること: 曖昧なタスク、同一ファイルの競合、ストーリーの独立性を壊すストーリー間依存
