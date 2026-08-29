import { describe, expect, it } from "vitest";
import { graphql } from "graphql";
import { builder } from "./builder.js";
// T046で実装する(このテストは実装が無い間は失敗する)。TrainingSession型に
// calorieEstimate/totalVolumeフィールドが追加される想定。
import "./training.js";
import { createSeededTestDb } from "../test-support/seededTestDb.js";
import {
  createTrainingSessionRepository,
  type TrainingSessionRepository,
} from "../repositories/trainingSessionRepository.js";
import { createWeightRepository, type WeightRepository } from "../repositories/weightRepository.js";

type TestContext = {
  repositories: { training: TrainingSessionRepository; weight: WeightRepository };
};

const createTestContext = (): TestContext => {
  const db = createSeededTestDb();
  return {
    repositories: {
      training: createTrainingSessionRepository(db),
      weight: createWeightRepository(db),
    },
  };
};

const calorieQuery = `
  query Get($id: ID!) {
    trainingSession(id: $id) {
      totalVolume
      calorieEstimate {
        calories
        formula
        source
        assumedConstants {
          label
          value
          unit
        }
      }
    }
  }
`;

type CalorieQueryResult = {
  totalVolume: number;
  calorieEstimate: {
    calories: number | null;
    formula: string;
    source: string;
    assumedConstants: { label: string; value: number; unit: string }[];
  };
};

// 各テストで繰り返されていた「スキーマ構築 → クエリ実行 → 結果のキャスト」を
// まとめ、各テストは固有のセットアップと検証だけを書けばよいようにする。
const runCalorieQuery = async (
  contextValue: TestContext,
  sessionId: string,
): Promise<CalorieQueryResult> => {
  const schema = builder.toSchema();
  const result = await graphql({
    schema,
    contextValue,
    source: calorieQuery,
    variableValues: { id: sessionId },
  });
  expect(result.errors).toBeUndefined();
  return result.data?.trainingSession as CalorieQueryResult;
};

describe("TrainingSession.calorieEstimate / totalVolume", () => {
  it("直近の体重が記録されていれば消費カロリーを算出する", async () => {
    const contextValue = createTestContext();
    contextValue.repositories.weight.upsert({ date: "2026-01-01", weightKg: 70 });
    const session = contextValue.repositories.training.upsert({
      date: "2026-01-02",
      durationMinutes: 60,
      intensity: "MEDIUM",
      exerciseSets: [],
    });

    const { calorieEstimate } = await runCalorieQuery(contextValue, session.id);
    // 5.0 METs(中強度) * 70kg * 1h = 350kcal
    expect(calorieEstimate.calories).toBeCloseTo(350, 5);
  });

  it("体重記録が1件も無い場合はcaloriesがnullになる(算出不可、FR-011)", async () => {
    const contextValue = createTestContext();
    const session = contextValue.repositories.training.upsert({
      date: "2026-01-02",
      durationMinutes: 60,
      intensity: "MEDIUM",
      exerciseSets: [],
    });

    const { calorieEstimate } = await runCalorieQuery(contextValue, session.id);
    expect(calorieEstimate.calories).toBeNull();
  });

  it("セッション日付以前で最も新しい体重記録を使う(未来の体重は使わない)", async () => {
    const contextValue = createTestContext();
    contextValue.repositories.weight.upsert({ date: "2026-01-01", weightKg: 65 });
    contextValue.repositories.weight.upsert({ date: "2026-01-10", weightKg: 80 }); // セッションより後
    const session = contextValue.repositories.training.upsert({
      date: "2026-01-05",
      durationMinutes: 60,
      intensity: "MEDIUM",
      exerciseSets: [],
    });

    const { calorieEstimate } = await runCalorieQuery(contextValue, session.id);
    // 5.0 METs * 65kg(1/1時点の体重) * 1h = 325kcal (1/10の80kgは使わない)
    expect(calorieEstimate.calories).toBeCloseTo(325, 5);
  });

  it("算出根拠(計算式・定数・出典)が画面表示用に含まれる(原則VII)", async () => {
    const contextValue = createTestContext();
    contextValue.repositories.weight.upsert({ date: "2026-01-01", weightKg: 70 });
    const session = contextValue.repositories.training.upsert({
      date: "2026-01-02",
      durationMinutes: 60,
      intensity: "MEDIUM",
      exerciseSets: [],
    });

    const { calorieEstimate } = await runCalorieQuery(contextValue, session.id);
    expect(calorieEstimate.formula).toBeTruthy();
    expect(calorieEstimate.source).toBeTruthy();
    expect(calorieEstimate.assumedConstants.length).toBeGreaterThan(0);
  });

  it("種目記録から総ボリューム(重量×回数×セット)を算出する", async () => {
    const contextValue = createTestContext();
    const session = contextValue.repositories.training.upsert({
      date: "2026-01-02",
      durationMinutes: 60,
      intensity: "MEDIUM",
      exerciseSets: [
        { exerciseId: "bench-press", sets: 3, reps: 10, weightKg: 50 },
        { exerciseId: "squat", sets: 4, reps: 8, weightKg: 60 },
      ],
    });

    // 50*10*3 + 60*8*4 = 1500 + 1920 = 3420
    const { totalVolume } = await runCalorieQuery(contextValue, session.id);
    expect(totalVolume).toBe(3420);
  });
});
