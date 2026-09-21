import { describe, expect, it } from "vitest";
// T028 で実装する(このテストは実装が無い間は失敗する)。
// 契約: contracts/api-injection.md「フェイク」
import { createFakeApiClient } from "./createFakeApiClient";

describe("createFakeApiClient", () => {
  it("上書きしたメソッドは指定の値を返す", async () => {
    const api = createFakeApiClient({
      WeightRecords: async () => ({
        weightRecords: [{ id: "1", date: "2026-01-01", weightKg: 68.5 }],
      }),
    });

    await expect(api.WeightRecords()).resolves.toEqual({
      weightRecords: [{ id: "1", date: "2026-01-01", weightKg: 68.5 }],
    });
  });

  // 画面テストが意図しない API 呼び出しに気づけるようにするため、
  // 用意していないメソッドは黙って undefined を返さずエラーにする。
  it("上書きしていないメソッドは、メソッド名を含むエラーで失敗する", () => {
    const api = createFakeApiClient({});

    expect(() => api.TrainingSessions()).toThrow(/TrainingSessions/);
  });

  it("上書きしていないメソッドを持っていないことにはしない(呼び出しの形は保つ)", () => {
    const api = createFakeApiClient({});

    expect(typeof api.FoodItems).toBe("function");
  });
});
