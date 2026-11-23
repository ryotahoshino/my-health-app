import { readFileSync } from "node:fs";
import { createPostgresDatabase } from "../src/db/postgresClient.js";
import { readDatabaseUrl } from "../src/db/databaseUrl.js";
import { importRecords, type ExportedRecords } from "../src/db/importRecords.js";

// 書き出した記録(JSON)を新しい保存先に取り込む。1回限りの用途で、
// 何度実行しても重複しない(FR-016)。

const DEFAULT_INPUT = "./data/exported-records.json";

const main = async (): Promise<void> => {
  const input = process.env.EXPORT_PATH ?? DEFAULT_INPUT;
  const records = JSON.parse(readFileSync(input, "utf-8")) as ExportedRecords;

  const db = createPostgresDatabase(readDatabaseUrl(process.env));
  try {
    const counts = await importRecords(db, records);
    console.log(`${input} から取り込みました:`);
    console.log(`  体重記録: ${counts.weightRecords}件`);
    console.log(`  トレーニングのセッション: ${counts.trainingSessions}件`);
    console.log(`  種目内訳: ${counts.exerciseSets}件`);
    console.log(`  歩数記録: ${counts.stepRecords}件`);
  } finally {
    await db.close();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
