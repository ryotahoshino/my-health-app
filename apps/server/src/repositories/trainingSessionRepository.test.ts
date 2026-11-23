import { beforeEach, describe, expect, it } from "vitest";
import { createSeededTestDb } from "../test-support/seededTestDb.js";
import type { TestDatabase } from "../test-support/createTestDatabase.js";
import {
  createTrainingSessionRepository,
  type TrainingSessionRepository,
} from "./trainingSessionRepository.js";

const baseInput = {
  date: "2026-01-01",
  durationMinutes: 60,
  intensity: "MEDIUM" as const,
  exerciseSets: [{ exerciseId: "bench-press", sets: 3, reps: 10, weightKg: 50 }],
};

describe("TrainingSessionRepository (Postgres)", () => {
  let db: TestDatabase;
  let repository: TrainingSessionRepository;

  beforeEach(async () => {
    // exercise_sets.exercise_id の外部キー先として種目マスタが必要。
    // 呼び出しごとに中身が作り直される(research #3)。
    db = await createSeededTestDb();
    repository = createTrainingSessionRepository(db);
  });

  it("初期状態では0件", async () => {
    expect(await repository.list()).toEqual([]);
  });

  it("セッションを種目つきで作成し一覧に反映される", async () => {
    const created = await repository.upsert(baseInput);
    expect(created.date).toBe("2026-01-01");
    expect(created.durationMinutes).toBe(60);
    expect(created.intensity).toBe("MEDIUM");
    expect(created.exerciseSets).toHaveLength(1);
    expect(created.exerciseSets[0]).toMatchObject({
      exerciseId: "bench-press",
      sets: 3,
      reps: 10,
      weightKg: 50,
    });
    expect(await repository.list()).toHaveLength(1);
  });

  it("同一日付への保存は上書きになり、種目一覧も置き換わる(FR-017)", async () => {
    await repository.upsert(baseInput);
    await repository.upsert({
      ...baseInput,
      durationMinutes: 45,
      exerciseSets: [{ exerciseId: "squat", sets: 4, reps: 8, weightKg: 60 }],
    });

    const sessions = await repository.list();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.durationMinutes).toBe(45);
    expect(sessions[0]?.exerciseSets).toHaveLength(1);
    expect(sessions[0]?.exerciseSets[0]).toMatchObject({ exerciseId: "squat" });
  });

  it("異なる日付は別セッションとして保存される", async () => {
    await repository.upsert(baseInput);
    await repository.upsert({ ...baseInput, date: "2026-01-02" });
    expect(await repository.list()).toHaveLength(2);
  });

  it("idを指定してセッション単体を取得できる", async () => {
    const created = await repository.upsert(baseInput);
    const found = await repository.get(created.id);
    expect(found?.id).toBe(created.id);
    expect(found?.exerciseSets).toHaveLength(1);
  });

  it("存在しないidの取得はundefinedを返す", async () => {
    expect(await repository.get("does-not-exist")).toBeUndefined();
  });

  it("削除するとセッションと種目記録が一覧から消える(カスケード削除)", async () => {
    const created = await repository.upsert(baseInput);
    const deleted = await repository.delete(created.id);
    expect(deleted).toBe(true);
    expect(await repository.list()).toHaveLength(0);
    expect(await repository.get(created.id)).toBeUndefined();
  });

  it("存在しないidの削除はfalseを返す", async () => {
    expect(await repository.delete("does-not-exist")).toBe(false);
  });
});
