import { describe, expect, it } from "vitest";
import { graphql } from "graphql";
import { builder } from "./builder.js";
// T036で実装する(このテストは実装が無い間は失敗する)。副作用importで
// builderにQuery.trainingSessions/trainingSession・
// Mutation.upsertTrainingSession/deleteTrainingSessionを登録する想定。
import "./training.js";
import { createConnection } from "../db/connection.js";
import { seedExerciseCatalog } from "../db/seed/exerciseCatalog.js";
import {
  createTrainingSessionRepository,
  type TrainingSessionRepository,
} from "../repositories/trainingSessionRepository.js";

// GraphQL Yogaのcontextに渡す形と合わせる想定の契約(T036でindex.ts側も更新する)。
interface TestContext {
  repositories: { training: TrainingSessionRepository };
}

const createTestContext = (): TestContext => {
  const db = createConnection(":memory:");
  seedExerciseCatalog(db);
  return { repositories: { training: createTrainingSessionRepository(db) } };
};

const upsertMutation = `
  mutation Upsert($input: UpsertTrainingSessionInput!) {
    upsertTrainingSession(input: $input) {
      id
      date
      durationMinutes
      intensity
      exerciseSets {
        id
        exerciseId
        sets
        reps
        weightKg
      }
    }
  }
`;

const baseInput = {
  date: "2026-01-01",
  durationMinutes: 60,
  intensity: "MEDIUM",
  exerciseSets: [{ exerciseId: "bench-press", sets: 3, reps: 10, weightKg: 50 }],
};

describe("training GraphQLスキーマ", () => {
  it("upsertTrainingSessionで作成したセッションがtrainingSessionsに反映される", async () => {
    const schema = builder.toSchema();
    const contextValue = createTestContext();

    const upsertResult = await graphql({
      schema,
      contextValue,
      source: upsertMutation,
      variableValues: { input: baseInput },
    });
    expect(upsertResult.errors).toBeUndefined();

    const listResult = await graphql({
      schema,
      contextValue,
      source: `{ trainingSessions { date durationMinutes intensity exerciseSets { exerciseId } } }`,
    });
    expect(listResult.errors).toBeUndefined();
    expect(listResult.data?.trainingSessions).toEqual([
      {
        date: "2026-01-01",
        durationMinutes: 60,
        intensity: "MEDIUM",
        exerciseSets: [{ exerciseId: "bench-press" }],
      },
    ]);
  });

  it("trainingSession(id)で単体のセッションを取得できる", async () => {
    const schema = builder.toSchema();
    const contextValue = createTestContext();

    const upsertResult = await graphql({
      schema,
      contextValue,
      source: upsertMutation,
      variableValues: { input: baseInput },
    });
    const created = upsertResult.data?.upsertTrainingSession as { id: string };

    const getResult = await graphql({
      schema,
      contextValue,
      source: `query Get($id: ID!) { trainingSession(id: $id) { id date } }`,
      variableValues: { id: created.id },
    });
    expect(getResult.data?.trainingSession).toEqual({ id: created.id, date: "2026-01-01" });
  });

  it("deleteTrainingSessionでセッションを削除できる", async () => {
    const schema = builder.toSchema();
    const contextValue = createTestContext();

    const upsertResult = await graphql({
      schema,
      contextValue,
      source: upsertMutation,
      variableValues: { input: baseInput },
    });
    const created = upsertResult.data?.upsertTrainingSession as { id: string };

    const deleteResult = await graphql({
      schema,
      contextValue,
      source: `mutation Delete($id: ID!) { deleteTrainingSession(id: $id) }`,
      variableValues: { id: created.id },
    });
    expect(deleteResult.data?.deleteTrainingSession).toBe(true);

    const listResult = await graphql({
      schema,
      contextValue,
      source: `{ trainingSessions { id } }`,
    });
    expect(listResult.data?.trainingSessions).toEqual([]);
  });

  it("同一日付への再登録は上書きになる(FR-017)", async () => {
    const schema = builder.toSchema();
    const contextValue = createTestContext();

    await graphql({
      schema,
      contextValue,
      source: upsertMutation,
      variableValues: { input: baseInput },
    });
    await graphql({
      schema,
      contextValue,
      source: upsertMutation,
      variableValues: { input: { ...baseInput, durationMinutes: 45 } },
    });

    const listResult = await graphql({
      schema,
      contextValue,
      source: `{ trainingSessions { durationMinutes } }`,
    });
    expect(listResult.data?.trainingSessions).toEqual([{ durationMinutes: 45 }]);
  });

  it("範囲外の実施時間はバリデーションエラーになる", async () => {
    const schema = builder.toSchema();
    const contextValue = createTestContext();

    const result = await graphql({
      schema,
      contextValue,
      source: upsertMutation,
      variableValues: { input: { ...baseInput, durationMinutes: 9999 } },
    });
    expect(result.errors).toBeDefined();
  });
});
