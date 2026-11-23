import { createPgliteDatabase } from "../db/pgliteClient.js";
import { runMigrations } from "../db/migrate.js";
import { runSeeds } from "../db/seed.js";
import type { Database } from "../db/client.js";

// テスト用の保存先。PGlite はプロセス内で Postgres を起動するため、インスタンスの
// 生成がテスト時間の大半を占める。そのため同一プロセス内では1つを共有し、
// 各テストの前に記録だけを空にする(specs/004-database-migration/research.md #3)。

// 利用者の記録を保持するテーブル。テストごとに空にする対象。
const RECORD_TABLES = ["exercise_sets", "training_sessions", "weight_records", "step_records"];

export type TestDatabase = Database & {
  /**
   * 利用者の記録を空にする。テストごとの冒頭で呼ぶ。
   * 固定データ(種目マスタ・食材)は毎回入れ直すと遅いため残したままにする
   * (投入はインスタンス作成時に1回だけ行う)。
   */
  reset(): Promise<void>;
};

const createDatabase = async (): Promise<TestDatabase> => {
  const db = createPgliteDatabase();
  // 本番と同じ適用処理でスキーマを作る(contracts/migrations.md 規則2)。
  await runMigrations(db);
  // 種目内訳の外部キー先として種目マスタが必要なため、常に投入しておく。
  await runSeeds(db);

  return {
    query: db.query,
    exec: db.exec,
    transaction: db.transaction,
    close: db.close,
    reset: async () => {
      // 外部キーがあるため CASCADE を付けてまとめて空にする。
      await db.exec(`TRUNCATE ${RECORD_TABLES.join(", ")} CASCADE`);
    },
  };
};

let sharedDatabase: Promise<TestDatabase> | undefined;

/**
 * スキーマの適用と固定データの投入を済ませたテスト用データベースを返す。
 * 同一プロセス内では同じインスタンスを返すため、呼び出し側は reset() で記録を空にする。
 */
export const createTestDatabase = async (): Promise<TestDatabase> => {
  if (!sharedDatabase) {
    sharedDatabase = createDatabase();
  }
  return sharedDatabase;
};
