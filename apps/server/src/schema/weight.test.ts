import { describe, expect, it } from "vitest";
import { graphql } from "graphql";
import { builder } from "./builder.js";
// T023で実装する(このテストは実装が無い間は失敗する)。副作用importで
// builderにQuery.weightRecords/Mutation.upsertWeightRecord/deleteWeightRecordを登録する想定。
import "./weight.js";
import { createConnection } from "../db/connection.js";
import { createWeightRepository, type WeightRepository } from "../repositories/weightRepository.js";

// GraphQL Yogaのcontextに渡す形と合わせる想定の契約(T023で index.ts 側も更新する)。
type TestContext = {
  repositories: { weight: WeightRepository };
  today: string;
};

// 期間集計(weightTrendAggregate)のテストで「当日」を固定するための値。
// 2026-08-17は月曜日、2026-08-19は同じ週の水曜日。
const TODAY = "2026-08-19";

const createTestContext = (): TestContext => {
  const db = createConnection(":memory:");
  return { repositories: { weight: createWeightRepository(db) }, today: TODAY };
};

describe("weight GraphQLスキーマ", () => {
  it("upsertWeightRecordで作成した記録がweightRecordsに反映される", async () => {
    const schema = builder.toSchema();
    const contextValue = createTestContext();

    const upsertResult = await graphql({
      schema,
      contextValue,
      source: `
        mutation {
          upsertWeightRecord(input: { date: "2026-01-01", weightKg: 68.5 }) {
            id
            date
            weightKg
          }
        }
      `,
    });
    expect(upsertResult.errors).toBeUndefined();

    const listResult = await graphql({
      schema,
      contextValue,
      source: `{ weightRecords { date weightKg } }`,
    });
    expect(listResult.errors).toBeUndefined();
    expect(listResult.data?.weightRecords).toEqual([{ date: "2026-01-01", weightKg: 68.5 }]);
  });

  it("deleteWeightRecordで記録を削除できる", async () => {
    const schema = builder.toSchema();
    const contextValue = createTestContext();

    const upsertResult = await graphql({
      schema,
      contextValue,
      source: `mutation { upsertWeightRecord(input: { date: "2026-01-01", weightKg: 68.5 }) { id } }`,
    });
    const created = upsertResult.data?.upsertWeightRecord as { id: string } | undefined;
    expect(created).toBeDefined();

    const deleteResult = await graphql({
      schema,
      contextValue,
      source: `mutation { deleteWeightRecord(id: "${created?.id}") }`,
    });
    expect(deleteResult.data?.deleteWeightRecord).toBe(true);

    const listResult = await graphql({
      schema,
      contextValue,
      source: `{ weightRecords { id } }`,
    });
    expect(listResult.data?.weightRecords).toEqual([]);
  });

  it("同一日付への再登録は上書きになる(FR-017)", async () => {
    const schema = builder.toSchema();
    const contextValue = createTestContext();

    await graphql({
      schema,
      contextValue,
      source: `mutation { upsertWeightRecord(input: { date: "2026-01-01", weightKg: 68.5 }) { id } }`,
    });
    await graphql({
      schema,
      contextValue,
      source: `mutation { upsertWeightRecord(input: { date: "2026-01-01", weightKg: 67.8 }) { id } }`,
    });

    const listResult = await graphql({
      schema,
      contextValue,
      source: `{ weightRecords { date weightKg } }`,
    });
    expect(listResult.data?.weightRecords).toEqual([{ date: "2026-01-01", weightKg: 67.8 }]);
  });

  it("範囲外の体重値はバリデーションエラーになる", async () => {
    const schema = builder.toSchema();
    const contextValue = createTestContext();

    const result = await graphql({
      schema,
      contextValue,
      source: `mutation { upsertWeightRecord(input: { date: "2026-01-01", weightKg: 999 }) { id } }`,
    });
    expect(result.errors).toBeDefined();
  });

  describe("weightTrendAggregate(期間集計、FR-016)", () => {
    it("DAILY指定で日ごとの体重推移を返し、欠測日はhasData:falseで区別する", async () => {
      const schema = builder.toSchema();
      const contextValue = createTestContext();
      contextValue.repositories.weight.upsert({ date: "2026-08-17", weightKg: 70 });
      contextValue.repositories.weight.upsert({ date: "2026-08-19", weightKg: 69 });

      const result = await graphql({
        schema,
        contextValue,
        source: `{ weightTrendAggregate(period: DAILY) { periodLabel startDate endDate hasData value } }`,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.weightTrendAggregate).toEqual([
        {
          periodLabel: "2026-08-17",
          startDate: "2026-08-17",
          endDate: "2026-08-17",
          hasData: true,
          value: 70,
        },
        {
          periodLabel: "2026-08-18",
          startDate: "2026-08-18",
          endDate: "2026-08-18",
          hasData: false,
          value: null,
        },
        {
          periodLabel: "2026-08-19",
          startDate: "2026-08-19",
          endDate: "2026-08-19",
          hasData: true,
          value: 69,
        },
      ]);
    });

    it("WEEKLY指定で同一週内の体重を平均して返し、今週はcontext.todayまでの経過分のみになる", async () => {
      const schema = builder.toSchema();
      const contextValue = createTestContext();
      contextValue.repositories.weight.upsert({ date: "2026-08-17", weightKg: 70 });
      contextValue.repositories.weight.upsert({ date: "2026-08-18", weightKg: 72 });

      const result = await graphql({
        schema,
        contextValue,
        source: `{ weightTrendAggregate(period: WEEKLY) { startDate endDate hasData value } }`,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.weightTrendAggregate).toEqual([
        { startDate: "2026-08-17", endDate: TODAY, hasData: true, value: 71 },
      ]);
    });

    it("記録が0件の場合は空配列を返す", async () => {
      const schema = builder.toSchema();
      const contextValue = createTestContext();

      const result = await graphql({
        schema,
        contextValue,
        source: `{ weightTrendAggregate(period: MONTHLY) { startDate } }`,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.weightTrendAggregate).toEqual([]);
    });
  });
});
