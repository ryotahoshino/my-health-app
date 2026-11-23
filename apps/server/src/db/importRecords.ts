import type { Database } from "./client.js";

// 既存データ(SQLite)から書き出した記録を取り込む処理。移行の1回限りの用途で、
// 移送の確認が済んだら削除する(contracts/migrations.md「既存データの移送」規則5)。
// 何度実行しても重複しないよう ON CONFLICT DO NOTHING で取り込む(FR-016)。

export type ExportedRecords = {
  weightRecords: { id: string; date: string; weightKg: number }[];
  trainingSessions: {
    id: string;
    date: string;
    durationMinutes: number;
    intensity: "LOW" | "MEDIUM" | "HIGH";
  }[];
  exerciseSets: {
    id: string;
    sessionId: string;
    exerciseId: string;
    sets: number;
    reps: number;
    weightKg: number;
  }[];
  stepRecords: { id: string; date: string; steps: number }[];
};

export type ImportCounts = {
  weightRecords: number;
  trainingSessions: number;
  exerciseSets: number;
  stepRecords: number;
};

export const importRecords = async (
  db: Database,
  records: ExportedRecords,
): Promise<ImportCounts> => {
  return db.transaction(async (tx) => {
    for (const record of records.weightRecords) {
      await tx.query(
        `INSERT INTO weight_records (id, date, weight_kg) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [record.id, record.date, record.weightKg],
      );
    }

    // 外部キーの順序を守るため、セッションを先に取り込む。
    for (const session of records.trainingSessions) {
      await tx.query(
        `INSERT INTO training_sessions (id, date, duration_minutes, intensity)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [session.id, session.date, session.durationMinutes, session.intensity],
      );
    }

    for (const exerciseSet of records.exerciseSets) {
      await tx.query(
        `INSERT INTO exercise_sets (id, session_id, exercise_id, sets, reps, weight_kg)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [
          exerciseSet.id,
          exerciseSet.sessionId,
          exerciseSet.exerciseId,
          exerciseSet.sets,
          exerciseSet.reps,
          exerciseSet.weightKg,
        ],
      );
    }

    for (const record of records.stepRecords) {
      await tx.query(
        `INSERT INTO step_records (id, date, steps) VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [record.id, record.date, record.steps],
      );
    }

    return {
      weightRecords: records.weightRecords.length,
      trainingSessions: records.trainingSessions.length,
      exerciseSets: records.exerciseSets.length,
      stepRecords: records.stepRecords.length,
    };
  });
};
