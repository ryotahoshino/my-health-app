// クエリキーは feature 内の1箇所で定義する(contracts/api-injection.md 規則4)。
export const foodsQueryKeys = {
  // 参照専用のデータのため、無効化の対象になるミューテーションは無い(FR-015)。
  items: ["foodItems"] as const,
};
