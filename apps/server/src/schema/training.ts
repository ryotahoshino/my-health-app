import { builder } from "./builder.js";
import "./mutation.js";
import { trainingSessionInputSchema } from "../domain/training/trainingSchema.js";
import type { TrainingSession, ExerciseSet } from "../repositories/trainingSessionRepository.js";
import {
  calculateSessionCalorie,
  type AssumedConstant,
  type SessionCalorieEstimate,
} from "../domain/calorie/sessionCalorie.js";
import { calculateTotalVolume } from "../domain/training/volume.js";

const TrainingIntensityEnum = builder.enumType("TrainingIntensity", {
  values: ["LOW", "MEDIUM", "HIGH"] as const,
});

const ExerciseSetType = builder.objectRef<ExerciseSet>("ExerciseSet").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    exerciseId: t.exposeID("exerciseId"),
    sets: t.exposeInt("sets"),
    reps: t.exposeInt("reps"),
    weightKg: t.exposeFloat("weightKg"),
  }),
});

const AssumedConstantType = builder.objectRef<AssumedConstant>("AssumedConstant").implement({
  fields: (t) => ({
    label: t.exposeString("label"),
    value: t.exposeFloat("value"),
    unit: t.exposeString("unit"),
  }),
});

// 算出値は計算式と仮定した定数を画面上で確認できるようにする(憲法 原則VII)。
const CalorieEstimateType = builder.objectRef<SessionCalorieEstimate>("CalorieEstimate").implement({
  fields: (t) => ({
    calories: t.exposeFloat("calories", { nullable: true }),
    formula: t.exposeString("formula"),
    assumedConstants: t.field({
      type: [AssumedConstantType],
      resolve: (estimate) => estimate.assumedConstants,
    }),
    source: t.exposeString("source"),
  }),
});

const TrainingSessionType = builder.objectRef<TrainingSession>("TrainingSession").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    date: t.exposeString("date"),
    durationMinutes: t.exposeInt("durationMinutes"),
    intensity: t.expose("intensity", { type: TrainingIntensityEnum }),
    exerciseSets: t.field({
      type: [ExerciseSetType],
      resolve: (session) => session.exerciseSets,
    }),
    // 消費カロリー算出には使わず、トレーニング内容の可視化用の別指標として扱う(FR-010)。
    totalVolume: t.field({
      type: "Float",
      resolve: (session) => calculateTotalVolume(session.exerciseSets),
    }),
    // セッション日付以前で最も新しい体重記録を使ってMETs方式で算出する(FR-008・FR-009)。
    // 体重記録が無い場合はcalories=nullとなり、算出不可を示す(FR-011)。
    calorieEstimate: t.field({
      type: CalorieEstimateType,
      resolve: (session, _args, context) => {
        const weightKg = context.repositories.weight.findAsOf(session.date);
        return calculateSessionCalorie({
          intensity: session.intensity,
          durationMinutes: session.durationMinutes,
          weightKg,
        });
      },
    }),
  }),
});

const ExerciseSetInput = builder.inputType("ExerciseSetInput", {
  fields: (t) => ({
    exerciseId: t.id({ required: true }),
    sets: t.int({ required: true }),
    reps: t.int({ required: true }),
    weightKg: t.float({ required: true }),
  }),
});

const UpsertTrainingSessionInput = builder.inputType("UpsertTrainingSessionInput", {
  // 範囲・書式などの制約はtrainingSessionInputSchema(Zod)が担当する(原則IV)。
  validate: { schema: trainingSessionInputSchema },
  fields: (t) => ({
    date: t.string({ required: true }),
    durationMinutes: t.int({ required: true }),
    intensity: t.field({ type: TrainingIntensityEnum, required: true }),
    exerciseSets: t.field({ type: [ExerciseSetInput], required: true }),
  }),
});

builder.queryField("trainingSessions", (t) =>
  t.field({
    type: [TrainingSessionType],
    resolve: (_parent, _args, context) => context.repositories.training.list(),
  }),
);

builder.queryField("trainingSession", (t) =>
  t.field({
    type: TrainingSessionType,
    nullable: true,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: (_parent, args, context) => context.repositories.training.get(String(args.id)),
  }),
);

builder.mutationFields((t) => ({
  upsertTrainingSession: t.field({
    type: TrainingSessionType,
    args: {
      input: t.arg({ type: UpsertTrainingSessionInput, required: true }),
    },
    resolve: (_parent, args, context) =>
      context.repositories.training.upsert({
        date: args.input.date,
        durationMinutes: args.input.durationMinutes,
        intensity: args.input.intensity,
        exerciseSets: args.input.exerciseSets.map((exerciseSet) => ({
          exerciseId: String(exerciseSet.exerciseId),
          sets: exerciseSet.sets,
          reps: exerciseSet.reps,
          weightKg: exerciseSet.weightKg,
        })),
      }),
  }),
  deleteTrainingSession: t.field({
    type: "Boolean",
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: (_parent, args, context) => context.repositories.training.delete(String(args.id)),
  }),
}));
