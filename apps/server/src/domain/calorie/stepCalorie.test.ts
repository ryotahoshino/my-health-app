import { describe, expect, it } from "vitest";
// T057で実装する(このテストは実装が無い間は失敗する)
import { calculateStepCalorie } from "./stepCalorie.js";

describe("calculateStepCalorie", () => {
  it("歩数6000歩・体重70kgの消費カロリーを算出する(METs 3.0、ケイデンス100歩/分)", () => {
    const result = calculateStepCalorie({ steps: 6000, weightKg: 70 });
    // 6000歩 ÷ 100歩/分 ÷ 60分/h = 1h。3.0 METs * 70kg * 1h = 210kcal
    expect(result.calories).toBeCloseTo(210, 5);
  });

  it("歩数3000歩・体重60kgの消費カロリーを算出する", () => {
    const result = calculateStepCalorie({ steps: 3000, weightKg: 60 });
    // 3000歩 ÷ 100歩/分 ÷ 60分/h = 0.5h。3.0 * 60 * 0.5 = 90kcal
    expect(result.calories).toBeCloseTo(90, 5);
  });

  it("歩数0の場合は消費カロリー0を返す", () => {
    const result = calculateStepCalorie({ steps: 0, weightKg: 70 });
    expect(result.calories).toBeCloseTo(0, 5);
  });

  it("体重が無い場合はcaloriesがnullになる(算出不可、FR-011)", () => {
    const result = calculateStepCalorie({ steps: 6000, weightKg: null });
    expect(result.calories).toBeNull();
  });

  it("体重が無い場合でも計算式・定数・出典は返す(原則VII)", () => {
    const result = calculateStepCalorie({ steps: 6000, weightKg: null });
    expect(result.formula).toBeTruthy();
    expect(result.source).toBeTruthy();
    expect(result.assumedConstants.length).toBeGreaterThan(0);
  });

  it("assumedConstantsに歩行のMETsとケイデンスが含まれる", () => {
    const result = calculateStepCalorie({ steps: 6000, weightKg: 70 });
    expect(result.assumedConstants.some((constant) => constant.value === 3.0)).toBe(true);
    expect(result.assumedConstants.some((constant) => constant.value === 100)).toBe(true);
  });
});
