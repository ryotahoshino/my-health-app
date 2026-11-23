import { createPgliteDatabase } from "../src/db/pgliteClient.js";
import { runMigrations } from "../src/db/migrate.js";
import { runSeeds } from "../src/db/seed.js";
import type { Database } from "../src/db/client.js";

// テスト用の保存先。PGlite はインスタンスの起動に時間がかかるため、
// テストファイルごとに1つを使い回し、各テストの前に中身だけを空にする
// (specs/004-database-migration/research.md #3 / contracts/database-access.md「テストの契約」)。

// 記録を保持するテーブル。schema_migrations は空にしない(スキーマの適用履歴のため)。
const DATA_TABLES = [
  "exercise_sets",
  "training_sessions",
  "weight_records",
  "step_records",
  "exercise_catalog",
  "food_items",
];

export type TestDatabase = Database & {
  /** すべての記録・固定データを削除する。テストごとの冒頭で呼ぶ。 */
  reset(): Promise<void>;
  /** 固定データ(種目マスタ・食材)を投入する。必要なテストだけが呼ぶ。 */
  seed(): Promise<void>;
};

/**
 * スキーマを適用済みのテスト用データベースを作る。
 * 1つのテストファイルで1回だけ呼び、テストごとに reset() を呼ぶ想定。
 */
export const createTestDatabase = async (): Promise<TestDatabase> => {
  const db = createPgliteDatabase();
  // 本番と同じ適用処理でスキーマを作る(contracts/migrations.md 規則2)。
  await runMigrations(db);

  return {
    query: db.query,
    exec: db.exec,
    transaction: db.transaction,
    close: db.close,
    reset: async () => {
      // 外部キーがあるため、まとめて TRUNCATE して依存関係を無視する。
      await db.exec(`TRUNCATE ${DATA_TABLES.join(", ")} CASCADE`);
    },
    seed: async () => {
      await runSeeds(db);
    },
  };
};
