import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../db/connection.js";
// T059で実装する(このテストは実装が無い間は失敗する)
import { createStepRecordRepository, type StepRecordRepository } from "./stepRecordRepository.js";

describe("StepRecordRepository (SQLite)", () => {
  let db: Database.Database;
  let repository: StepRecordRepository;

  beforeEach(() => {
    // 依存を注入して検証する(原則V)。テストごとに独立したインメモリDBを使う。
    db = createConnection(":memory:");
    repository = createStepRecordRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it("初期状態では0件", () => {
    expect(repository.list()).toEqual([]);
  });

  it("記録を作成し一覧に反映される", () => {
    const created = repository.upsert({ date: "2026-01-01", steps: 8000 });
    expect(created.date).toBe("2026-01-01");
    expect(created.steps).toBe(8000);
    expect(repository.list()).toHaveLength(1);
  });

  it("同一日付への保存は上書きになる(FR-017)", () => {
    repository.upsert({ date: "2026-01-01", steps: 8000 });
    repository.upsert({ date: "2026-01-01", steps: 9500 });

    const records = repository.list();
    expect(records).toHaveLength(1);
    expect(records[0]?.steps).toBe(9500);
  });

  it("異なる日付は別レコードとして保存される", () => {
    repository.upsert({ date: "2026-01-01", steps: 8000 });
    repository.upsert({ date: "2026-01-02", steps: 5000 });
    expect(repository.list()).toHaveLength(2);
  });

  it("findByDateは指定日の記録を返す", () => {
    repository.upsert({ date: "2026-01-01", steps: 8000 });
    expect(repository.findByDate("2026-01-01")?.steps).toBe(8000);
  });

  it("findByDateは記録が無い日はundefinedを返す", () => {
    expect(repository.findByDate("2026-01-01")).toBeUndefined();
  });

  it("削除すると一覧から消える", () => {
    const created = repository.upsert({ date: "2026-01-01", steps: 8000 });
    expect(repository.delete(created.id)).toBe(true);
    expect(repository.list()).toHaveLength(0);
  });

  it("存在しないIDの削除はfalseを返す", () => {
    expect(repository.delete("does-not-exist")).toBe(false);
  });
});
