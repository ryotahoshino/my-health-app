import { builder } from "./builder.js";
import "./mutation.js";
import { AggregationPeriodEnum, PeriodAggregatePointType } from "./period.js";
import { weightRecordInputSchema } from "../domain/weight/weightSchema.js";
import { calculatePeriodAggregate, mean } from "../domain/period/periodAggregate.js";
import type { WeightRecord } from "../repositories/weightRepository.js";

const WeightRecordType = builder.objectRef<WeightRecord>("WeightRecord").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    date: t.exposeString("date"),
    weightKg: t.exposeFloat("weightKg"),
  }),
});

const UpsertWeightRecordInput = builder.inputType("UpsertWeightRecordInput", {
  // 範囲・書式などの制約はweightRecordInputSchema(Zod)が担当し、
  // GraphQL型は形のみを表す(憲法 原則IV)。
  validate: { schema: weightRecordInputSchema },
  fields: (t) => ({
    date: t.string({ required: true }),
    weightKg: t.float({ required: true }),
  }),
});

builder.queryField("weightRecords", (t) =>
  t.field({
    type: [WeightRecordType],
    resolve: (_parent, _args, context) => context.repositories.weight.list(),
  }),
);

// 記録がある最古の日から当日までの履歴全体を日次・週次・月次でバケット化する
// (FR-016)。週次・月次は月曜始まり・今週今月は経過分のみ、複数値は平均で
// 集約する(体重は合計ではなく平均が自然なため)。
builder.queryField("weightTrendAggregate", (t) =>
  t.field({
    type: [PeriodAggregatePointType],
    args: {
      period: t.arg({ type: AggregationPeriodEnum, required: true }),
    },
    resolve: (_parent, args, context) => {
      const points = context.repositories.weight.list().map((record) => ({
        date: record.date,
        value: record.weightKg,
      }));

      return calculatePeriodAggregate({
        period: args.period,
        points,
        today: context.today,
        combine: mean,
      });
    },
  }),
);

builder.mutationFields((t) => ({
  upsertWeightRecord: t.field({
    type: WeightRecordType,
    args: {
      input: t.arg({ type: UpsertWeightRecordInput, required: true }),
    },
    resolve: (_parent, args, context) => context.repositories.weight.upsert(args.input),
  }),
  deleteWeightRecord: t.field({
    type: "Boolean",
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: (_parent, args, context) => context.repositories.weight.delete(String(args.id)),
  }),
}));
