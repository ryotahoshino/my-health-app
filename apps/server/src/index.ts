import { createServer } from "node:http";
import { createApp } from "./app.js";
import { getTodayDateString } from "./schema/today.js";
import { createPostgresDatabase } from "./db/postgresClient.js";
import { readDatabaseUrl } from "./db/databaseUrl.js";

// 実行時の入口。接続の生成・アプリの組み立て・待ち受けだけを行う。
// スキーマの適用(migrate)と固定データの投入(seed)は CLI で行うため、
// ここでは書き込みを一切行わない(FR-010 / contracts/migrations.md)。
const db = createPostgresDatabase(readDatabaseUrl(process.env));

const yoga = createApp({ db, today: getTodayDateString });
const server = createServer(yoga);

const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => {
  console.log(`GraphQL server ready at http://localhost:${port}${yoga.graphqlEndpoint}`);
});
