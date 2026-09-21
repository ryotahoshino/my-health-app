// クエリキーは feature 内の1箇所で定義する(contracts/api-injection.md 規則4)。
export const trainingQueryKeys = {
  sessions: ["trainingSessions"] as const,
  // 種目マスタは更新操作が無いため、無効化の対象にはしない。
  exerciseCatalog: ["exerciseCatalog"] as const,
};
