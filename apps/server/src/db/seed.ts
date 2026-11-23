import type { Database } from "./client.js";
import { exerciseCatalogSeed } from "./seed/exerciseCatalog.js";
import { foodItemsSeed } from "./seed/foodItems.js";

// 固定データ(種目マスタ・食材)の投入。一次ソースは TypeScript の配列で、
// 既存のテストもその配列と取得結果を比較している(原則IV / contracts/migrations.md)。
// 何度実行しても重複せず、配列の値を変えたときは追従する(INV-5)。

export const runSeeds = async (db: Database): Promise<void> => {
  await db.transaction(async (tx) => {
    for (const entry of exerciseCatalogSeed) {
      await tx.query(
        `INSERT INTO exercise_catalog (id, name, mets, source)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE
           SET name = excluded.name, mets = excluded.mets, source = excluded.source`,
        [entry.id, entry.name, entry.mets, entry.source],
      );
    }

    for (const item of foodItemsSeed) {
      await tx.query(
        `INSERT INTO food_items (id, name, calories_per_100g, protein_g, fat_g, carb_g)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE
           SET name = excluded.name,
               calories_per_100g = excluded.calories_per_100g,
               protein_g = excluded.protein_g,
               fat_g = excluded.fat_g,
               carb_g = excluded.carb_g`,
        [item.id, item.name, item.caloriesPer100g, item.proteinG, item.fatG, item.carbG],
      );
    }
  });
};
