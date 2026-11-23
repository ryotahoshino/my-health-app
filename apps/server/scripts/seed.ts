import { createPostgresDatabase } from "../src/db/postgresClient.js";
import { readDatabaseUrl } from "../src/db/databaseUrl.js";
import { runSeeds } from "../src/db/seed.js";

// 固定データ(種目マスタ・食材)の投入(CLI)。何度実行しても重複しない。

const main = async (): Promise<void> => {
  const db = createPostgresDatabase(readDatabaseUrl(process.env));
  try {
    await runSeeds(db);
    console.log("固定データ(種目マスタ・食材)を投入しました");
  } finally {
    await db.close();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
