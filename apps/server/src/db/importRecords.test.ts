import { beforeEach, describe, expect, it } from "vitest";
// T046 で実装する(このテストは実装が無い間は失敗する)。
// 契約: contracts/migrations.md「既存データの移送」
import { importRecords, type ExportedRecords } from "./importRecords.js";
import { createTestDatabase } from "../test-support/createTestDatabase.js";

const exported: ExportedRecords = {
  weightRecords: [
    { id: "w1", date: "2026-01-01", weightKg: 68.5 },
    { id: "w2", date: "2026-01-02", weightKg: 68.1 },
  ],
  trainingSessions: [{ id: "s1", date: "2026-01-01", durationMinutes: 60, intensity: "MEDIUM" }],
  exerciseSets: [
    { id: "e1", sessionId: "s1", exerciseId: "bench-press", sets: 3, reps: 10, weightKg: 50 },
  ],
  stepRecords: [{ id: "p1", date: "2026-01-01", steps: 8000 }],
};

describe("importRecords", () => {
  beforeEach(async () => {
    const db = await createTestDatabase();
    await db.reset();
  });

  it("書き出したデータを取り込むと件数と内容が一致する", async () => {
    const db = await createTestDatabase();

    const result = await importRecords(db, exported);

    expect(result).toEqual({
      weightRecords: 2,
      trainingSessions: 1,
      exerciseSets: 1,
      stepRecords: 1,
    });
    const weights = await db.query<{ id: string; date: string; weightKg: number }>(
      `SELECT id, date, weight_kg AS "weightKg" FROM weight_records ORDER BY date`,
    );
    expect(weights.rows).toEqual(exported.weightRecords);
  });

  it("2回取り込んでも記録が重複しない(FR-016)", async () => {
    const db = await createTestDatabase();

    await importRecords(db, exported);
    await importRecords(db, exported);

    const weights = await db.query("SELECT id FROM weight_records");
    const sets = await db.query("SELECT id FROM exercise_sets");
    expect(weights.rows).toHaveLength(exported.weightRecords.length);
    expect(sets.rows).toHaveLength(exported.exerciseSets.length);
  });

  // 外部キーの順序(セッション → 種目内訳)で取り込むため、まとめて渡しても整合する。
  it("種目内訳はセッションの後に取り込まれ、整合性が崩れない", async () => {
    const db = await createTestDatabase();

    await importRecords(db, exported);

    const joined = await db.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM exercise_sets
       JOIN training_sessions ON training_sessions.id = exercise_sets.session_id`,
    );
    expect(joined.rows[0]?.count).toBe(1);
  });

  it("取り込むデータが空でもエラーにならない", async () => {
    const db = await createTestDatabase();

    const result = await importRecords(db, {
      weightRecords: [],
      trainingSessions: [],
      exerciseSets: [],
      stepRecords: [],
    });

    expect(result).toEqual({
      weightRecords: 0,
      trainingSessions: 0,
      exerciseSets: 0,
      stepRecords: 0,
    });
  });
});
