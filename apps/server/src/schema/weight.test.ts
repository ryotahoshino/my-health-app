import { describe, expect, it } from "vitest";
import { graphql } from "graphql";
import { builder } from "./builder.js";
// T023で実装する(このテストは実装が無い間は失敗する)。副作用importで
// builderにQuery.weightRecords/Mutation.upsertWeightRecord/deleteWeightRecordを登録する想定。
import "./weight.js";
import { createConnection } from "../db/connection.js";
import { createWeightRepository, type WeightRepository } from "../repositories/weightRepository.js";

// GraphQL Yogaのcontextに渡す形と合わせる想定の契約(T023で index.ts 側も更新する)。
interface TestContext {
  repositories: { weight: WeightRepository };
}

function createTestContext(): TestContext {
  const db = createConnection(":memory:");
  return { repositories: { weight: createWeightRepository(db) } };
}

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
});
