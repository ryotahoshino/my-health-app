import { zodResolver } from "@hookform/resolvers/zod";
import { Button, TextField } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useForm } from "react-hook-form";
import { z } from "zod";

// サーバー側(apps/server/src/domain/weight/weightSchema.ts)と同じ制約を
// クライアント側にも個別定義する(research.md #4)。フォームの生値は
// 文字列のまま検証し、送信時にのみ数値へ変換する(react-hook-formの
// resolver型をシンプルに保つため)。
const EPSILON = 1e-6;

const weightFormSchema = z.object({
  date: z
    .string()
    .min(1, "日付を入力してください")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください"),
  weightKg: z
    .string()
    .min(1, "体重を入力してください")
    .refine((value) => !Number.isNaN(Number(value)), {
      message: "体重は数値で入力してください",
    })
    .refine((value) => Number(value) >= 20.0, {
      message: "体重は20.0kg以上で入力してください",
    })
    .refine((value) => Number(value) <= 300.0, {
      message: "体重は300.0kg以下で入力してください",
    })
    .refine(
      (value) => {
        const parsed = Number(value);
        return Math.abs(Math.round(parsed * 10) - parsed * 10) < EPSILON;
      },
      { message: "体重は小数点第1位までで入力してください" },
    ),
});

type WeightFormValues = z.infer<typeof weightFormSchema>;

export type WeightFormProps = {
  onSubmit: (values: { date: string; weightKg: number }) => void;
};

const FormRoot = styled("form")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  maxWidth: 320,
}));

export const WeightForm = ({ onSubmit }: WeightFormProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WeightFormValues>({
    resolver: zodResolver(weightFormSchema),
    defaultValues: { date: "", weightKg: "" },
  });

  const handleValidSubmit = (values: WeightFormValues) => {
    onSubmit({ date: values.date, weightKg: Number(values.weightKg) });
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
        label="体重(kg)"
        {...register("weightKg")}
        error={!!errors.weightKg}
        helperText={errors.weightKg?.message}
      />
      <Button type="submit" variant="contained">
        保存
      </Button>
    </FormRoot>
  );
};
