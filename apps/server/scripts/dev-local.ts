import { createServer } from "node:http";
import { createApp } from "../src/app.js";
import { getTodayDateString } from "../src/schema/today.js";
import { createPgliteDatabase } from "../src/db/pgliteClient.js";
import { runMigrations } from "../src/db/migrate.js";
import { runSeeds } from "../src/db/seed.js";

// ネットワークに接続せずにローカルで動かすための起動経路(FR-020)。
// 保存先はファイルに永続化する PGlite で、データは apps/server/data/local-pgdata に残る。
// 本番の入口(src/index.ts)と違い、スキーマの適用と固定データの投入もここで行う
// (手元で1コマンドで動かせることを優先する。共有DBに対しては CLI を使う)。

const DATA_DIRECTORY = "./data/local-pgdata";

const main = async (): Promise<void> => {
  const db = createPgliteDatabase(DATA_DIRECTORY);
  await runMigrations(db);
  await runSeeds(db);

  const yoga = createApp({ db, today: getTodayDateString });
  const server = createServer(yoga);

  const port = Number(process.env.PORT ?? 4000);
  server.listen(port, () => {
    console.log(`GraphQL server ready at http://localhost:${port}${yoga.graphqlEndpoint}`);
    console.log(`保存先(ローカル): ${DATA_DIRECTORY}`);
  });
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
