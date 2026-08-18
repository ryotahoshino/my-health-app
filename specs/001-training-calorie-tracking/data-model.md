# Data Model: 体重・トレーニング記録と消費カロリーの可視化

出典: [spec.md](./spec.md) の Key Entities / Assumptions、[research.md](./research.md) #5

値の制約(範囲・必須・書式)はZodスキーマとして実装し、GraphQL型の形とは分離する(憲法原則IV)。

## 永続化エンティティ

### WeightRecord(体重記録)

| フィールド | 型 | 制約 |
|---|---|---|
| id | string | サーバー発行のID |
| date | string(YYYY-MM-DD) | 必須。1日1件(同日保存は上書き、FR-017) |
| weightKg | number | 必須。20.0〜300.0、小数点第1位まで |

### TrainingSession(トレーニングセッション)

| フィールド | 型 | 制約 |
|---|---|---|
| id | string | サーバー発行のID |
| date | string(YYYY-MM-DD) | 必須。1日1件(同日の再保存は既存セッションの編集として扱う、FR-017) |
| durationMinutes | number(整数) | 必須。1〜600 |
| intensity | enum(`LOW` \| `MEDIUM` \| `HIGH`) | 必須。消費カロリー算出のMETs(research.md #5: 3.0 / 5.0 / 8.0)に対応 |
| exerciseSets | ExerciseSet[] | 0件以上。セッション削除時にカスケード削除 |

### ExerciseSet(種目記録)

| フィールド | 型 | 制約 |
|---|---|---|
| id | string | サーバー発行のID |
| sessionId | string | TrainingSession への参照(必須) |
| exerciseId | string | ExerciseCatalog への参照(必須) |
| sets | number(整数) | 必須。1〜20 |
| reps | number(整数) | 必須。1〜100 |
| weightKg | number | 必須。0〜500、0.5kg刻み |

**導出値**: 総ボリューム = `weightKg × reps × sets`(FR-010。永続化はせずクエリ時に算出)

### StepRecord(歩数記録)

| フィールド | 型 | 制約 |
|---|---|---|
| id | string | サーバー発行のID |
| date | string(YYYY-MM-DD) | 必須。1日1件(同日保存は上書き、FR-017) |
| steps | number(整数) | 必須。0〜100,000 |

## 固定データ(参照専用、CRUD対象外)

### ExerciseCatalog(種目マスタ)

| フィールド | 型 | 説明 |
|---|---|---|
| id | string | |
| name | string | 種目名 |
| mets | number | 種目別METs値(参考表示用。セッション単位の消費カロリー算出には強度区分のMETsを用いる。research.md #5) |
| source | string | 出典 |

### FoodItem(食材)

| フィールド | 型 | 説明 |
|---|---|---|
| id | string | |
| name | string | 食材名 |
| caloriesPer100g | number | 100gあたりカロリー(kcal) |
| proteinG | number | 100gあたりタンパク質(g) |
| fatG | number | 100gあたり脂質(g) |
| carbG | number | 100gあたり炭水化物(g) |

## 導出モデル(非永続・計算専用)

ドメイン層の純粋関数として算出し、GraphQLのクエリ結果として返す(原則V)。

### SessionCalorieEstimate

- 入力: `TrainingSession.durationMinutes`, `TrainingSession.intensity`, 算出日以前で最も新しい `WeightRecord.weightKg`
- 出力: `calories`(kcal), `formula`(表示用の計算式文字列), `assumedConstants`(使用したMETs値等), `source`(出典)。体重記録が存在しない場合は `calories = null` とし、算出不可を示すフラグを返す(FR-011)

### StepCalorieEstimate

- 入力: `StepRecord.steps`, 直近の `WeightRecord.weightKg`
- 出力: `calories`(kcal), `formula`, `assumedConstants`(METs・ケイデンス), `source`

### DailyCalorieSummary(1日分の合算)

- 入力: 同一日の `SessionCalorieEstimate`(複数可)と `StepCalorieEstimate`
- 出力: `trainingCalories`, `stepCalories`, `totalCalories`(合算)、`isApproximate: true`(常に真。トレーニング中歩数との重複可能性を明示、FR-014)

### PeriodAggregate(日次・週次・月次集計)

- 入力: 集計プリセット(`DAILY` \| `WEEKLY` \| `MONTHLY`)、対象エンティティ(体重・消費カロリー等)
- 週次・月次の期間定義: 週は月曜始まり、「今週」「今月」は期間開始日から当日までの経過分のみ(FR-016)
- 出力: 期間ラベルと集計値の配列。記録がない日は0ではなく欠測として区別する(Edge Cases)

## リレーション概要

```text
WeightRecord      (date 単位、独立)
TrainingSession 1─* ExerciseSet *─1 ExerciseCatalog(参照専用)
StepRecord         (date 単位、独立)
FoodItem           (参照専用、他エンティティと関連なし)
```
