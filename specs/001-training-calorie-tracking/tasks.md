---

description: "Task list template for feature implementation"
---

# Tasks: 体重・トレーニング記録と消費カロリーの可視化

**Input**: Design documents from `/specs/001-training-calorie-tracking/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/schema.graphql](./contracts/schema.graphql), [quickstart.md](./quickstart.md)

**Tests**: 憲法原則III(テスト先行)により、テストは必須。各ストーリー内で実装タスクより先にテストタスクを配置している。

**Organization**: タスクはユーザーストーリー(spec.mdのP1〜P5)ごとにグループ化し、各ストーリーを独立して実装・テストできるようにしている。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行実行可能(別ファイル・依存なし)
- **[Story]**: 対応するユーザーストーリー(US1〜US5)
- 各タスクに具体的なファイルパスを含める

## Path Conventions

plan.md の Project Structure に基づく npm workspaces 構成:

- サーバー: `apps/server/src/`, `apps/server/schema.graphql`(生成物)
- クライアント: `apps/client/src/`

---

## Phase 1: Setup(共有インフラの初期化)

**Purpose**: npm workspacesリポジトリの初期化とツールチェーン導入

- [X] T001 npm workspacesルート`package.json`と`apps/client`・`apps/server`ディレクトリを作成する(research.md #1)
- [X] T002 `apps/server`をTypeScriptプロジェクトとして初期化し、`graphql-yoga`, `@pothos/core`, `@pothos/plugin-zod`, `graphql`, `zod`, `better-sqlite3`, `vitest`を依存に追加する(依存: T001)
- [X] T003 [P] `apps/client`をVite + React + TypeScriptプロジェクトとして初期化し、`@mui/material`, `@mui/x-charts`, `@emotion/react`, `@emotion/styled`, `react-hook-form`, `@hookform/resolvers`, `zod`, `@tanstack/react-query`, `graphql-request`, GraphQL Code Generatorパッケージ, `vite-plugin-pwa`を依存に追加する(依存: T001)
- [X] T004 ESLint/Prettierをリポジトリルートに設定し、`apps/client`・`apps/server`双方に適用する(依存: T002, T003)
- [X] T005 [P] `apps/client`にStorybookをInteraction Test addon・a11y addon付きで導入する(依存: T003)

---

## Phase 2: Foundational(すべてのユーザーストーリーをブロックする前提作業)

**Purpose**: どのユーザーストーリーにも先立って完了させる必要がある基盤

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装に着手しない

- [X] T006 SQLite接続とスキーマブートストラップ(`CREATE TABLE IF NOT EXISTS`、全6テーブル)を`apps/server/src/db/connection.ts`, `apps/server/src/db/schema.sql`に実装する(research.md #2、依存: T002)
- [X] T007 種目マスタ(ExerciseCatalog)の固定データを`apps/server/src/db/seed/exerciseCatalog.ts`に実装する(data-model.md、依存: T006)
- [X] T008 Pothosスキーマビルダー(`@pothos/plugin-zod`設定込み)を`apps/server/src/schema/builder.ts`に実装する(依存: T002)
- [X] T009 GraphQL Yogaサーバーのエントリポイントと`dev`スクリプトを`apps/server/src/index.ts`に実装する(依存: T008)
- [X] T010 [P] スキーマSDL書き出しスクリプト(`printSchema`)を`apps/server/scripts/generate-schema.ts`と`generate:schema`npmスクリプトとして実装する(research.md #3、依存: T008)
- [X] T011 [P] `apps/server/schema.graphql`を入力元とするGraphQL Code Generator設定を`apps/client/codegen.ts`に実装する(research.md #3、依存: T010)
- [X] T012 [P] TanStack Queryプロバイダーと`graphql-request`クライアントを`apps/client/src/app/queryClient.ts`に実装する(依存: T003)
- [X] T013 [P] MUIテーマ(styled統一)とEmotionキャッシュ設定を`apps/client/src/app/theme.ts`に実装する(依存: T003)
- [X] T014 [P] アプリシェル・ルーティング・ナビゲーション(体重/トレーニング/歩数/食材への導線)を`apps/client/src/app/App.tsx`に実装する(依存: T003)
- [X] T015 [P] `vite-plugin-pwa`によるmanifest・最小限のservice worker登録を`apps/client/vite.config.ts`に設定する(research.md #7、依存: T003)(Phase1のセットアップ時に対応済み)

**Checkpoint**: 基盤完成。ここからユーザーストーリーの実装に着手できる

---

## Phase 3: User Story 1 - 体重を記録して推移を見る (Priority: P1) 🎯 MVP

**Goal**: 日付と体重(kg)の記録・修正・削除、一覧・グラフでの推移確認、キーボード操作、エラーのフィールド関連付け、グラフの表形式/テキスト要約による非視覚的代替を実現する

**Independent Test**: 体重記録機能のみが実装された状態で、複数日分の体重を入力・編集・削除し、一覧とグラフに反映されることを確認する(spec.md参照)

### Tests for User Story 1 ⚠️

> テストを先に書き、実装前に失敗することを確認する(憲法原則III)

- [X] T016 [P] [US1] 体重バリデーション(20.0〜300.0kg、小数点第1位)の単体テストを`apps/server/src/domain/weight/weightValidation.test.ts`に作成する
- [X] T017 [P] [US1] WeightRepositoryの統合テスト(作成・更新・削除・一覧取得、同日上書き)を`apps/server/src/repositories/weightRepository.test.ts`に作成する
- [X] T018 [P] [US1] GraphQLリゾルバ統合テスト(`weightRecords`/`upsertWeightRecord`/`deleteWeightRecord`)を`apps/server/src/schema/weight.test.ts`に作成する
- [X] T019 [P] [US1] 体重入力フォームのStorybook Interaction Test(正常系・異常系のエラー関連付け・キーボード操作)を`apps/client/src/features/weight/WeightForm/WeightForm.stories.tsx`に作成する
- [X] T020 [P] [US1] 体重一覧・グラフのStorybook Interaction Test + a11yチェック(表形式/テキスト要約の代替表示)を`apps/client/src/features/weight/WeightTrend/WeightTrend.stories.tsx`に作成する

### Implementation for User Story 1

- [X] T021 [US1] WeightRecordのZodスキーマ(範囲・必須)を`apps/server/src/domain/weight/weightSchema.ts`に実装する(依存: T016)
- [X] T022 [US1] WeightRepositoryインターフェースとSQLite実装を`apps/server/src/repositories/weightRepository.ts`に実装する(依存: T006, T017)
- [X] T023 [US1] Pothos型・`Query.weightRecords`・`Mutation.upsertWeightRecord`/`deleteWeightRecord`を`apps/server/src/schema/weight.ts`に実装する(依存: T021, T022, T018)
- [X] T024 [US1] 体重入力フォーム(react-hook-form + zodResolver + MUI、キーボード操作対応)を`apps/client/src/features/weight/WeightForm/WeightForm.tsx`に実装する(依存: T019, T011)
- [X] T025 [US1] 体重一覧 + MUI X Chartsグラフ + 表形式/テキスト要約切替を`apps/client/src/features/weight/WeightTrend/WeightTrend.tsx`に実装する(依存: T020)
- [X] T026 [US1] 体重記録0件時の空状態表示(メッセージ+作成導線)を`apps/client/src/features/weight/WeightEmptyState/WeightEmptyState.tsx`に実装する(依存: T025)
- [X] T027 [US1] 体重ページ(一覧+フォーム+削除操作の組み立て)を`apps/client/src/features/weight/WeightPage.tsx`に実装し、`apps/client/src/app/App.tsx`のルーティングに追加する(依存: T023, T024, T025, T026, T014)

**Checkpoint**: User Story 1が独立して完結・動作確認可能(MVP)

---

## Phase 4: User Story 2 - トレーニングを記録する (Priority: P2)

**Goal**: セッション(日付・実施時間・強度区分)と、それに紐づく種目・セット数・回数・重量の記録・一覧確認を実現する

**Independent Test**: セッションを作成し、種目・セット数・回数・重量を追加して、一覧・詳細に反映されることを確認する(spec.md参照)

### Tests for User Story 2 ⚠️

- [ ] T028 [P] [US2] トレーニングバリデーション(実施時間1〜600分、強度区分、セット数1〜20、回数1〜100、重量0〜500kg 0.5kg刻み)の単体テストを`apps/server/src/domain/training/trainingValidation.test.ts`に作成する
- [ ] T029 [P] [US2] TrainingSessionRepositoryの統合テスト(セッション+種目記録のupsert/delete、同日上書きFR-017)を`apps/server/src/repositories/trainingSessionRepository.test.ts`に作成する
- [ ] T030 [P] [US2] GraphQLリゾルバ統合テスト(`trainingSessions`/`trainingSession`/`upsertTrainingSession`/`deleteTrainingSession`)を`apps/server/src/schema/training.test.ts`に作成する
- [ ] T031 [P] [US2] セッションフォーム(種目の追加・削除、キーボード操作、エラー関連付け)のStorybook Interaction Testを`apps/client/src/features/training/TrainingSessionForm/TrainingSessionForm.stories.tsx`に作成する
- [ ] T032 [P] [US2] セッション一覧・詳細表示のStorybook Interaction Testを`apps/client/src/features/training/TrainingSessionList/TrainingSessionList.stories.tsx`に作成する

### Implementation for User Story 2

- [ ] T033 [P] [US2] 種目マスタ参照クエリ`Query.exerciseCatalog`を`apps/server/src/schema/exerciseCatalog.ts`に実装する(依存: T007)
- [ ] T034 [US2] TrainingSession/ExerciseSetのZodスキーマを`apps/server/src/domain/training/trainingSchema.ts`に実装する(依存: T028)
- [ ] T035 [US2] TrainingSessionRepository(同日上書きロジック含む)とExerciseSet永続化を`apps/server/src/repositories/trainingSessionRepository.ts`に実装する(依存: T006, T029)
- [ ] T036 [US2] Pothos型・`Query.trainingSessions`/`trainingSession`・`Mutation.upsertTrainingSession`/`deleteTrainingSession`を`apps/server/src/schema/training.ts`に実装する(依存: T034, T035, T030)
- [ ] T037 [US2] 種目選択+セット/回数/重量入力を含むセッションフォームを`apps/client/src/features/training/TrainingSessionForm/TrainingSessionForm.tsx`に実装する(依存: T031, T033)
- [ ] T038 [US2] セッション一覧・詳細(種目内訳表示)を`apps/client/src/features/training/TrainingSessionList/TrainingSessionList.tsx`に実装する(依存: T032, T036)
- [ ] T039 [US2] トレーニングページの組み立てを`apps/client/src/features/training/TrainingPage.tsx`に実装し、ルーティングに追加する(依存: T037, T038, T014)

**Checkpoint**: User Story 1・2がそれぞれ独立して動作確認可能

---

## Phase 5: User Story 3 - トレーニングによる消費カロリーを見る (Priority: P3)

**Goal**: セッションの実施時間・強度区分・直近の体重からMETs方式で消費カロリーを算出し、計算式・定数・出典とともに表示する。セット数・回数・重量からは総ボリュームを算出し別指標として表示する

**Independent Test**: US1・US2が成立している前提で、実施時間・強度区分・体重が揃ったセッションについて、消費カロリーと算出根拠が表示されることを確認する(spec.md参照)

### Tests for User Story 3 ⚠️

- [ ] T040 [P] [US3] セッション消費カロリー計算(METs方式、体重欠如時はnull)の単体テストを`apps/server/src/domain/calorie/sessionCalorie.test.ts`に作成する(research.md #5)
- [ ] T041 [P] [US3] 総ボリューム計算(重量×回数×セット)の単体テストを`apps/server/src/domain/training/volume.test.ts`に作成する
- [ ] T042 [P] [US3] `TrainingSession.calorieEstimate`/`totalVolume`のGraphQLリゾルバ統合テストを`apps/server/src/schema/trainingCalorie.test.ts`に作成する
- [ ] T043 [P] [US3] 消費カロリー・算出根拠(計算式/定数/出典)・総ボリューム表示のStorybook Interaction Testを`apps/client/src/features/training/SessionCalorieCard/SessionCalorieCard.stories.tsx`に作成する

### Implementation for User Story 3

- [ ] T044 [US3] セッション消費カロリー計算の純粋関数を`apps/server/src/domain/calorie/sessionCalorie.ts`に実装する(依存: T040)
- [ ] T045 [P] [US3] 総ボリューム計算の純粋関数を`apps/server/src/domain/training/volume.ts`に実装する(依存: T041)
- [ ] T046 [US3] `TrainingSession.calorieEstimate`/`totalVolume`フィールドリゾルバを`apps/server/src/schema/training.ts`に追加する(依存: T044, T045, T042, T036)
- [ ] T047 [US3] 消費カロリー・算出根拠・総ボリュームの表示コンポーネント(SessionCalorieCard)を`apps/client/src/features/training/SessionCalorieCard/SessionCalorieCard.tsx`に実装する(依存: T043)
- [ ] T048 [US3] 体重未記録時の「算出不可」表示をセッション詳細に統合する`apps/client/src/features/training/TrainingSessionDetail.tsx`(依存: T047, T038)

**Checkpoint**: User Story 1〜3が独立して動作確認可能(本アプリの中核価値である消費カロリー可視化が成立)

---

## Phase 6: User Story 4 - 歩数による消費カロリーを見る (Priority: P4)

**Goal**: 手入力の歩数からMETs方式で消費カロリーを算出し、算出根拠とともに表示する。トレーニング分と合算した1日分の消費カロリー(概算)も表示する

**Independent Test**: US3が成立している前提で、日付と歩数を入力し、算出された消費カロリーと、その日のトレーニング分との合算値が表示されることを確認する(spec.md参照)

### Tests for User Story 4 ⚠️

- [ ] T049 [P] [US4] 歩数バリデーション(0〜100,000歩)の単体テストを`apps/server/src/domain/steps/stepsValidation.test.ts`に作成する
- [ ] T050 [P] [US4] 歩数消費カロリー計算(METs・ケイデンス)の単体テストを`apps/server/src/domain/calorie/stepCalorie.test.ts`に作成する(research.md #5)
- [ ] T051 [P] [US4] 1日合算(DailyCalorieSummary、概算フラグ)の単体テストを`apps/server/src/domain/calorie/dailySummary.test.ts`に作成する
- [ ] T052 [P] [US4] StepRecordRepositoryの統合テスト(同日上書き)を`apps/server/src/repositories/stepRecordRepository.test.ts`に作成する
- [ ] T053 [P] [US4] GraphQLリゾルバ統合テスト(`stepRecords`/`upsertStepRecord`/`deleteStepRecord`/`dailyCalorieSummaries`)を`apps/server/src/schema/steps.test.ts`に作成する
- [ ] T054 [P] [US4] 歩数入力フォーム+算出根拠表示のStorybook Interaction Testを`apps/client/src/features/steps/StepsForm/StepsForm.stories.tsx`に作成する
- [ ] T055 [P] [US4] 1日合算表示(概算注記)のStorybook Interaction Testを`apps/client/src/features/steps/DailyCalorieSummary/DailyCalorieSummary.stories.tsx`に作成する

### Implementation for User Story 4

- [ ] T056 [US4] StepRecordのZodスキーマを`apps/server/src/domain/steps/stepsSchema.ts`に実装する(依存: T049)
- [ ] T057 [US4] 歩数消費カロリー計算の純粋関数を`apps/server/src/domain/calorie/stepCalorie.ts`に実装する(依存: T050)
- [ ] T058 [US4] 1日合算計算の純粋関数(概算フラグ)を`apps/server/src/domain/calorie/dailySummary.ts`に実装する(依存: T051, T044, T057)
- [ ] T059 [US4] StepRecordRepository(同日上書き)を`apps/server/src/repositories/stepRecordRepository.ts`に実装する(依存: T006, T052)
- [ ] T060 [US4] Pothos型・`Query.stepRecords`/`dailyCalorieSummaries`・`Mutation.upsertStepRecord`/`deleteStepRecord`を`apps/server/src/schema/steps.ts`に実装する(依存: T056, T059, T058, T053)
- [ ] T061 [US4] 歩数入力フォームを`apps/client/src/features/steps/StepsForm/StepsForm.tsx`に実装する(依存: T054)
- [ ] T062 [US4] 1日合算表示(トレーニング分+歩数分、概算注記)を`apps/client/src/features/steps/DailyCalorieSummary/DailyCalorieSummary.tsx`に実装する(依存: T055, T060)
- [ ] T063 [US4] 歩数ページの組み立てを`apps/client/src/features/steps/StepsPage.tsx`に実装し、ルーティングに追加する(依存: T061, T062, T014)

**Checkpoint**: User Story 1〜4が独立して動作確認可能(1日単位の消費カロリー可視化が完成)

---

## Phase 7: User Story 5 - 食材のカロリーとPFCを参照する (Priority: P5)

**Goal**: よく食べる食材の100gあたりカロリーとPFCを参照専用の一覧として提供する

**Independent Test**: 食材一覧画面を開き、100gあたりのカロリーとPFCが表示されることを確認する(spec.md参照)

### Tests for User Story 5 ⚠️

- [ ] T064 [P] [US5] GraphQLリゾルバテスト(`foodItems`)を`apps/server/src/schema/foodItems.test.ts`に作成する
- [ ] T065 [P] [US5] 食材一覧のStorybook Interaction Test + a11yチェック(スクリーンリーダーでの名称・カロリー・PFC対応確認)を`apps/client/src/features/foods/FoodList/FoodList.stories.tsx`に作成する

### Implementation for User Story 5

- [ ] T066 [P] [US5] 食材の固定データを`apps/server/src/db/seed/foodItems.ts`に実装する
- [ ] T067 [US5] Pothos型・`Query.foodItems`を`apps/server/src/schema/foodItems.ts`に実装する(依存: T066, T064)
- [ ] T068 [US5] 食材一覧テーブル(名称・カロリー・PFCの対応がスクリーンリーダーで伝わるマークアップ)を`apps/client/src/features/foods/FoodList/FoodList.tsx`に実装する(依存: T065)
- [ ] T069 [US5] 食材ページの組み立てを`apps/client/src/features/foods/FoodsPage.tsx`に実装し、ルーティングに追加する(依存: T067, T068, T014)

**Checkpoint**: 全ユーザーストーリー(P1〜P5)が独立して動作確認可能

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 複数ストーリーにまたがる期間集計(FR-016)と、横断的な仕上げ

- [ ] T070 [P] 期間集計(日次/週次/月次、月曜始まり、経過分のみ、欠測日の区別)の単体テストを`apps/server/src/domain/period/periodAggregate.test.ts`に作成する
- [ ] T071 期間集計の純粋関数(PeriodAggregate)を`apps/server/src/domain/period/periodAggregate.ts`に実装する(依存: T070)
- [ ] T072 [P] `Query.weightTrendAggregate(period)`を`apps/server/src/schema/weight.ts`に追加する(依存: T071, T023)
- [ ] T073 [P] `Query.dailyCalorieSummaries(period)`の期間集計対応を`apps/server/src/schema/steps.ts`に追加する(依存: T071, T060)
- [ ] T074 [P] 日次・週次・月次の集計プリセット切替UI(slotProps対応の共通コンポーネント)を`apps/client/src/components/PeriodSelector.tsx`に実装する(依存: T072, T073)
- [ ] T075 [P] 記録0件時の共通空状態コンポーネントを`apps/client/src/components/EmptyState.tsx`に抽出し、各ストーリーの個別実装を置き換える(依存: T026, T063, T069)
- [ ] T076 [P] アクセシビリティ最終確認としてStorybook a11yアドオンのチェックをCI相当のスクリプトに統合する
- [ ] T077 [quickstart.md](./quickstart.md)のシナリオ(P1→P4の依存順、手動確認シナリオ含む)を通しで実施する
- [ ] T078 [P] `README.md`にセットアップ手順と`quickstart.md`へのリンクを記載する

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。即着手可能
- **Foundational (Phase 2)**: Setup完了に依存。すべてのユーザーストーリーをブロックする
- **User Stories (Phase 3-7)**: すべてFoundational完了に依存
  - US1は他ストーリーに依存しない
  - US2は他ストーリーに依存しないが、US3(消費カロリー)の前提になる
  - US3はUS1(体重)・US2(トレーニング記録)の完了に依存(直近体重・セッションデータを参照するため)
  - US4はUS3(セッション消費カロリーとの合算)の完了に依存
  - US5は他ストーリーに依存しない
- **Polish (Phase 8)**: US1・US4・US5の完了に依存(期間集計はUS1・US4の成果に統合するため)

### User Story Dependencies

- **User Story 1 (P1)**: Foundational完了後すぐ着手可能。MVP
- **User Story 2 (P2)**: Foundational完了後すぐ着手可能(US1と並行可)
- **User Story 3 (P3)**: US1・US2の完了が前提(体重・セッションデータを参照するため)
- **User Story 4 (P4)**: US3の完了が前提(トレーニング分との合算のため)
- **User Story 5 (P5)**: Foundational完了後すぐ着手可能。他ストーリーへの依存なし

### Within Each User Story

- テストを先に書き、失敗を確認してから実装する(憲法原則III)
- ドメインロジック(バリデーション・計算)→リポジトリ→GraphQLリゾルバ→UIコンポーネント→ページ組み立ての順
- ストーリー完結後に次の優先度へ

### Parallel Opportunities

- Setup内の[P]タスク(T003, T005)は並行実行可能
- Foundational内の[P]タスク(T010〜T015)は並行実行可能
- Foundational完了後、US1・US2・US5は並行着手可能(US3はUS1・US2、US4はUS3に依存するため後続)
- 各ストーリー内のテストタスク([P]付き)は並行実行可能
- 異なるストーリーを複数人で並行担当可能(依存関係の制約内で)

---

## Parallel Example: User Story 1

```bash
# User Story 1のテストを並行して書く:
Task: "体重バリデーションの単体テストを apps/server/src/domain/weight/weightValidation.test.ts に作成"
Task: "WeightRepositoryの統合テストを apps/server/src/repositories/weightRepository.test.ts に作成"
Task: "GraphQLリゾルバ統合テストを apps/server/src/schema/weight.test.ts に作成"
Task: "体重入力フォームのStorybook Interaction Testを apps/client/src/features/weight/WeightForm/WeightForm.stories.tsx に作成"
Task: "体重一覧・グラフのStorybook Interaction Testを apps/client/src/features/weight/WeightTrend/WeightTrend.stories.tsx に作成"
```

---

## Implementation Strategy

### MVP First(User Story 1のみ)

1. Phase 1: Setup完了
2. Phase 2: Foundational完了(すべてのストーリーをブロックするため必須)
3. Phase 3: User Story 1完了
4. **一旦停止して検証**: User Story 1を独立してテスト
5. 準備ができたらデモ

### Incremental Delivery

1. Setup + Foundational完了 → 基盤完成
2. User Story 1追加 → 独立テスト → デモ(MVP)
3. User Story 2追加 → 独立テスト → デモ
4. User Story 3追加(US1・US2に依存) → 独立テスト → デモ(中核価値である消費カロリー可視化が成立)
5. User Story 4追加(US3に依存) → 独立テスト → デモ
6. User Story 5追加(依存なし、US1〜US4と並行可) → 独立テスト → デモ
7. Polish(期間集計・横断的仕上げ) → 全体検証

---

## Notes

- [P]タスク = 別ファイル・依存なし
- [Story]ラベルはユーザーストーリーへのトレーサビリティを示す
- 各ユーザーストーリーは独立して完結・テスト可能であること
- 実装前にテストが失敗することを確認する(憲法原則III)
- 各タスクまたは論理的なまとまりごとにコミットする
- 各チェックポイントでストーリー単体の動作を確認してから次へ進む
