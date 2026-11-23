import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// T016 で実装する(このテストは実装が無い間は失敗する)。
// 契約: contracts/migrations.md「適用処理」
import { runMigrations } from "./migrate.js";
import { createPgliteDatabase } from "./pgliteClient.js";

// 一時ディレクトリに変更単位を置き、本物の migrations/ とは独立に適用処理を検証する。
const createMigrationDirectory = (files: Record<string, string>): string => {
  const directory = mkdtempSync(join(tmpdir(), "migrations-"));
  for (const [name, sql] of Object.entries(files)) {
    writeFileSync(join(directory, name), sql, "utf-8");
  }
  return directory;
};

const listTables = async (db: ReturnType<typeof createPgliteDatabase>): Promise<string[]> => {
  const result = await db.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  );
  return result.rows.map((row) => row.table_name);
};

describe("runMigrations", () => {
  it("空のデータベースに適用すると、変更単位のテーブルが作られる", async () => {
    const db = createPgliteDatabase();
    const directory = createMigrationDirectory({
      "0001_first.sql": "CREATE TABLE first_table (id text PRIMARY KEY);",
      "0002_second.sql": "CREATE TABLE second_table (id text PRIMARY KEY);",
    });

    const result = await runMigrations(db, directory);

    expect(result.applied).toEqual(["0001_first.sql", "0002_second.sql"]);
    expect(await listTables(db)).toContain("first_table");
    expect(await listTables(db)).toContain("second_table");
    await db.close();
  });

  it("2回目の適用は0件で正常終了する", async () => {
    const db = createPgliteDatabase();
    const directory = createMigrationDirectory({
      "0001_first.sql": "CREATE TABLE first_table (id text PRIMARY KEY);",
    });

    await runMigrations(db, directory);
    const second = await runMigrations(db, directory);

    expect(second.applied).toEqual([]);
    await db.close();
  });

  it("適用済みの後に変更単位を足すと、その1つだけが適用される", async () => {
    const db = createPgliteDatabase();
    const directory = createMigrationDirectory({
      "0001_first.sql": "CREATE TABLE first_table (id text PRIMARY KEY);",
    });
    await runMigrations(db, directory);

    writeFileSync(
      join(directory, "0002_second.sql"),
      "CREATE TABLE second_table (id text PRIMARY KEY);",
      "utf-8",
    );
    const result = await runMigrations(db, directory);

    expect(result.applied).toEqual(["0002_second.sql"]);
    await db.close();
  });

  // 1ファイル = 1トランザクション。途中で失敗したときに中途半端なスキーマが残らないこと。
  it("変更単位の途中で失敗したら、その変更単位の内容は何も残らない", async () => {
    const db = createPgliteDatabase();
    const directory = createMigrationDirectory({
      "0001_broken.sql":
        "CREATE TABLE ok_table (id text PRIMARY KEY); CREATE TABLE ng_table (id text PRIMARY KEY, これは不正なSQL);",
    });

    await expect(runMigrations(db, directory)).rejects.toThrow();

    const tables = await listTables(db);
    expect(tables).not.toContain("ok_table");
    expect(tables).not.toContain("ng_table");
    await db.close();
  });

  it("適用した変更単位をファイル名で記録する", async () => {
    const db = createPgliteDatabase();
    const directory = createMigrationDirectory({
      "0001_first.sql": "CREATE TABLE first_table (id text PRIMARY KEY);",
    });

    await runMigrations(db, directory);

    const applied = await db.query<{ name: string }>(
      "SELECT name FROM schema_migrations ORDER BY name",
    );
    expect(applied.rows.map((row) => row.name)).toEqual(["0001_first.sql"]);
    await db.close();
  });
});
