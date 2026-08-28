import { z } from "zod";

export const stepRecordInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください"),
  steps: z
    .number()
    .int("歩数は整数で入力してください")
    .min(0, "歩数は0歩以上で入力してください")
    .max(100000, "歩数は100,000歩以下で入力してください"),
});
export type StepRecordInput = z.infer<typeof stepRecordInputSchema>;
