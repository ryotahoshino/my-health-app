import { describe, expect, it } from "vitest";
// T058で実装する(このテストは実装が無い間は失敗する)
import { calculateDailyCalorieSummary } from "./dailySummary.js";

describe("calculateDailyCalorieSummary", () => {
  it("トレーニング分と歩数分を合算する", () => {
    const result = calculateDailyCalorieSummary({ trainingCalories: 350, stepCalories: 210 });
    expect(result.totalCalories).toBeCloseTo(560, 5);
  });

  it("常にisApproximateがtrueになる(トレーニング中歩数との重複可能性、FR-014)", () => {
    const result = calculateDailyCalorieSummary({ trainingCalories: 350, stepCalories: 210 });
    expect(result.isApproximate).toBe(true);
  });

  it("トレーニング分がnull(体重未記録等)の場合はtotalCaloriesもnullになる", () => {
    const result = calculateDailyCalorieSummary({ trainingCalories: null, stepCalories: 210 });
    expect(result.totalCalories).toBeNull();
  });

  it("歩数分がnullの場合はtotalCaloriesもnullになる", () => {
    const result = calculateDailyCalorieSummary({ trainingCalories: 350, stepCalories: null });
    expect(result.totalCalories).toBeNull();
  });

  it("両方が0の場合はtotalCaloriesも0になる(nullとは区別する)", () => {
    const result = calculateDailyCalorieSummary({ trainingCalories: 0, stepCalories: 0 });
    expect(result.totalCalories).toBe(0);
  });

  it("入力のtrainingCalories/stepCaloriesをそのまま結果にも含める", () => {
    const result = calculateDailyCalorieSummary({ trainingCalories: 350, stepCalories: 210 });
    expect(result.trainingCalories).toBe(350);
    expect(result.stepCalories).toBe(210);
  });
});
