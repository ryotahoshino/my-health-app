import { createYoga } from "graphql-yoga";
import type Database from "better-sqlite3";
import { builder } from "./schema/builder.js";
import "./schema/health.js";
import "./schema/weight.js";
import "./schema/exerciseCatalog.js";
import "./schema/training.js";
import "./schema/steps.js";
import "./schema/foodItems.js";
import type { GraphQLContext } from "./schema/context.js";
import { createWeightRepository } from "./repositories/weightRepository.js";
import { createTrainingSessionRepository } from "./repositories/trainingSessionRepository.js";
import { createStepRecordRepository } from "./repositories/stepRecordRepository.js";

export type CreateAppOptions = {
  db: Database.Database;
  // 当日の日付(YYYY-MM-DD)を返す関数。リクエストごとに評価するため関数で受け取る。
  // 実行時はシステムクロックを読む実装、テストは固定値を返す実装を渡す(憲法 原則V)。
  today: () => string;
};

// DBと時計を注入して GraphQL Yoga を組み立てるだけの関数。待ち受けは index.ts が行う。
// この分離により、一時DBと固定の日付を注入して HTTP 経由で検証できる
// (contracts/api-injection.md「サーバー」/ SC-016)。
export const createApp = ({ db, today }: CreateAppOptions) => {
  const weightRepository = createWeightRepository(db);
  const trainingRepository = createTrainingSessionRepository(db);
  const stepRepository = createStepRecordRepository(db);

  return createYoga({
    schema: builder.toSchema(),
    context: (): GraphQLContext => ({
      repositories: {
        weight: weightRepository,
        training: trainingRepository,
        steps: stepRepository,
      },
      today: today(),
    }),
  });
};
