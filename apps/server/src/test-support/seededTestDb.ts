import type Database from "better-sqlite3";
import { createConnection } from "../db/connection.js";
import { seedExerciseCatalog } from "../db/seed/exerciseCatalog.js";

// 種目マスタ(exercise_catalog)を参照するテストで共通して必要になる、
// 種目マスタ済みのインメモリDBを作成する(テストごとに独立、原則V)。
export const createSeededTestDb = (): Database.Database => {
  const db = createConnection(":memory:");
  seedExerciseCatalog(db);
  return db;
};
