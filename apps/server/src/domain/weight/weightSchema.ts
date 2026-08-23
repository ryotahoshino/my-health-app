import { z } from "zod";

// 浮動小数点誤差(例: 67.8 * 10 が 677.9999999999999 になる)を考慮し、
// 厳密な等価比較ではなく微小な許容誤差で小数点第1位までかどうかを判定する。
const EPSILON = 1e-6;

export const weightRecordInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください"),
  weightKg: z
    .number()
    .min(20.0, "体重は20.0kg以上で入力してください")
    .max(300.0, "体重は300.0kg以下で入力してください")
    .refine((value) => Math.abs(Math.round(value * 10) - value * 10) < EPSILON, {
      message: "体重は小数点第1位までで入力してください",
    }),
});

export type WeightRecordInput = z.infer<typeof weightRecordInputSchema>;
