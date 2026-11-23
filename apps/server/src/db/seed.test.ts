import { describe, expect, it } from "vitest";
// T017 で実装する(このテストは実装が無い間は失敗する)。
// 契約: contracts/migrations.md「固定データの投入」
import { runSeeds } from "./seed.js";
import { createPgliteDatabase } from "./pgliteClient.js";
import { runMigrations } from "./migrate.js";
import { exerciseCatalogSeed } from "./seed/exerciseCatalog.js";
import { foodItemsSeed } from "./seed/foodItems.js";

const createDatabase = async () => {
  const db = createPgliteDatabase();
  await runMigrations(db);
  return db;
};

describe("runSeeds", () => {
  it("種目マスタと食材が一次ソースの配列と一致する", async () => {
    const db = await createDatabase();

    await runSeeds(db);

    const exercises = await db.query<{ id: string }>("SELECT id FROM exercise_catalog ORDER BY id");
    const foods = await db.query<{ id: string }>("SELECT id FROM food_items ORDER BY id");
    expect(exercises.rows.map((row) => row.id)).toEqual(
      exerciseCatalogSeed.map((entry) => entry.id).sort(),
    );
    expect(foods.rows.map((row) => row.id)).toEqual(foodItemsSeed.map((item) => item.id).sort());
    await db.close();
  });

  it("2回実行しても件数が増えない(INV-5)", async () => {
    const db = await createDatabase();

    await runSeeds(db);
    await runSeeds(db);

    const exercises = await db.query("SELECT id FROM exercise_catalog");
    expect(exercises.rows).toHaveLength(exerciseCatalogSeed.length);
    await db.close();
  });

  // 一次ソースの配列を更新したときに、DB 側の値が追従すること。
  it("既存の行がある状態で実行すると値が更新される", async () => {
    const db = await createDatabase();
    const first = exerciseCatalogSeed[0]!;
    await db.query(
      "INSERT INTO exercise_catalog (id, name, mets, source) VALUES ($1, $2, $3, $4)",
      [first.id, "古い名称", 1, "古い出典"],
    );

    await runSeeds(db);

    const updated = await db.query<{ name: string; mets: number; source: string }>(
      "SELECT name, mets, source FROM exercise_catalog WHERE id = $1",
      [first.id],
    );
    expect(updated.rows[0]).toEqual({ name: first.name, mets: first.mets, source: first.source });
    await db.close();
  });
});
