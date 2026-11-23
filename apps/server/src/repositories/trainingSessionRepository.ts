import { randomUUID } from "node:crypto";
import type { Database, SqlExecutor } from "../db/client.js";

export type ExerciseSet = {
  id: string;
  exerciseId: string;
  sets: number;
  reps: number;
  weightKg: number;
};

export type TrainingSession = {
  id: string;
  date: string;
  durationMinutes: number;
  intensity: "LOW" | "MEDIUM" | "HIGH";
  exerciseSets: ExerciseSet[];
};

export type TrainingSessionInput = {
  date: string;
  durationMinutes: number;
  intensity: "LOW" | "MEDIUM" | "HIGH";
  exerciseSets: { exerciseId: string; sets: number; reps: number; weightKg: number }[];
};

export type TrainingSessionRepository = {
  list(): Promise<TrainingSession[]>;
  get(id: string): Promise<TrainingSession | undefined>;
  upsert(input: TrainingSessionInput): Promise<TrainingSession>;
  delete(id: string): Promise<boolean>;
};

type SessionRow = {
  id: string;
  date: string;
  durationMinutes: number;
  intensity: "LOW" | "MEDIUM" | "HIGH";
};

const SESSION_COLUMNS = `id, date, duration_minutes AS "durationMinutes", intensity`;

const SET_COLUMNS = `id, exercise_id AS "exerciseId", sets, reps, weight_kg AS "weightKg"`;

const listExerciseSets = async (
  executor: SqlExecutor,
  sessionId: string,
): Promise<ExerciseSet[]> => {
  const result = await executor.query<ExerciseSet>(
    `SELECT ${SET_COLUMNS} FROM exercise_sets WHERE session_id = $1 ORDER BY id ASC`,
    [sessionId],
  );
  return result.rows;
};

const attachExerciseSets = async (
  executor: SqlExecutor,
  session: SessionRow,
): Promise<TrainingSession> => ({
  ...session,
  exerciseSets: await listExerciseSets(executor, session.id),
});

// 外部I/O(DBアクセス)をこのファイルの端に閉じ込め、呼び出し側は
// TrainingSessionRepositoryインターフェースにのみ依存する(原則V・VI)。
// セッションと種目内訳はまとめて置き換えるため、トランザクションを使う。
export const createTrainingSessionRepository = (db: Database): TrainingSessionRepository => {
  const findSessionById = async (
    executor: SqlExecutor,
    id: string,
  ): Promise<SessionRow | undefined> => {
    const result = await executor.query<SessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM training_sessions WHERE id = $1`,
      [id],
    );
    return result.rows[0];
  };

  return {
    async list() {
      const sessions = await db.query<SessionRow>(
        `SELECT ${SESSION_COLUMNS} FROM training_sessions ORDER BY date ASC`,
      );
      return Promise.all(sessions.rows.map((session) => attachExerciseSets(db, session)));
    },
    async get(id) {
      const session = await findSessionById(db, id);
      if (session) {
        return attachExerciseSets(db, session);
      }
      return undefined;
    },
    async upsert(input) {
      return db.transaction(async (tx) => {
        // 同一日付への保存は既存セッションの上書きとし、種目一覧も丸ごと置き換える(FR-017)。
        const session = await tx.query<SessionRow>(
          `INSERT INTO training_sessions (id, date, duration_minutes, intensity)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (date) DO UPDATE
             SET duration_minutes = excluded.duration_minutes, intensity = excluded.intensity
           RETURNING ${SESSION_COLUMNS}`,
          [randomUUID(), input.date, input.durationMinutes, input.intensity],
        );
        const saved = session.rows[0]!;

        await tx.query("DELETE FROM exercise_sets WHERE session_id = $1", [saved.id]);
        for (const exerciseSet of input.exerciseSets) {
          await tx.query(
            `INSERT INTO exercise_sets (id, session_id, exercise_id, sets, reps, weight_kg)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              randomUUID(),
              saved.id,
              exerciseSet.exerciseId,
              exerciseSet.sets,
              exerciseSet.reps,
              exerciseSet.weightKg,
            ],
          );
        }

        return attachExerciseSets(tx, saved);
      });
    },
    async delete(id) {
      // 種目内訳は外部キーの ON DELETE CASCADE で一緒に削除される(INV-2)。
      const result = await db.query("DELETE FROM training_sessions WHERE id = $1", [id]);
      return result.rowCount > 0;
    },
  };
};
