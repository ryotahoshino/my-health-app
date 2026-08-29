import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

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
  list(): TrainingSession[];
  get(id: string): TrainingSession | undefined;
  upsert(input: TrainingSessionInput): TrainingSession;
  delete(id: string): boolean;
};

type SessionRow = {
  id: string;
  date: string;
  durationMinutes: number;
  intensity: "LOW" | "MEDIUM" | "HIGH";
};

// 外部I/O(DBアクセス)をこのファイルの端に閉じ込め、呼び出し側は
// TrainingSessionRepositoryインターフェースにのみ依存する(原則V・VI)。
export const createTrainingSessionRepository = (
  db: Database.Database,
): TrainingSessionRepository => {
  const listSessionsStatement = db.prepare(
    "SELECT id, date, duration_minutes AS durationMinutes, intensity FROM training_sessions ORDER BY date ASC",
  );
  const findSessionByIdStatement = db.prepare(
    "SELECT id, date, duration_minutes AS durationMinutes, intensity FROM training_sessions WHERE id = ?",
  );
  const findSessionByDateStatement = db.prepare(
    "SELECT id, date, duration_minutes AS durationMinutes, intensity FROM training_sessions WHERE date = ?",
  );
  const insertSessionStatement = db.prepare(
    "INSERT INTO training_sessions (id, date, duration_minutes, intensity) VALUES (@id, @date, @durationMinutes, @intensity)",
  );
  const updateSessionStatement = db.prepare(
    "UPDATE training_sessions SET duration_minutes = @durationMinutes, intensity = @intensity WHERE id = @id",
  );
  const deleteSessionStatement = db.prepare("DELETE FROM training_sessions WHERE id = ?");
  const listExerciseSetsStatement = db.prepare(
    "SELECT id, exercise_id AS exerciseId, sets, reps, weight_kg AS weightKg FROM exercise_sets WHERE session_id = ?",
  );
  const deleteExerciseSetsBySessionStatement = db.prepare(
    "DELETE FROM exercise_sets WHERE session_id = ?",
  );
  const insertExerciseSetStatement = db.prepare(
    "INSERT INTO exercise_sets (id, session_id, exercise_id, sets, reps, weight_kg) VALUES (@id, @sessionId, @exerciseId, @sets, @reps, @weightKg)",
  );

  const attachExerciseSets = (session: SessionRow): TrainingSession => ({
    ...session,
    exerciseSets: listExerciseSetsStatement.all(session.id) as ExerciseSet[],
  });

  const replaceExerciseSets = (
    sessionId: string,
    exerciseSets: TrainingSessionInput["exerciseSets"],
  ): void => {
    deleteExerciseSetsBySessionStatement.run(sessionId);
    for (const exerciseSet of exerciseSets) {
      insertExerciseSetStatement.run({ id: randomUUID(), sessionId, ...exerciseSet });
    }
  };

  const upsertTransaction = db.transaction((input: TrainingSessionInput): TrainingSession => {
    const existing = findSessionByDateStatement.get(input.date) as SessionRow | undefined;
    const sessionId = existing?.id ?? randomUUID();

    if (existing) {
      updateSessionStatement.run({
        id: sessionId,
        durationMinutes: input.durationMinutes,
        intensity: input.intensity,
      });
    } else {
      insertSessionStatement.run({
        id: sessionId,
        date: input.date,
        durationMinutes: input.durationMinutes,
        intensity: input.intensity,
      });
    }
    // 同一日付への保存は既存セッションの上書きとし、種目一覧も丸ごと置き換える(FR-017)。
    replaceExerciseSets(sessionId, input.exerciseSets);

    return attachExerciseSets(findSessionByIdStatement.get(sessionId) as SessionRow);
  });

  return {
    list() {
      return (listSessionsStatement.all() as SessionRow[]).map(attachExerciseSets);
    },
    get(id) {
      const session = findSessionByIdStatement.get(id) as SessionRow | undefined;
      if (session) {
        return attachExerciseSets(session);
      }
      return undefined;
    },
    upsert(input) {
      return upsertTransaction(input);
    },
    delete(id) {
      const result = deleteSessionStatement.run(id);
      return result.changes > 0;
    },
  };
};
