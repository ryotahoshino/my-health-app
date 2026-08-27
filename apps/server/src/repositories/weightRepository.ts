import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

export interface WeightRecord {
  id: string;
  date: string;
  weightKg: number;
}

export interface WeightRepository {
  list(): WeightRecord[];
  /** 指定日以前で最も新しい体重記録を返す(未来の体重は対象外)。無ければnull。 */
  findAsOf(date: string): number | null;
  upsert(input: { date: string; weightKg: number }): WeightRecord;
  delete(id: string): boolean;
}

// 外部I/O(DBアクセス)をこのファイルの端に閉じ込め、呼び出し側は
// WeightRepositoryインターフェースにのみ依存する(原則V・VI)。
export const createWeightRepository = (db: Database.Database): WeightRepository => {
  const listStatement = db.prepare(
    "SELECT id, date, weight_kg AS weightKg FROM weight_records ORDER BY date ASC",
  );
  const findByDateStatement = db.prepare(
    "SELECT id, date, weight_kg AS weightKg FROM weight_records WHERE date = ?",
  );
  const findAsOfStatement = db.prepare(
    "SELECT weight_kg AS weightKg FROM weight_records WHERE date <= ? ORDER BY date DESC LIMIT 1",
  );
  const insertStatement = db.prepare(
    "INSERT INTO weight_records (id, date, weight_kg) VALUES (@id, @date, @weightKg)",
  );
  const updateStatement = db.prepare(
    "UPDATE weight_records SET weight_kg = @weightKg WHERE id = @id",
  );
  const deleteStatement = db.prepare("DELETE FROM weight_records WHERE id = ?");

  return {
    list() {
      return listStatement.all() as WeightRecord[];
    },
    findAsOf(date) {
      const row = findAsOfStatement.get(date) as { weightKg: number } | undefined;
      return row ? row.weightKg : null;
    },
    upsert(input) {
      // 同一日付への保存は既存レコードの上書きとする(FR-017)。
      const existing = findByDateStatement.get(input.date) as WeightRecord | undefined;
      if (existing) {
        updateStatement.run({ id: existing.id, weightKg: input.weightKg });
        return { id: existing.id, date: input.date, weightKg: input.weightKg };
      }
      const id = randomUUID();
      insertStatement.run({ id, date: input.date, weightKg: input.weightKg });
      return { id, date: input.date, weightKg: input.weightKg };
    },
    delete(id) {
      const result = deleteStatement.run(id);
      return result.changes > 0;
    },
  };
};
