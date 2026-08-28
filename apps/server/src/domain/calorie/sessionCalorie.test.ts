import { describe, expect, it } from "vitest";
// T044で実装する(このテストは実装が無い間は失敗する)
import { calculateSessionCalorie } from "./sessionCalorie.js";

describe("calculateSessionCalorie", () => {
  it("中強度・体重70kg・実施時間60分の消費カロリーを算出する(METs 5.0)", () => {
    const result = calculateSessionCalorie({
      intensity: "MEDIUM",
      durationMinutes: 60,
      weightKg: 70,
    });
    // 5.0 METs * 70kg * 1h = 350kcal
    expect(result.calories).toBeCloseTo(350, 5);
  });

  it("低強度・体重60kg・実施時間30分の消費カロリーを算出する(METs 3.0)", () => {
    const result = calculateSessionCalorie({
      intensity: "LOW",
      durationMinutes: 30,
      weightKg: 60,
    });
    // 3.0 METs * 60kg * 0.5h = 90kcal
    expect(result.calories).toBeCloseTo(90, 5);
  });

  it("高強度・体重80kg・実施時間90分の消費カロリーを算出する(METs 8.0)", () => {
    const result = calculateSessionCalorie({
      intensity: "HIGH",
      durationMinutes: 90,
      weightKg: 80,
    });
    // 8.0 METs * 80kg * 1.5h = 960kcal
    expect(result.calories).toBeCloseTo(960, 5);
  });

  it("体重が無い場合はcaloriesがnullになる(算出不可、FR-011)", () => {
    const result = calculateSessionCalorie({
      intensity: "MEDIUM",
      durationMinutes: 60,
      weightKg: null,
    });
    expect(result.calories).toBeNull();
  });

  it("体重が無い場合でも計算式・定数・出典は返す(原則VII)", () => {
    const result = calculateSessionCalorie({
      intensity: "MEDIUM",
      durationMinutes: 60,
      weightKg: null,
    });
    expect(result.formula).toBeTruthy();
    expect(result.source).toBeTruthy();
    expect(result.assumedConstants.length).toBeGreaterThan(0);
  });

  it("assumedConstantsに強度区分に対応するMETs値が含まれる", () => {
    const result = calculateSessionCalorie({
      intensity: "HIGH",
      durationMinutes: 60,
      weightKg: 70,
    });
    expect(result.assumedConstants.some((constant) => constant.value === 8.0)).toBe(true);
  });

  it("出典は国立健康・栄養研究所のメッツ表を明示する", () => {
    const result = calculateSessionCalorie({
      intensity: "MEDIUM",
      durationMinutes: 60,
      weightKg: 70,
    });
    expect(result.source).toContain("メッツ");
  });
});
