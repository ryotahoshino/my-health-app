import { describe, expect, it } from "vitest";
// T027 で実装する(このテストは実装が無い間は失敗する)。
// 契約: contracts/api-injection.md 規則2・3
import { createApiClient, resolveApiClient } from "./apiClient";

describe("createApiClient(SC-014 / 規則2)", () => {
  it("生成SDKのメソッドを備えた ApiClient を返す", () => {
    const client = createApiClient("http://localhost:4000/graphql");

    expect(typeof client.WeightRecords).toBe("function");
    expect(typeof client.UpsertWeightRecord).toBe("function");
    expect(typeof client.DailyCalorieSummaries).toBe("function");
    expect(typeof client.FoodItems).toBe("function");
  });
});

// Provider の外で ApiClient を要求したとき、undefined がそのまま流れると
// 「実際に API を呼ぶまで気づけない」ため、受け取った時点でエラーにする。
describe("resolveApiClient(規則3: 注入忘れの検出)", () => {
  it("注入されていない場合は理由の分かるエラーになる", () => {
    expect(() => resolveApiClient(undefined)).toThrow(/ApiProvider/);
  });

  it("注入されている場合はその ApiClient をそのまま返す", () => {
    const client = createApiClient("http://localhost:4000/graphql");

    expect(resolveApiClient(client)).toBe(client);
  });
});
