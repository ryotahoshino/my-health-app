import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { builder } from "./schema/builder.js";
import "./schema/health.js";
import { getDb } from "./db/connection.js";
import { seedExerciseCatalog } from "./db/seed/exerciseCatalog.js";

const db = getDb();
seedExerciseCatalog(db);

const schema = builder.toSchema();
const yoga = createYoga({ schema });
const server = createServer(yoga);

const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => {
  console.log(`GraphQL server ready at http://localhost:${port}${yoga.graphqlEndpoint}`);
});
