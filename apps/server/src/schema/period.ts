import { builder } from "./builder.js";
import type { PeriodAggregatePoint } from "../domain/period/periodAggregate.js";

// weightTrendAggregate(weight.ts)とdailyCalorieSummaries(steps.ts)の両方が
// 参照する共通の期間集計型。Pothosは型の二重定義を許さないため、ここで
// 一度だけ定義してexportする(training.tsのCalorieEstimateTypeと同じ方針)。
export const AggregationPeriodEnum = builder.enumType("AggregationPeriod", {
  values: ["DAILY", "WEEKLY", "MONTHLY"] as const,
});

// 記録がない期間は0ではなく欠測として区別する(hasData: false、Edge Cases)。
export const PeriodAggregatePointType = builder
  .objectRef<PeriodAggregatePoint>("PeriodAggregatePoint")
  .implement({
    fields: (t) => ({
      periodLabel: t.exposeString("periodLabel"),
      startDate: t.exposeString("startDate"),
      endDate: t.exposeString("endDate"),
      hasData: t.exposeBoolean("hasData"),
      value: t.exposeFloat("value", { nullable: true }),
    }),
  });
