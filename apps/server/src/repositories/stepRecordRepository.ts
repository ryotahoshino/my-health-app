import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

export type StepRecord = {
  id: string;
  date: string;
  steps: number;
};

export type StepRecordRepository = {
  list(): StepRecord[];
  findByDate(date: string): StepRecord | undefined;
  upsert(input: { date: string; steps: number }): StepRecord;
  delete(id: string): boolean;
};

// 外部I/O(DBアクセス)をこのファイルの端に閉じ込め、呼び出し側は
// StepRecordRepositoryインターフェースにのみ依存する(原則V・VI)。
export const createStepRecordRepository = (db: Database.Database): StepRecordRepository => {
  const listStatement = db.prepare("SELECT id, date, steps FROM step_records ORDER BY date ASC");
  const findByDateStatement = db.prepare("SELECT id, date, steps FROM step_records WHERE date = ?");
  const insertStatement = db.prepare(
    "INSERT INTO step_records (id, date, steps) VALUES (@id, @date, @steps)",
  );
  const updateStatement = db.prepare("UPDATE step_records SET steps = @steps WHERE id = @id");
  const deleteStatement = db.prepare("DELETE FROM step_records WHERE id = ?");

  return {
    list() {
      return listStatement.all() as StepRecord[];
    },
    findByDate(date) {
      return findByDateStatement.get(date) as StepRecord | undefined;
    },
    upsert(input) {
      // 同一日付への保存は既存レコードの上書きとする(FR-017)。
      const existing = findByDateStatement.get(input.date) as StepRecord | undefined;
      if (existing) {
        updateStatement.run({ id: existing.id, steps: input.steps });
        return { id: existing.id, date: input.date, steps: input.steps };
      }
      const id = randomUUID();
      insertStatement.run({ id, date: input.date, steps: input.steps });
      return { id, date: input.date, steps: input.steps };
    },
    delete(id) {
      const result = deleteStatement.run(id);
      return result.changes > 0;
    },
  };
};
