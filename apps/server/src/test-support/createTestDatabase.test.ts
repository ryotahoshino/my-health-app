import { beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase } from "./createTestDatabase.js";

// テスト用DBを共有する方式でも、テストごとに独立した状態で始められること(FR-019)。
describe("createTestDatabase", () => {
  beforeEach(async () => {
    const db = await createTestDatabase();
    await db.reset();
  });

  it("前のテストで入れた記録は次のテストから見えない(1/2)", async () => {
    const db = await createTestDatabase();
    await db.query("INSERT INTO weight_records (id, date, weight_kg) VALUES ($1, $2, $3)", [
      "test-1",
      "2026-01-01",
      68.5,
    ]);

    const result = await db.query("SELECT id FROM weight_records");
    expect(result.rows).toHaveLength(1);
  });

  it("前のテストで入れた記録は次のテストから見えない(2/2)", async () => {
    const db = await createTestDatabase();

    const result = await db.query("SELECT id FROM weight_records");
    expect(result.rows).toHaveLength(0);
  });

  it("固定データ(種目マスタ)は reset しても残る", async () => {
    const db = await createTestDatabase();

    const result = await db.query("SELECT id FROM exercise_catalog");
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it("スキーマは適用済みで、全テーブルが存在する", async () => {
    const db = await createTestDatabase();

    const result = await db.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    const tables = result.rows.map((row) => row.table_name);
    for (const expected of [
      "weight_records",
      "training_sessions",
      "exercise_sets",
      "step_records",
      "exercise_catalog",
      "food_items",
      "schema_migrations",
    ]) {
      expect(tables).toContain(expected);
    }
  });
});
