import { createPostgresDatabase } from "../src/db/postgresClient.js";
import { readDatabaseUrl } from "../src/db/databaseUrl.js";
import { runMigrations } from "../src/db/migrate.js";

// スキーマ変更の適用(CLI)。アプリの起動経路からは実行しない(FR-010)。
// 接続情報は .env.local の DATABASE_URL から読む。

const main = async (): Promise<void> => {
  const db = createPostgresDatabase(readDatabaseUrl(process.env));
  try {
    const { applied } = await runMigrations(db);
    if (applied.length === 0) {
      console.log("適用する変更はありません(すべて適用済み)");
      return;
    }
    console.log(`${applied.length}件の変更を適用しました:`);
    for (const name of applied) {
      console.log(`  - ${name}`);
    }
  } finally {
    await db.close();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
