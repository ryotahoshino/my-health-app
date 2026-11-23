import { randomUUID } from "node:crypto";
import type { SqlExecutor } from "../db/client.js";

export type WeightRecord = {
  id: string;
  date: string;
  weightKg: number;
};

export type WeightRepository = {
  list(): Promise<WeightRecord[]>;
  /** 指定日以前で最も新しい体重記録を返す(未来の体重は対象外)。無ければnull。 */
  findAsOf(date: string): Promise<number | null>;
  upsert(input: { date: string; weightKg: number }): Promise<WeightRecord>;
  delete(id: string): Promise<boolean>;
};

// 外部I/O(DBアクセス)をこのファイルの端に閉じ込め、呼び出し側は
// WeightRepositoryインターフェースにのみ依存する(原則V・VI)。
export const createWeightRepository = (db: SqlExecutor): WeightRepository => {
  return {
    async list() {
      const result = await db.query<WeightRecord>(
        `SELECT id, date, weight_kg AS "weightKg" FROM weight_records ORDER BY date ASC`,
      );
      return result.rows;
    },
    async findAsOf(date) {
      const result = await db.query<{ weightKg: number }>(
        `SELECT weight_kg AS "weightKg" FROM weight_records
         WHERE date <= $1 ORDER BY date DESC LIMIT 1`,
        [date],
      );
      const row = result.rows[0];
      if (row) {
        return row.weightKg;
      }
      return null;
    },
    async upsert(input) {
      // 同一日付への保存は既存レコードの上書きとする(FR-017)。日付の一意制約に対して
      // 原子的に動くため、同時に保存しても二重作成にならない(research #4)。
      const result = await db.query<WeightRecord>(
        `INSERT INTO weight_records (id, date, weight_kg)
         VALUES ($1, $2, $3)
         ON CONFLICT (date) DO UPDATE SET weight_kg = excluded.weight_kg
         RETURNING id, date, weight_kg AS "weightKg"`,
        [randomUUID(), input.date, input.weightKg],
      );
      return result.rows[0]!;
    },
    async delete(id) {
      const result = await db.query("DELETE FROM weight_records WHERE id = $1", [id]);
      return result.rowCount > 0;
    },
  };
};
