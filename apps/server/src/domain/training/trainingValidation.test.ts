import { describe, expect, it } from "vitest";
// T034で実装する(このテストは実装が無い間は失敗する)
import { trainingSessionInputSchema } from "./trainingSchema.js";

const validSession = {
  date: "2026-01-01",
  durationMinutes: 60,
  intensity: "MEDIUM" as const,
  exerciseSets: [{ exerciseId: "bench-press", sets: 3, reps: 10, weightKg: 50 }],
};

describe("trainingSessionInputSchema", () => {
  it("有効な値を受け入れる", () => {
    expect(trainingSessionInputSchema.safeParse(validSession).success).toBe(true);
  });

  it("種目が0件でも受け入れる(セッションのみ先に記録できる)", () => {
    const result = trainingSessionInputSchema.safeParse({ ...validSession, exerciseSets: [] });
    expect(result.success).toBe(true);
  });

  it("境界値(実施時間1分・600分)を受け入れる", () => {
    expect(
      trainingSessionInputSchema.safeParse({ ...validSession, durationMinutes: 1 }).success,
    ).toBe(true);
    expect(
      trainingSessionInputSchema.safeParse({ ...validSession, durationMinutes: 600 }).success,
    ).toBe(true);
  });

  it("実施時間が範囲外(0分・601分)の場合は拒否する", () => {
    expect(
      trainingSessionInputSchema.safeParse({ ...validSession, durationMinutes: 0 }).success,
    ).toBe(false);
    expect(
      trainingSessionInputSchema.safeParse({ ...validSession, durationMinutes: 601 }).success,
    ).toBe(false);
  });

  it("実施時間が整数でない場合は拒否する", () => {
    expect(
      trainingSessionInputSchema.safeParse({ ...validSession, durationMinutes: 60.5 }).success,
    ).toBe(false);
  });

  it("不正な強度区分は拒否する", () => {
    const result = trainingSessionInputSchema.safeParse({ ...validSession, intensity: "EXTREME" });
    expect(result.success).toBe(false);
  });

  it("セット数が範囲外(0・21)の場合は拒否する", () => {
    expect(
      trainingSessionInputSchema.safeParse({
        ...validSession,
        exerciseSets: [{ exerciseId: "bench-press", sets: 0, reps: 10, weightKg: 50 }],
      }).success,
    ).toBe(false);
    expect(
      trainingSessionInputSchema.safeParse({
        ...validSession,
        exerciseSets: [{ exerciseId: "bench-press", sets: 21, reps: 10, weightKg: 50 }],
      }).success,
    ).toBe(false);
  });

  it("回数が範囲外(0・101)の場合は拒否する", () => {
    expect(
      trainingSessionInputSchema.safeParse({
        ...validSession,
        exerciseSets: [{ exerciseId: "bench-press", sets: 3, reps: 0, weightKg: 50 }],
      }).success,
    ).toBe(false);
    expect(
      trainingSessionInputSchema.safeParse({
        ...validSession,
        exerciseSets: [{ exerciseId: "bench-press", sets: 3, reps: 101, weightKg: 50 }],
      }).success,
    ).toBe(false);
  });

  it("重量が範囲外(-1kg・501kg)の場合は拒否する", () => {
    expect(
      trainingSessionInputSchema.safeParse({
        ...validSession,
        exerciseSets: [{ exerciseId: "bench-press", sets: 3, reps: 10, weightKg: -1 }],
      }).success,
    ).toBe(false);
    expect(
      trainingSessionInputSchema.safeParse({
        ...validSession,
        exerciseSets: [{ exerciseId: "bench-press", sets: 3, reps: 10, weightKg: 501 }],
      }).success,
    ).toBe(false);
  });

  it("重量は0.5kg刻みでない場合は拒否する", () => {
    expect(
      trainingSessionInputSchema.safeParse({
        ...validSession,
        exerciseSets: [{ exerciseId: "bench-press", sets: 3, reps: 10, weightKg: 50.3 }],
      }).success,
    ).toBe(false);
  });

  it("重量は0.5kg刻みの境界値(0kg・500kg・2.5kg)を受け入れる", () => {
    for (const weightKg of [0, 500, 2.5]) {
      expect(
        trainingSessionInputSchema.safeParse({
          ...validSession,
          exerciseSets: [{ exerciseId: "bench-press", sets: 3, reps: 10, weightKg }],
        }).success,
      ).toBe(true);
    }
  });
});
