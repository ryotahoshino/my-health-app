import { describe, expect, it } from "vitest";
// T009 で実装する(このテストは実装が無い間は失敗する)。
// 契約: contracts/database-access.md「インターフェース」
import { createPgliteDatabase } from "./pgliteClient.js";

// このテストだけはテーブルを自前で作る。マイグレーションの適用(T016)に依存させず、
// SQL 実行の契約そのものを検証するため。
const createDatabaseWithTable = async () => {
  const db = createPgliteDatabase();
  await db.query("CREATE TABLE items (id text PRIMARY KEY, label text NOT NULL)");
  return db;
};

describe("createPgliteDatabase", () => {
  it("パラメータ付きのクエリで行を返す", async () => {
    const db = await createDatabaseWithTable();

    await db.query("INSERT INTO items (id, label) VALUES ($1, $2)", ["1", "最初"]);
    const result = await db.query<{ id: string; label: string }>(
      "SELECT id, label FROM items WHERE id = $1",
      ["1"],
    );

    expect(result.rows).toEqual([{ id: "1", label: "最初" }]);
    await db.close();
  });

  // 削除できたかどうかの判定に使う。ドライバによって名前が違う(pg は rowCount、
  // PGlite は affectedRows)ため、この層で同じ名前に揃える。
  it("更新・削除した行数を rowCount で返す", async () => {
    const db = await createDatabaseWithTable();
    await db.query("INSERT INTO items (id, label) VALUES ($1, $2)", ["1", "最初"]);

    const deleted = await db.query("DELETE FROM items WHERE id = $1", ["1"]);
    const missing = await db.query("DELETE FROM items WHERE id = $1", ["存在しないID"]);

    expect(deleted.rowCount).toBe(1);
    expect(missing.rowCount).toBe(0);
    await db.close();
  });

  it("トランザクションの中で書いた内容を同じトランザクションから読める", async () => {
    const db = await createDatabaseWithTable();

    const label = await db.transaction(async (tx) => {
      await tx.query("INSERT INTO items (id, label) VALUES ($1, $2)", ["1", "途中"]);
      const result = await tx.query<{ label: string }>("SELECT label FROM items WHERE id = $1", [
        "1",
      ]);
      return result.rows[0]?.label;
    });

    expect(label).toBe("途中");
    await db.close();
  });

  it("トランザクションの中で例外が起きたら何も適用されない", async () => {
    const db = await createDatabaseWithTable();

    await expect(
      db.transaction(async (tx) => {
        await tx.query("INSERT INTO items (id, label) VALUES ($1, $2)", ["1", "取り消される"]);
        throw new Error("意図的な失敗");
      }),
    ).rejects.toThrow("意図的な失敗");

    const result = await db.query("SELECT id FROM items");
    expect(result.rows).toHaveLength(0);
    await db.close();
  });
});
