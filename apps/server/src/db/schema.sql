-- SQLiteスキーマ(起動時に CREATE TABLE IF NOT EXISTS で冪等に適用する)
-- data-model.md のエンティティ定義に対応。ORM・マイグレーションフレームワークは導入しない(research.md #2)。

CREATE TABLE IF NOT EXISTS weight_records (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  weight_kg REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  duration_minutes INTEGER NOT NULL,
  intensity TEXT NOT NULL CHECK (intensity IN ('LOW', 'MEDIUM', 'HIGH'))
);

-- 種目マスタ(固定データ、CRUD対象外。FR-007)
CREATE TABLE IF NOT EXISTS exercise_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mets REAL NOT NULL,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercise_sets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES training_sessions (id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercise_catalog (id),
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight_kg REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_session_id ON exercise_sets (session_id);

CREATE TABLE IF NOT EXISTS step_records (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  steps INTEGER NOT NULL
);

-- 食材(固定データ、参照専用。FR-015)
CREATE TABLE IF NOT EXISTS food_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  calories_per_100g REAL NOT NULL,
  protein_g REAL NOT NULL,
  fat_g REAL NOT NULL,
  carb_g REAL NOT NULL
);
