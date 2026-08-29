import { describe, expect, it } from "vitest";
import { graphql } from "graphql";
import { builder } from "./builder.js";
import "./foodItems.js";
import { foodItemsSeed } from "../db/seed/foodItems.js";

describe("foodItems GraphQLスキーマ", () => {
  it("foodItemsで食材の固定データ一覧(名称・100gあたりカロリー・PFC)が取得できる", async () => {
    const schema = builder.toSchema();
    const result = await graphql({
      schema,
      source: `
        {
          foodItems {
            id
            name
            caloriesPer100g
            proteinG
            fatG
            carbG
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.foodItems).toEqual(foodItemsSeed);
  });
});
