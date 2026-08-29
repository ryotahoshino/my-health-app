import { builder } from "./builder.js";
import { foodItemsSeed, type FoodItem } from "../db/seed/foodItems.js";

// 食材は固定データ(参照専用、CRUD対象外。FR-015)。DBへ書き込み済みのものと
// 同じ内容なので、参照だけならDBに問い合わせずseed配列をそのまま返せば足りる
// (exerciseCatalog.tsと同じ方針)。
const FoodItemType = builder.objectRef<FoodItem>("FoodItem").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    name: t.exposeString("name"),
    caloriesPer100g: t.exposeFloat("caloriesPer100g"),
    proteinG: t.exposeFloat("proteinG"),
    fatG: t.exposeFloat("fatG"),
    carbG: t.exposeFloat("carbG"),
  }),
});

builder.queryField("foodItems", (t) =>
  t.field({
    type: [FoodItemType],
    resolve: () => foodItemsSeed,
  }),
);
