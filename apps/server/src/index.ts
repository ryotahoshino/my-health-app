import { createServer } from "node:http";
import { createApp } from "./app.js";
import { getTodayDateString } from "./schema/today.js";
import { getDb } from "./db/connection.js";
import { seedExerciseCatalog } from "./db/seed/exerciseCatalog.js";
import { seedFoodItems } from "./db/seed/foodItems.js";

// 実行時の入口。実DBの接続・シード・アプリの組み立て・待ち受けだけを行い、
// スキーマやリポジトリの組み立ては app.ts に任せる(contracts/api-injection.md)。
const db = getDb();
seedExerciseCatalog(db);
seedFoodItems(db);

const yoga = createApp({ db, today: getTodayDateString });
const server = createServer(yoga);

const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => {
  console.log(`GraphQL server ready at http://localhost:${port}${yoga.graphqlEndpoint}`);
});
