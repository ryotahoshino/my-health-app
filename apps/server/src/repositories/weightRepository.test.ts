import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../db/connection.js";
// T022で実装する(このテストは実装が無い間は失敗する)
import { createWeightRepository, type WeightRepository } from "./weightRepository.js";

describe("WeightRepository (SQLite)", () => {
  let db: Database.Database;
  let repository: WeightRepository;

  beforeEach(() => {
    // 依存を注入して検証する(原則V)。テストごとに独立したインメモリDBを使う。
    db = createConnection(":memory:");
    repository = createWeightRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it("初期状態では0件", () => {
    expect(repository.list()).toEqual([]);
  });

  it("記録を作成し一覧に反映される", () => {
    const created = repository.upsert({ date: "2026-01-01", weightKg: 68.5 });
    expect(created.date).toBe("2026-01-01");
    expect(created.weightKg).toBe(68.5);
    expect(repository.list()).toHaveLength(1);
  });

  it("同一日付への保存は上書きになる(FR-017)", () => {
    repository.upsert({ date: "2026-01-01", weightKg: 68.5 });
    repository.upsert({ date: "2026-01-01", weightKg: 67.8 });

    const records = repository.list();
    expect(records).toHaveLength(1);
    expect(records[0]?.weightKg).toBe(67.8);
  });

  it("異なる日付は別レコードとして保存される", () => {
    repository.upsert({ date: "2026-01-01", weightKg: 68.5 });
    repository.upsert({ date: "2026-01-02", weightKg: 68.2 });
    expect(repository.list()).toHaveLength(2);
  });

  it("削除すると一覧から消える", () => {
    const created = repository.upsert({ date: "2026-01-01", weightKg: 68.5 });
    const deleted = repository.delete(created.id);
    expect(deleted).toBe(true);
    expect(repository.list()).toHaveLength(0);
  });

  it("存在しないIDの削除はfalseを返す", () => {
    expect(repository.delete("does-not-exist")).toBe(false);
  });
});
