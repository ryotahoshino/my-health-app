import { describe, expect, it } from "vitest";
// T021で実装する(このテストは実装が無い間は失敗する)
import { weightRecordInputSchema } from "./weightSchema.js";

describe("weightRecordInputSchema", () => {
  it("有効な値を受け入れる", () => {
    const result = weightRecordInputSchema.safeParse({ date: "2026-01-01", weightKg: 68.5 });
    expect(result.success).toBe(true);
  });

  it("境界値(20.0kg, 300.0kg)を受け入れる", () => {
    expect(weightRecordInputSchema.safeParse({ date: "2026-01-01", weightKg: 20.0 }).success).toBe(
      true,
    );
    expect(weightRecordInputSchema.safeParse({ date: "2026-01-01", weightKg: 300.0 }).success).toBe(
      true,
    );
  });

  it("下限(20.0kg)未満を拒否する", () => {
    const result = weightRecordInputSchema.safeParse({ date: "2026-01-01", weightKg: 19.9 });
    expect(result.success).toBe(false);
  });

  it("上限(300.0kg)を超える値を拒否する", () => {
    const result = weightRecordInputSchema.safeParse({ date: "2026-01-01", weightKg: 300.1 });
    expect(result.success).toBe(false);
  });

  it("小数点第2位以下を拒否する", () => {
    const result = weightRecordInputSchema.safeParse({ date: "2026-01-01", weightKg: 68.55 });
    expect(result.success).toBe(false);
  });

  it("日付がYYYY-MM-DD形式でない場合は拒否する", () => {
    const result = weightRecordInputSchema.safeParse({ date: "2026/01/01", weightKg: 68.5 });
    expect(result.success).toBe(false);
  });

  it("必須項目が欠けている場合は拒否する", () => {
    expect(weightRecordInputSchema.safeParse({ weightKg: 68.5 }).success).toBe(false);
    expect(weightRecordInputSchema.safeParse({ date: "2026-01-01" }).success).toBe(false);
  });
});
