# Data Model: 記録データの保存先をマネージドデータベースへ移す

**Date**: 2026-11-23 | **Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

既存のエンティティ(001 の data-model.md)は変更しない。本文書は保存先を Postgres に移すときの
スキーマの対応と制約の維持を定める。

## 1. 型の対応

| 現行(SQLite) | 移行後(Postgres) | 備考 |
|---|---|---|
| `TEXT`(ID・日付・名称) | `text` | ID はアプリ側で UUID を生成する(現行どおり) |
| `REAL`(体重・重量・METs・栄養素) | `double precision` | 表示の丸めはアプリ側のまま。移行前後で表示が変わらないことを確認する |
| `INTEGER`(実施時間・セット数・回数・歩数) | `integer` | |
| `CHECK (intensity IN (...))` | 同じ `CHECK` | 強度の値域を維持 |
| `REFERENCES ... ON DELETE CASCADE` | 同じ | SQLite は接続ごとに有効化が必要だったが、Postgres は既定で有効 |
| `UNIQUE`(日付) | 同じ | upsert の競合対象として使う(`ON CONFLICT (date)`) |

**日付は `text`(`YYYY-MM-DD`)のまま維持する**。`date` 型にするとドメイン層(期間集計)に波及するため、
本specでは変更しない(FR-005 / research #4)。

## 2. テーブル(移行後)

| テーブル | 主キー | 一意制約 | 外部キー | 用途 |
|---|---|---|---|---|
| `weight_records` | `id` | `date` | — | 体重記録 |
| `training_sessions` | `id` | `date` | — | トレーニングのセッション |
| `exercise_sets` | `id` | — | `session_id` → `training_sessions.id`(CASCADE)、`exercise_id` → `exercise_catalog.id` | 種目内訳 |
| `step_records` | `id` | `date` | — | 歩数記録 |
| `exercise_catalog` | `id` | — | — | 種目マスタ(固定データ) |
| `food_items` | `id` | — | — | 食材(固定データ) |
| `schema_migrations` | `name` | — | — | 【新規】適用済みのスキーマ変更 |

インデックスは現行を維持する(`exercise_sets (session_id)`)。
`date` の一意制約が検索にも使われるため、追加のインデックスは設けない。

## 3. 新規テーブル: `schema_migrations`

| 列 | 型 | 制約 | 内容 |
|---|---|---|---|
| `name` | `text` | 主キー | 適用したSQLファイル名(例: `0001_init.sql`) |
| `applied_at` | `timestamptz` | NOT NULL、既定値は現在時刻 | 適用した時刻 |

- このテーブル自体は適用処理が存在を保証する(`CREATE TABLE IF NOT EXISTS`)。
  記録用のテーブルであり、アプリの起動経路では触らない。
- 「どのファイルが適用済みか」の判定にのみ使う。内容のハッシュ照合は行わない(個人開発の規模に対して過剰)。

## 4. 不変条件(移行前後で保たれること)

- **INV-1**: 日付ごとに記録は1件(体重・歩数・トレーニングのセッション)。同じ日付への保存は上書きになる
- **INV-2**: セッションを削除すると、その種目内訳も削除される
- **INV-3**: 種目内訳の `exercise_id` は種目マスタに存在する
- **INV-4**: 強度は `LOW` / `MEDIUM` / `HIGH` のいずれか
- **INV-5**: 固定データ(種目マスタ・食材)は投入を何回繰り返しても1組だけ存在する
- **INV-6**: 日付は `YYYY-MM-DD` の文字列として保持される

## 5. 移送するデータ(US3)

| 対象 | 移送するか | 理由 |
|---|---|---|
| `weight_records` | する | 利用者の記録 |
| `training_sessions` | する | 利用者の記録 |
| `exercise_sets` | する | セッションに属する記録。セッションより後に取り込む(外部キー) |
| `step_records` | する | 利用者の記録 |
| `exercise_catalog` | しない | 固定データ。投入処理で再生成する |
| `food_items` | しない | 同上 |

取り込みの順序は `training_sessions` → `exercise_sets`(外部キーの順)。
取り込みは `ON CONFLICT (id) DO NOTHING` で冪等にする(FR-016)。
