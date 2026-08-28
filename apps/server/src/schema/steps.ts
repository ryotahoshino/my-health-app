import { builder } from "./builder.js";
import "./mutation.js";
import { CalorieEstimateType } from "./training.js";
import { stepRecordInputSchema } from "../domain/steps/stepsSchema.js";
import { calculateStepCalorie } from "../domain/calorie/stepCalorie.js";
import { calculateSessionCalorie } from "../domain/calorie/sessionCalorie.js";
import { calculateDailyCalorieSummary } from "../domain/calorie/dailySummary.js";
import type { StepRecord } from "../repositories/stepRecordRepository.js";

const StepRecordType = builder.objectRef<StepRecord>("StepRecord").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    date: t.exposeString("date"),
    steps: t.exposeInt("steps"),
    // このセッション単体の消費カロリーとの一貫性のため、歩数記録も
    // calorieEstimateフィールドとして算出根拠つきで公開する(FR-013)。
    calorieEstimate: t.field({
      type: CalorieEstimateType,
      resolve: (stepRecord, _args, context) => {
        const weightKg = context.repositories.weight.findAsOf(stepRecord.date);
        return calculateStepCalorie({ steps: stepRecord.steps, weightKg });
      },
    }),
  }),
});

interface DailyCalorieSummaryRow {
  date: string;
  trainingCalories: number | null;
  stepCalories: number | null;
  totalCalories: number | null;
  isApproximate: boolean;
}

// トレーニング中の歩数と歩数記録由来の消費カロリーは重複しうるため、
// 合算値は概算である旨を示す(FR-014)。
const DailyCalorieSummaryType = builder
  .objectRef<DailyCalorieSummaryRow>("DailyCalorieSummary")
  .implement({
    fields: (t) => ({
      date: t.exposeString("date"),
      trainingCalories: t.exposeFloat("trainingCalories", { nullable: true }),
      stepCalories: t.exposeFloat("stepCalories", { nullable: true }),
      totalCalories: t.exposeFloat("totalCalories", { nullable: true }),
      isApproximate: t.exposeBoolean("isApproximate"),
    }),
  });

const UpsertStepRecordInput = builder.inputType("UpsertStepRecordInput", {
  // 範囲・書式などの制約はstepRecordInputSchema(Zod)が担当する(原則IV)。
  validate: { schema: stepRecordInputSchema },
  fields: (t) => ({
    date: t.string({ required: true }),
    steps: t.int({ required: true }),
  }),
});

builder.queryField("stepRecords", (t) =>
  t.field({
    type: [StepRecordType],
    resolve: (_parent, _args, context) => context.repositories.steps.list(),
  }),
);

// 現時点では全期間を返す。日次・週次・月次のプリセット集計はPolishフェーズ
// (T073)でperiod引数を追加して対応する(FR-016)。
builder.queryField("dailyCalorieSummaries", (t) =>
  t.field({
    type: [DailyCalorieSummaryType],
    resolve: (_parent, _args, context) => {
      const sessions = context.repositories.training.list();
      const stepRecords = context.repositories.steps.list();

      const dates = new Set<string>();
      for (const session of sessions) {
        dates.add(session.date);
      }
      for (const stepRecord of stepRecords) {
        dates.add(stepRecord.date);
      }

      return Array.from(dates)
        .sort()
        .map((date): DailyCalorieSummaryRow => {
          const weightKg = context.repositories.weight.findAsOf(date);
          const session = sessions.find((candidate) => candidate.date === date);
          const stepRecord = stepRecords.find((candidate) => candidate.date === date);

          let trainingCalories: number | null;
          if (session) {
            trainingCalories = calculateSessionCalorie({
              intensity: session.intensity,
              durationMinutes: session.durationMinutes,
              weightKg,
            }).calories;
          } else {
            trainingCalories = 0;
          }

          let stepCalories: number | null;
          if (stepRecord) {
            stepCalories = calculateStepCalorie({ steps: stepRecord.steps, weightKg }).calories;
          } else {
            stepCalories = 0;
          }

          return { date, ...calculateDailyCalorieSummary({ trainingCalories, stepCalories }) };
        });
    },
  }),
);

builder.mutationFields((t) => ({
  upsertStepRecord: t.field({
    type: StepRecordType,
    args: {
      input: t.arg({ type: UpsertStepRecordInput, required: true }),
    },
    resolve: (_parent, args, context) => context.repositories.steps.upsert(args.input),
  }),
  deleteStepRecord: t.field({
    type: "Boolean",
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: (_parent, args, context) => context.repositories.steps.delete(String(args.id)),
  }),
}));
