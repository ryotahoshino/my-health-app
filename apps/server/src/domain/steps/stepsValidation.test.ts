import { describe, expect, it } from "vitest";
// T056で実装する(このテストは実装が無い間は失敗する)
import { stepRecordInputSchema } from "./stepsSchema.js";

describe("stepRecordInputSchema", () => {
  it("有効な値を受け入れる", () => {
    expect(stepRecordInputSchema.safeParse({ date: "2026-01-01", steps: 8000 }).success).toBe(true);
  });

  it("境界値(0歩・100,000歩)を受け入れる", () => {
    expect(stepRecordInputSchema.safeParse({ date: "2026-01-01", steps: 0 }).success).toBe(true);
    expect(stepRecordInputSchema.safeParse({ date: "2026-01-01", steps: 100000 }).success).toBe(
      true,
    );
  });

  it("歩数が範囲外(-1・100,001)の場合は拒否する", () => {
    expect(stepRecordInputSchema.safeParse({ date: "2026-01-01", steps: -1 }).success).toBe(false);
    expect(stepRecordInputSchema.safeParse({ date: "2026-01-01", steps: 100001 }).success).toBe(
      false,
    );
  });

  it("歩数が整数でない場合は拒否する", () => {
    expect(stepRecordInputSchema.safeParse({ date: "2026-01-01", steps: 100.5 }).success).toBe(
      false,
    );
  });

  it("日付がYYYY-MM-DD形式でない場合は拒否する", () => {
    expect(stepRecordInputSchema.safeParse({ date: "2026/01/01", steps: 8000 }).success).toBe(
      false,
    );
  });

  it("必須項目が欠けている場合は拒否する", () => {
    expect(stepRecordInputSchema.safeParse({ steps: 8000 }).success).toBe(false);
    expect(stepRecordInputSchema.safeParse({ date: "2026-01-01" }).success).toBe(false);
  });
});
