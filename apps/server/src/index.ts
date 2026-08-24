import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { builder } from "./schema/builder.js";
import "./schema/health.js";
import "./schema/weight.js";
import "./schema/exerciseCatalog.js";
import "./schema/training.js";
import type { GraphQLContext } from "./schema/context.js";
import { getDb } from "./db/connection.js";
import { seedExerciseCatalog } from "./db/seed/exerciseCatalog.js";
import { createWeightRepository } from "./repositories/weightRepository.js";
import { createTrainingSessionRepository } from "./repositories/trainingSessionRepository.js";

const db = getDb();
seedExerciseCatalog(db);

const weightRepository = createWeightRepository(db);
const trainingRepository = createTrainingSessionRepository(db);

const schema = builder.toSchema();
const yoga = createYoga({
  schema,
  context: (): GraphQLContext => ({
    repositories: { weight: weightRepository, training: trainingRepository },
  }),
});
const server = createServer(yoga);

const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => {
  console.log(`GraphQL server ready at http://localhost:${port}${yoga.graphqlEndpoint}`);
});
