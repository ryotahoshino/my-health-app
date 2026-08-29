import type Database from "better-sqlite3";

export interface FoodItem {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinG: number;
  fatG: number;
  carbG: number;
}

// 食材は固定データ(参照専用、CRUD対象外。FR-015)。数値は文部科学省
// 「日本食品標準成分表」の代表値に基づく。
export const foodItemsSeed: FoodItem[] = [
  { id: "rice", name: "ご飯(白米)", caloriesPer100g: 156, proteinG: 2.5, fatG: 0.3, carbG: 37.1 },
  {
    id: "chicken-breast",
    name: "鶏むね肉(皮なし)",
    caloriesPer100g: 116,
    proteinG: 23.3,
    fatG: 1.9,
    carbG: 0,
  },
  {
    id: "chicken-thigh",
    name: "鶏もも肉(皮つき)",
    caloriesPer100g: 200,
    proteinG: 16.6,
    fatG: 14.0,
    carbG: 0,
  },
  { id: "egg", name: "卵(全卵)", caloriesPer100g: 151, proteinG: 12.3, fatG: 10.3, carbG: 0.3 },
  { id: "natto", name: "納豆", caloriesPer100g: 190, proteinG: 16.5, fatG: 10.0, carbG: 12.1 },
  { id: "tofu", name: "豆腐(木綿)", caloriesPer100g: 72, proteinG: 6.6, fatG: 4.2, carbG: 1.6 },
  { id: "banana", name: "バナナ", caloriesPer100g: 86, proteinG: 1.1, fatG: 0.2, carbG: 22.5 },
  {
    id: "broccoli",
    name: "ブロッコリー",
    caloriesPer100g: 33,
    proteinG: 4.3,
    fatG: 0.5,
    carbG: 5.2,
  },
  { id: "salmon", name: "鮭", caloriesPer100g: 133, proteinG: 22.3, fatG: 4.1, carbG: 0.1 },
  { id: "milk", name: "牛乳", caloriesPer100g: 61, proteinG: 3.3, fatG: 3.8, carbG: 4.8 },
];

export const seedFoodItems = (db: Database.Database): void => {
  const insert = db.prepare(
    `INSERT INTO food_items (id, name, calories_per_100g, protein_g, fat_g, carb_g)
     VALUES (@id, @name, @caloriesPer100g, @proteinG, @fatG, @carbG)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       calories_per_100g = excluded.calories_per_100g,
       protein_g = excluded.protein_g,
       fat_g = excluded.fat_g,
       carb_g = excluded.carb_g`,
  );
  const insertAll = db.transaction((rows: FoodItem[]) => {
    for (const row of rows) insert.run(row);
  });
  insertAll(foodItemsSeed);
};
