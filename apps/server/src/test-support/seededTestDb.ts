import { createTestDatabase, type TestDatabase } from "./createTestDatabase.js";

// 固定データ(種目マスタ・食材)を投入済みのテスト用DBを返す。
// PGlite のインスタンスはテストファイルごとに1つを使い回し(モジュールの読み込みが
// ファイル単位のため)、呼び出しごとに記録だけを空にして独立性を保つ
// (specs/004-database-migration/research.md #3)。
let sharedDatabase: Promise<TestDatabase> | undefined;

export const createSeededTestDb = async (): Promise<TestDatabase> => {
  if (!sharedDatabase) {
    sharedDatabase = createTestDatabase();
  }
  const db = await sharedDatabase;
  await db.reset();
  return db;
};
