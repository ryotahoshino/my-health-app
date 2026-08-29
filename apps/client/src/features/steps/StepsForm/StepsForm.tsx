import { zodResolver } from "@hookform/resolvers/zod";
import { Button, TextField } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useForm } from "react-hook-form";
import { z } from "zod";

// サーバー側(apps/server/src/domain/steps/stepsSchema.ts)と同じ制約を
// クライアント側にも個別定義する(research.md #4)。フォームの生値は
// 文字列のまま検証し、送信時にのみ数値へ変換する(react-hook-formの
// resolver型をシンプルに保つため)。
const stepsFormSchema = z.object({
  date: z
    .string()
    .min(1, "日付を入力してください")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください"),
  steps: z
    .string()
    .min(1, "歩数を入力してください")
    .refine((value) => Number.isInteger(Number(value)), {
      message: "歩数は整数で入力してください",
    })
    .refine((value) => Number(value) >= 0, {
      message: "歩数は0歩以上で入力してください",
    })
    .refine((value) => Number(value) <= 100000, {
      message: "歩数は100,000歩以下で入力してください",
    }),
});

type StepsFormValues = z.infer<typeof stepsFormSchema>;

export type StepsFormProps = {
  onSubmit: (values: { date: string; steps: number }) => void;
};

const FormRoot = styled("form")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  maxWidth: 320,
}));

export const StepsForm = ({ onSubmit }: StepsFormProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StepsFormValues>({
    resolver: zodResolver(stepsFormSchema),
    defaultValues: { date: "", steps: "" },
  });

  const handleValidSubmit = (values: StepsFormValues) => {
    onSubmit({ date: values.date, steps: Number(values.steps) });
    reset();
  };

  return (
    <FormRoot onSubmit={handleSubmit(handleValidSubmit)} noValidate>
      <TextField
        label="日付"
        placeholder="YYYY-MM-DD"
        {...register("date")}
        error={!!errors.date}
        helperText={errors.date?.message}
      />
      <TextField
        label="歩数"
        {...register("steps")}
        error={!!errors.steps}
        helperText={errors.steps?.message}
      />
      <Button type="submit" variant="contained">
        保存
      </Button>
    </FormRoot>
  );
};
