import { describe, expect, it } from "vitest";
import { graphql } from "graphql";
import { builder } from "./builder.js";
// T060で実装する(このテストは実装が無い間は失敗する)。副作用importで
// builderにQuery.stepRecords/dailyCalorieSummaries・
// Mutation.upsertStepRecord/deleteStepRecordを登録する想定。
import "./training.js";
import "./steps.js";
import { createSeededTestDb } from "../test-support/seededTestDb.js";
import {
  createTrainingSessionRepository,
  type TrainingSessionRepository,
} from "../repositories/trainingSessionRepository.js";
import { createWeightRepository, type WeightRepository } from "../repositories/weightRepository.js";
import {
  createStepRecordRepository,
  type StepRecordRepository,
} from "../repositories/stepRecordRepository.js";

type TestContext = {
  repositories: {
    training: TrainingSessionRepository;
    weight: WeightRepository;
    steps: StepRecordRepository;
  };
  today: string;
};

const createTestContext = (): TestContext => {
  const db = createSeededTestDb();
  return {
    repositories: {
      training: createTrainingSessionRepository(db),
      weight: createWeightRepository(db),
      steps: createStepRecordRepository(db),
    },
    today: "2026-01-02",
  };
};

describe("steps GraphQLスキーマ", () => {
  it("upsertStepRecordで作成した記録がstepRecordsに反映される", async () => {
    const schema = builder.toSchema();
    const contextValue = createTestContext();

    const upsertResult = await graphql({
      schema,
      contextValue,
      source: `mutation { upsertStepRecord(input: { date: "2026-01-01", steps: 8000 }) { id date steps } }`,
    });
    expect(upsertResult.errors).toBeUndefined();

    const listResult = await graphql({
      schema,
      contextValue,
      source: `{ stepRecords { date steps } }`,
    });
    expect(listResult.data?.stepRecords).toEqual([{ date: "2026-01-01", steps: 8000 }]);
  });

  it("deleteStepRecordで記録を削除できる", async () => {
    const schema = builder.toSchema();
    const contextValue = createTestContext();

    const upsertResult = await graphql({
      schema,
      contextValue,
      source: `mutation { upsertStepRecord(input: { date: "2026-01-01", steps: 8000 }) { id } }`,
    });
    const created = upsertResult.data?.upsertStepRecord as { id: string };

    const deleteResult = await graphql({
      schema,
      contextValue,
      source: `mutation Delete($id: ID!) { deleteStepRecord(id: $id) }`,
      variableValues: { id: created.id },
    });
    expect(deleteResult.data?.deleteStepRecord).toBe(true);

    const listResult = await graphql({ schema, contextValue, source: `{ stepRecords { id } }` });
    expect(listResult.data?.stepRecords).toEqual([]);
  });

  it("同一日付への再登録は上書きになる(FR-017)", async () => {
    const schema = builder.toSchema();
    const contextValue = createTestContext();

    await graphql({
      schema,
      contextValue,
      source: `mutation { upsertStepRecord(input: { date: "2026-01-01", steps: 8000 }) { id } }`,
    });
    await graphql({
      schema,
      contextValue,
      source: `mutation { upsertStepRecord(input: { date: "2026-01-01", steps: 9500 }) { id } }`,
    });

    const listResult = await graphql({
      schema,
      contextValue,
      source: `{ stepRecords { steps } }`,
    });
    expect(listResult.data?.stepRecords).toEqual([{ steps: 9500 }]);
  });

  it("範囲外の歩数はバリデーションエラーになる", async () => {
    const schema = builder.toSchema();
    const contextValue = createTestContext();

    const result = await graphql({
      schema,
      contextValue,
      source: `mutation { upsertStepRecord(input: { date: "2026-01-01", steps: 999999 }) { id } }`,
    });
    expect(result.errors).toBeDefined();
  });

  const dailySummariesQuery = `
    {
      dailyCalorieSummaries(period: DAILY) {
        date
        trainingCalories
        stepCalories
        totalCalories
        isApproximate
      }
    }
  `;

  it("歩数のみ記録された日は歩数分のみが反映される(トレーニング分は0)", async () => {
    const schema = builder.toSchema();
    const contextValue = createTestContext();
    contextValue.repositories.weight.upsert({ date: "2026-01-01", weightKg: 70 });
    contextValue.repositories.steps.upsert({ date: "2026-01-02", steps: 6000 });

    const result = await graphql({ schema, contextValue, source: dailySummariesQuery });
    expect(result.data?.dailyCalorieSummaries).toEqual([
      {
        date: "2026-01-02",
        trainingCalories: 0,
        stepCalories: 210,
        totalCalories: 210,
        isApproximate: true,
      },
    ]);
  });

  it("トレーニングと歩数の両方がある日は合算値が概算として表示される", async () => {
    const schema = builder.toSchema();
    const contextValue = createTestContext();
    contextValue.repositories.weight.upsert({ date: "2026-01-01", weightKg: 70 });
    contextValue.repositories.training.upsert({
      date: "2026-01-02",
      durationMinutes: 60,
      intensity: "MEDIUM",
      exerciseSets: [],
    });
    contextValue.repositories.steps.upsert({ date: "2026-01-02", steps: 6000 });

    const result = await graphql({ schema, contextValue, source: dailySummariesQuery });
    // トレーニング: 5.0 METs * 70kg * 1h = 350kcal、歩数: 3.0 METs * 70kg * 1h = 210kcal
    expect(result.data?.dailyCalorieSummaries).toEqual([
      {
        date: "2026-01-02",
        trainingCalories: 350,
        stepCalories: 210,
        totalCalories: 560,
        isApproximate: true,
      },
    ]);
  });

  it("体重未記録の場合はtrainingCalories/stepCalories/totalCaloriesがnullになる", async () => {
    const schema = builder.toSchema();
    const contextValue = createTestContext();
    contextValue.repositories.steps.upsert({ date: "2026-01-02", steps: 6000 });

    const result = await graphql({ schema, contextValue, source: dailySummariesQuery });
    expect(result.data?.dailyCalorieSummaries).toEqual([
      {
        date: "2026-01-02",
        trainingCalories: 0,
        stepCalories: null,
        totalCalories: null,
        isApproximate: true,
      },
    ]);
  });

  describe("dailyCalorieSummariesの期間集計(WEEKLY/MONTHLY、FR-016)", () => {
    it("WEEKLY指定で同一週内の消費カロリーを合算して返す", async () => {
      const schema = builder.toSchema();
      // 2026-01-05(月)始まりの週。today=2026-01-06(火、同じ週)に設定。
      const contextValue = createTestContext();
      contextValue.today = "2026-01-06";
      contextValue.repositories.weight.upsert({ date: "2026-01-05", weightKg: 70 });
      contextValue.repositories.training.upsert({
        date: "2026-01-05",
        durationMinutes: 60,
        intensity: "MEDIUM",
        exerciseSets: [],
      });
      contextValue.repositories.steps.upsert({ date: "2026-01-06", steps: 6000 });

      const result = await graphql({
        schema,
        contextValue,
        source: `
          {
            dailyCalorieSummaries(period: WEEKLY) {
              date
              periodLabel
              trainingCalories
              stepCalories
              totalCalories
              isApproximate
              stepCalorieEstimate { calories formula }
            }
          }
        `,
      });

      expect(result.errors).toBeUndefined();
      // トレーニング: 5.0 METs * 70kg * 1h = 350kcal、歩数: 3.0 METs * 70kg * 1h = 210kcal
      expect(result.data?.dailyCalorieSummaries).toEqual([
        {
          date: "2026-01-05",
          periodLabel: "2026-01-05週",
          trainingCalories: 350,
          stepCalories: 210,
          totalCalories: 560,
          isApproximate: true,
          stepCalorieEstimate: {
            calories: 210,
            formula: "消費カロリー(kcal) = METs × 体重(kg) × 実施時間(h)",
          },
        },
      ]);
    });

    it("記録が0件の場合は空配列を返す", async () => {
      const schema = builder.toSchema();
      const contextValue = createTestContext();

      const result = await graphql({
        schema,
        contextValue,
        source: `{ dailyCalorieSummaries(period: MONTHLY) { date } }`,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.dailyCalorieSummaries).toEqual([]);
    });
  });
});
