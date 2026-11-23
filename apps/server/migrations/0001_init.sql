-- 初期スキーマ。001 の data-model.md のエンティティ定義に対応する。
-- SQLite から Postgres への型の対応は specs/004-database-migration/data-model.md #1 を参照。
-- 日付は YYYY-MM-DD の text として保持する(期間集計のドメインロジックを変更しないため、FR-005)。

CREATE TABLE weight_records (
  id text PRIMARY KEY,
  date text NOT NULL UNIQUE,
  weight_kg double precision NOT NULL
);

CREATE TABLE training_sessions (
  id text PRIMARY KEY,
  date text NOT NULL UNIQUE,
  duration_minutes integer NOT NULL,
  intensity text NOT NULL CHECK (intensity IN ('LOW', 'MEDIUM', 'HIGH'))
);

-- 種目マスタ(固定データ、CRUD対象外。FR-007)
CREATE TABLE exercise_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  mets double precision NOT NULL,
  source text NOT NULL
);

CREATE TABLE exercise_sets (
  id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES training_sessions (id) ON DELETE CASCADE,
  exercise_id text NOT NULL REFERENCES exercise_catalog (id),
  sets integer NOT NULL,
  reps integer NOT NULL,
  weight_kg double precision NOT NULL
);

CREATE INDEX idx_exercise_sets_session_id ON exercise_sets (session_id);

CREATE TABLE step_records (
  id text PRIMARY KEY,
  date text NOT NULL UNIQUE,
  steps integer NOT NULL
);

-- 食材(固定データ、参照専用。FR-015)
CREATE TABLE food_items (
  id text PRIMARY KEY,
  name text NOT NULL,
  calories_per_100g double precision NOT NULL,
  protein_g double precision NOT NULL,
  fat_g double precision NOT NULL,
  carb_g double precision NOT NULL
);
