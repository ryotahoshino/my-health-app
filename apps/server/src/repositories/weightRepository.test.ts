import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase, type TestDatabase } from "../test-support/createTestDatabase.js";
import { createWeightRepository, type WeightRepository } from "./weightRepository.js";

describe("WeightRepository (Postgres)", () => {
  let db: TestDatabase;
  let repository: WeightRepository;

  // 依存を注入して検証する(原則V)。PGlite のインスタンスはファイル内で使い回し、
  // テストごとに中身を空にする(research #3)。
  beforeAll(async () => {
    db = await createTestDatabase();
    repository = createWeightRepository(db);
  });

  beforeEach(async () => {
    await db.reset();
  });

  it("初期状態では0件", async () => {
    expect(await repository.list()).toEqual([]);
  });

  it("記録を作成し一覧に反映される", async () => {
    const created = await repository.upsert({ date: "2026-01-01", weightKg: 68.5 });
    expect(created.date).toBe("2026-01-01");
    expect(created.weightKg).toBe(68.5);
    expect(await repository.list()).toHaveLength(1);
  });

  it("同一日付への保存は上書きになる(FR-017)", async () => {
    await repository.upsert({ date: "2026-01-01", weightKg: 68.5 });
    await repository.upsert({ date: "2026-01-01", weightKg: 67.8 });

    const records = await repository.list();
    expect(records).toHaveLength(1);
    expect(records[0]?.weightKg).toBe(67.8);
  });

  it("同一日付への保存を並行して行っても1件に収まる", async () => {
    // 検索してから分岐する実装では二重作成が起こりうるため、一意制約に対して
    // 原子的に動くこと(ON CONFLICT)を確認する(spec Edge Case / research #4)。
    await Promise.all([
      repository.upsert({ date: "2026-02-01", weightKg: 70 }),
      repository.upsert({ date: "2026-02-01", weightKg: 71 }),
    ]);

    const records = await repository.list();
    expect(records).toHaveLength(1);
  });

  it("異なる日付は別レコードとして保存される", async () => {
    await repository.upsert({ date: "2026-01-01", weightKg: 68.5 });
    await repository.upsert({ date: "2026-01-02", weightKg: 68.2 });
    expect(await repository.list()).toHaveLength(2);
  });

  it("削除すると一覧から消える", async () => {
    const created = await repository.upsert({ date: "2026-01-01", weightKg: 68.5 });
    const deleted = await repository.delete(created.id);
    expect(deleted).toBe(true);
    expect(await repository.list()).toHaveLength(0);
  });

  it("存在しないIDの削除はfalseを返す", async () => {
    expect(await repository.delete("does-not-exist")).toBe(false);
  });

  it("findAsOfは指定日以前で最も新しい体重記録を返す(未来の体重は対象外)", async () => {
    await repository.upsert({ date: "2026-01-01", weightKg: 65 });
    await repository.upsert({ date: "2026-01-10", weightKg: 80 }); // 対象日より後

    expect(await repository.findAsOf("2026-01-05")).toBe(65);
  });

  it("findAsOfは記録が1件も無い場合はnullを返す", async () => {
    expect(await repository.findAsOf("2026-01-05")).toBeNull();
  });
});
