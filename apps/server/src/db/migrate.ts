import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Database } from "./client.js";

// スキーマ変更の適用処理。番号付きのSQLファイルを順に適用し、適用済みを記録する。
// ORM・マイグレーションフレームワークは導入しない方針を維持する
// (001 research #2 / contracts/migrations.md)。

const here = dirname(fileURLToPath(import.meta.url));

// 既定の置き場所。src/db から見た apps/server/migrations。
const defaultMigrationsDirectory = join(here, "../../migrations");

const MIGRATIONS_TABLE = "schema_migrations";

const listMigrationFiles = (directory: string): string[] => {
  return readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort();
};

const ensureMigrationsTable = async (db: Database): Promise<void> => {
  // 適用履歴そのものの入れ物は、履歴管理の対象外なので直接作る。
  await db.query(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
       name text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
};

const readAppliedNames = async (db: Database): Promise<Set<string>> => {
  const result = await db.query<{ name: string }>(`SELECT name FROM ${MIGRATIONS_TABLE}`);
  return new Set(result.rows.map((row) => row.name));
};

/**
 * 未適用の変更単位を順に適用する。1ファイルを1トランザクションで適用するため、
 * 途中で失敗したファイルの内容は何も残らない。
 * 戻り値は今回適用したファイル名(すべて適用済みなら空配列)。
 */
export const runMigrations = async (
  db: Database,
  migrationsDirectory: string = defaultMigrationsDirectory,
): Promise<{ applied: string[] }> => {
  await ensureMigrationsTable(db);
  const applied = await readAppliedNames(db);

  const pending = listMigrationFiles(migrationsDirectory).filter((name) => !applied.has(name));

  for (const name of pending) {
    const sql = readFileSync(join(migrationsDirectory, name), "utf-8");
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query(`INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`, [name]);
    });
  }

  return { applied: pending };
};
