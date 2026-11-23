import { randomUUID } from "node:crypto";
import type { SqlExecutor } from "../db/client.js";

export type StepRecord = {
  id: string;
  date: string;
  steps: number;
};

export type StepRecordRepository = {
  list(): Promise<StepRecord[]>;
  findByDate(date: string): Promise<StepRecord | undefined>;
  upsert(input: { date: string; steps: number }): Promise<StepRecord>;
  delete(id: string): Promise<boolean>;
};

// 外部I/O(DBアクセス)をこのファイルの端に閉じ込め、呼び出し側は
// StepRecordRepositoryインターフェースにのみ依存する(原則V・VI)。
export const createStepRecordRepository = (db: SqlExecutor): StepRecordRepository => {
  return {
    async list() {
      const result = await db.query<StepRecord>(
        "SELECT id, date, steps FROM step_records ORDER BY date ASC",
      );
      return result.rows;
    },
    async findByDate(date) {
      const result = await db.query<StepRecord>(
        "SELECT id, date, steps FROM step_records WHERE date = $1",
        [date],
      );
      return result.rows[0];
    },
    async upsert(input) {
      // 同一日付への保存は既存レコードの上書きとする(FR-017)。
      const result = await db.query<StepRecord>(
        `INSERT INTO step_records (id, date, steps)
         VALUES ($1, $2, $3)
         ON CONFLICT (date) DO UPDATE SET steps = excluded.steps
         RETURNING id, date, steps`,
        [randomUUID(), input.date, input.steps],
      );
      return result.rows[0]!;
    },
    async delete(id) {
      const result = await db.query("DELETE FROM step_records WHERE id = $1", [id]);
      return result.rowCount > 0;
    },
  };
};
