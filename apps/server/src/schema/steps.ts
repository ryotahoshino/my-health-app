import { builder } from "./builder.js";
import "./mutation.js";
import { CalorieEstimateType } from "./training.js";
import { AggregationPeriodEnum } from "./period.js";
import { stepRecordInputSchema } from "../domain/steps/stepsSchema.js";
import { buildStepCalorieEstimate, calculateStepCalorie } from "../domain/calorie/stepCalorie.js";
import { calculateSessionCalorie } from "../domain/calorie/sessionCalorie.js";
import { calculateDailyCalorieSummary } from "../domain/calorie/dailySummary.js";
import {
  aggregatePointsOverRanges,
  buildBucketRanges,
  sum,
  type PeriodDataPoint,
} from "../domain/period/periodAggregate.js";
import type { SessionCalorieEstimate } from "../domain/calorie/sessionCalorie.js";
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
  stepCalorieEstimate: SessionCalorieEstimate;
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
      // stepCaloriesは数値のみだが、画面上に算出根拠(計算式・定数・出典)も
      // あわせて表示するため、CalorieEstimate型としても公開する(憲法 原則VII)。
      stepCalorieEstimate: t.field({
        type: CalorieEstimateType,
        resolve: (summary) => summary.stepCalorieEstimate,
      }),
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

// 記録がある最古の日から当日までの履歴全体を日次・週次・月次でバケット化する
// (FR-016)。DAILYは1日1バケットなので従来どおり日ごとの内訳になり、
// WEEKLY/MONTHLYは同じ経路でトレーニング分・歩数分をそれぞれ合算する
// (特別扱いを増やさず一つの仕組みに寄せる)。
builder.queryField("dailyCalorieSummaries", (t) =>
  t.field({
    type: [DailyCalorieSummaryType],
    args: {
      period: t.arg({ type: AggregationPeriodEnum, required: true }),
    },
    resolve: (_parent, args, context) => {
      const sessions = context.repositories.training.list();
      const stepRecords = context.repositories.steps.list();

      const dates = new Set<string>();
      for (const session of sessions) {
        dates.add(session.date);
      }
      for (const stepRecord of stepRecords) {
        dates.add(stepRecord.date);
      }

      if (dates.size === 0) {
        return [];
      }
      const sortedDates = Array.from(dates).sort();

      const trainingPoints: PeriodDataPoint[] = [];
      const stepPoints: PeriodDataPoint[] = [];

      for (const date of sortedDates) {
        const weightKg = context.repositories.weight.findAsOf(date);
        const session = sessions.find((candidate) => candidate.date === date);
        const stepRecord = stepRecords.find((candidate) => candidate.date === date);

        // その日の記録が無ければ体重の有無に関わらず0kcalとして扱う(未記録=
        // 活動量ゼロが確定しているため算出不可ではない)。記録がある場合のみ、
        // 体重未記録により算出不可(null)になりうる。
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

        trainingPoints.push({ date, value: trainingCalories });
        stepPoints.push({ date, value: stepCalories });
      }

      // バケット区切り(日次/週次/月次)はトレーニング分・歩数分で共通なので
      // 1回だけ計算し、集計(combine: 合計)だけをそれぞれの系列に対して行う
      // (buildBucketRanges/aggregatePointsOverRangesの分離はperiodAggregate.ts参照)。
      const earliestDate = sortedDates[0]!;
      const ranges = buildBucketRanges(args.period, earliestDate, context.today);
      const trainingBuckets = aggregatePointsOverRanges(trainingPoints, ranges, sum);
      const stepBuckets = aggregatePointsOverRanges(stepPoints, ranges, sum);

      return trainingBuckets.map((trainingBucket, index): DailyCalorieSummaryRow => {
        // 同じrangesから作っているため、trainingBuckets/stepBucketsのバケット
        // 区切りは常に一致する。
        const stepBucket = stepBuckets[index]!;

        return {
          date: trainingBucket.startDate,
          stepCalorieEstimate: buildStepCalorieEstimate(stepBucket.value),
          ...calculateDailyCalorieSummary({
            trainingCalories: trainingBucket.value,
            stepCalories: stepBucket.value,
          }),
        };
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
