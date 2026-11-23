import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase, type TestDatabase } from "../test-support/createTestDatabase.js";
import { createStepRecordRepository, type StepRecordRepository } from "./stepRecordRepository.js";

describe("StepRecordRepository (Postgres)", () => {
  let db: TestDatabase;
  let repository: StepRecordRepository;

  // 依存を注入して検証する(原則V)。PGlite のインスタンスはファイル内で使い回し、
  // テストごとに中身を空にする(research #3)。
  beforeAll(async () => {
    db = await createTestDatabase();
    repository = createStepRecordRepository(db);
  });

  beforeEach(async () => {
    await db.reset();
  });

  it("初期状態では0件", async () => {
    expect(await repository.list()).toEqual([]);
  });

  it("記録を作成し一覧に反映される", async () => {
    const created = await repository.upsert({ date: "2026-01-01", steps: 8000 });
    expect(created.date).toBe("2026-01-01");
    expect(created.steps).toBe(8000);
    expect(await repository.list()).toHaveLength(1);
  });

  it("同一日付への保存は上書きになる(FR-017)", async () => {
    await repository.upsert({ date: "2026-01-01", steps: 8000 });
    await repository.upsert({ date: "2026-01-01", steps: 9500 });

    const records = await repository.list();
    expect(records).toHaveLength(1);
    expect(records[0]?.steps).toBe(9500);
  });

  it("異なる日付は別レコードとして保存される", async () => {
    await repository.upsert({ date: "2026-01-01", steps: 8000 });
    await repository.upsert({ date: "2026-01-02", steps: 5000 });
    expect(await repository.list()).toHaveLength(2);
  });

  it("findByDateは指定日の記録を返す", async () => {
    await repository.upsert({ date: "2026-01-01", steps: 8000 });
    const found = await repository.findByDate("2026-01-01");
    expect(found?.steps).toBe(8000);
  });

  it("findByDateは記録が無い日はundefinedを返す", async () => {
    expect(await repository.findByDate("2026-01-01")).toBeUndefined();
  });

  it("削除すると一覧から消える", async () => {
    const created = await repository.upsert({ date: "2026-01-01", steps: 8000 });
    expect(await repository.delete(created.id)).toBe(true);
    expect(await repository.list()).toHaveLength(0);
  });

  it("存在しないIDの削除はfalseを返す", async () => {
    expect(await repository.delete("does-not-exist")).toBe(false);
  });
});
