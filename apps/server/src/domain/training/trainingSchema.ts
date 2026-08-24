import { z } from "zod";

// 0.5kg刻みの判定に使う許容誤差(weightSchema.tsと同じ理由、浮動小数点誤差対策)。
const EPSILON = 1e-6;

export const trainingIntensitySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type TrainingIntensity = z.infer<typeof trainingIntensitySchema>;

export const exerciseSetInputSchema = z.object({
  exerciseId: z.string().min(1, "種目を選択してください"),
  sets: z
    .number()
    .int("セット数は整数で入力してください")
    .min(1, "セット数は1以上で入力してください")
    .max(20, "セット数は20以下で入力してください"),
  reps: z
    .number()
    .int("回数は整数で入力してください")
    .min(1, "回数は1以上で入力してください")
    .max(100, "回数は100以下で入力してください"),
  weightKg: z
    .number()
    .min(0, "重量は0kg以上で入力してください")
    .max(500, "重量は500kg以下で入力してください")
    .refine((value) => Math.abs(Math.round(value * 2) - value * 2) < EPSILON, {
      message: "重量は0.5kg刻みで入力してください",
    }),
});
export type ExerciseSetInput = z.infer<typeof exerciseSetInputSchema>;

export const trainingSessionInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください"),
  durationMinutes: z
    .number()
    .int("実施時間は整数で入力してください")
    .min(1, "実施時間は1分以上で入力してください")
    .max(600, "実施時間は600分以下で入力してください"),
  intensity: trainingIntensitySchema,
  exerciseSets: z.array(exerciseSetInputSchema),
});
export type TrainingSessionInput = z.infer<typeof trainingSessionInputSchema>;
