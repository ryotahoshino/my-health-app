import { builder } from "./builder.js";
import { weightRecordInputSchema } from "../domain/weight/weightSchema.js";
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

builder.mutationType({
  fields: (t) => ({
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
  }),
});
