import { describe, expect, it } from "vitest";
// T038 で実装する(このテストは実装が無い間は失敗する)。
// 契約: contracts/api-injection.md「サーバー」
import { createApp } from "./app.js";
import { createTestDatabase } from "./test-support/createTestDatabase.js";

// GraphQL Yoga の fetch を直接呼び、HTTP のリクエスト/レスポンスとして検証する。
// 既存のスキーマのテストはリゾルバを graphql() で直接実行しているため、
// 「起動処理が組み立てた経路」自体はこのテストでしか通らない(SC-016)。
const postGraphql = async (
  app: ReturnType<typeof createApp>,
  query: string,
  variables?: Record<string, unknown>,
) => {
  const response = await app.fetch("http://localhost/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return (await response.json()) as { data?: Record<string, unknown>; errors?: unknown[] };
};

// テスト用DB(プロセス内の Postgres)と固定の当日日付を注入する。
// 時計にもネットワークにも依存しないため決定的に検証できる(憲法 原則V)。
const createTestApp = async () => {
  const db = await createTestDatabase();
  await db.reset();
  return createApp({ db, today: () => "2026-01-15" });
};

describe("createApp(SC-016)", () => {
  it("体重記録を作成すると、その記録を取得できる", async () => {
    const app = await createTestApp();

    const created = await postGraphql(
      app,
      `mutation ($input: UpsertWeightRecordInput!) {
         upsertWeightRecord(input: $input) { id date weightKg }
       }`,
      { input: { date: "2026-01-10", weightKg: 68.5 } },
    );
    expect(created.errors).toBeUndefined();

    const fetched = await postGraphql(app, `{ weightRecords { date weightKg } }`);
    expect(fetched.errors).toBeUndefined();
    expect(fetched.data?.weightRecords).toEqual([{ date: "2026-01-10", weightKg: 68.5 }]);
  });

  it("期間集計は注入した当日の日付を基準に計算される", async () => {
    const app = await createTestApp();

    await postGraphql(
      app,
      `mutation ($input: UpsertWeightRecordInput!) {
         upsertWeightRecord(input: $input) { id }
       }`,
      { input: { date: "2026-01-14", weightKg: 70 } },
    );

    const aggregated = await postGraphql(
      app,
      `query ($period: AggregationPeriod!) {
         weightTrendAggregate(period: $period) { startDate endDate hasData value }
       }`,
      { period: "WEEKLY" },
    );

    expect(aggregated.errors).toBeUndefined();
    const points = aggregated.data?.weightTrendAggregate as {
      startDate: string;
      endDate: string;
      hasData: boolean;
      value: number | null;
    }[];
    // 注入した当日(2026-01-15)を含む週が最後の区間になり、その週の記録が集計される。
    const lastPoint = points.at(-1);
    expect(lastPoint?.endDate).toBe("2026-01-15");
    expect(lastPoint?.hasData).toBe(true);
    expect(lastPoint?.value).toBe(70);
  });
});
