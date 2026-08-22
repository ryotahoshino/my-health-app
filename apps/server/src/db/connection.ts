import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const schemaSql = readFileSync(join(here, "schema.sql"), "utf-8");

// data/ 配下は .gitignore 対象(research.md #2)。本番デプロイ・コンテナ化は
// このspecの範囲外のため、schema.sql の配置はdev実行(tsx が src を直接読む)を
// 前提としており、ビルド成果物への配布は今後の別specで扱う。
const defaultDbPath = join(here, "../../data/health-app.db");

/**
 * 新しい接続を作成し、スキーマを適用して返す。
 * dbPath に ":memory:" を渡すとテスト用のインメモリDBになる(原則V: 依存を注入して検証)。
 */
export const createConnection = (dbPath: string): Database.Database => {
  if (dbPath !== ":memory:") {
    mkdirSync(dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  // SQLiteは既定で外部キー制約を評価しないため、接続ごとに明示的に有効化する
  // (exercise_sets の ON DELETE CASCADE 等が機能するために必要)。
  db.pragma("foreign_keys = ON");
  db.exec(schemaSql);
  return db;
};

let sharedDb: Database.Database | undefined;

/** アプリ実行時に使う共有接続(シングルトン)。 */
export const getDb = (): Database.Database => {
  if (!sharedDb) {
    sharedDb = createConnection(process.env.DATABASE_PATH ?? defaultDbPath);
  }
  return sharedDb;
};
