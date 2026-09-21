import type { AggregationPeriod } from "../../../components/PeriodSelector";

// クエリキーは feature 内の1箇所で定義する(contracts/api-injection.md 規則4)。
export const stepsQueryKeys = {
  // 期間ごとに別のキャッシュを持ち、記録の追加時は先頭が一致する全期間を
  // まとめて無効化する(表示中の期間以外もいずれ見る可能性があるため)。
  summariesBase: ["dailyCalorieSummaries"] as const,
  summaries: (period: AggregationPeriod) => ["dailyCalorieSummaries", period] as const,
};
