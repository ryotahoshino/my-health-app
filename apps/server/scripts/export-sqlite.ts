import SqliteDatabase from "better-sqlite3";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ExportedRecords } from "../src/db/importRecords.js";

// 移行前のローカルデータ(SQLite)から利用者の記録を書き出す。1回限りの用途。
// 元のファイルは読み取り専用で開き、書き換えない(FR-017)。
// 固定データ(種目マスタ・食材)は投入処理で再生成するため対象外(data-model.md #5)。

const DEFAULT_SOURCE = "./data/health-app.db";
const DEFAULT_OUTPUT = "./data/exported-records.json";

const main = (): void => {
  const source = process.env.SQLITE_PATH ?? DEFAULT_SOURCE;
  const output = process.env.EXPORT_PATH ?? DEFAULT_OUTPUT;

  const db = new SqliteDatabase(source, { readonly: true, fileMustExist: true });
  try {
    const records: ExportedRecords = {
      weightRecords: db
        .prepare("SELECT id, date, weight_kg AS weightKg FROM weight_records ORDER BY date")
        .all() as ExportedRecords["weightRecords"],
      trainingSessions: db
        .prepare(
          "SELECT id, date, duration_minutes AS durationMinutes, intensity FROM training_sessions ORDER BY date",
        )
        .all() as ExportedRecords["trainingSessions"],
      exerciseSets: db
        .prepare(
          "SELECT id, session_id AS sessionId, exercise_id AS exerciseId, sets, reps, weight_kg AS weightKg FROM exercise_sets ORDER BY id",
        )
        .all() as ExportedRecords["exerciseSets"],
      stepRecords: db
        .prepare("SELECT id, date, steps FROM step_records ORDER BY date")
        .all() as ExportedRecords["stepRecords"],
    };

    mkdirSync(dirname(join(process.cwd(), output)), { recursive: true });
    writeFileSync(output, JSON.stringify(records, null, 2), "utf-8");

    console.log(`${output} に書き出しました:`);
    console.log(`  体重記録: ${records.weightRecords.length}件`);
    console.log(`  トレーニングのセッション: ${records.trainingSessions.length}件`);
    console.log(`  種目内訳: ${records.exerciseSets.length}件`);
    console.log(`  歩数記録: ${records.stepRecords.length}件`);
  } finally {
    db.close();
  }
};

main();
