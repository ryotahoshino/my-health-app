import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

// サーバー側(apps/server/src/domain/training/trainingSchema.ts)と同じ制約を
// クライアント側にも個別定義する(research.md #4)。フォームの生値は文字列の
// まま検証し、送信時にのみ数値へ変換する。
const EPSILON = 1e-6;

const exerciseSetFormSchema = z.object({
  exerciseId: z.string().min(1, "種目を選択してください"),
  sets: z
    .string()
    .min(1, "セット数を入力してください")
    .refine((value) => !Number.isNaN(Number(value)), {
      message: "セット数は数値で入力してください",
    })
    .refine((value) => Number.isInteger(Number(value)), {
      message: "セット数は整数で入力してください",
    })
    .refine((value) => Number(value) >= 1, { message: "セット数は1以上で入力してください" })
    .refine((value) => Number(value) <= 20, { message: "セット数は20以下で入力してください" }),
  reps: z
    .string()
    .min(1, "回数を入力してください")
    .refine((value) => !Number.isNaN(Number(value)), { message: "回数は数値で入力してください" })
    .refine((value) => Number.isInteger(Number(value)), { message: "回数は整数で入力してください" })
    .refine((value) => Number(value) >= 1, { message: "回数は1以上で入力してください" })
    .refine((value) => Number(value) <= 100, { message: "回数は100以下で入力してください" }),
  weightKg: z
    .string()
    .min(1, "重量を入力してください")
    .refine((value) => !Number.isNaN(Number(value)), { message: "重量は数値で入力してください" })
    .refine((value) => Number(value) >= 0, { message: "重量は0kg以上で入力してください" })
    .refine((value) => Number(value) <= 500, { message: "重量は500kg以下で入力してください" })
    .refine(
      (value) => {
        const parsed = Number(value);
        return Math.abs(Math.round(parsed * 2) - parsed * 2) < EPSILON;
      },
      { message: "重量は0.5kg刻みで入力してください" },
    ),
});

const trainingSessionFormSchema = z.object({
  date: z
    .string()
    .min(1, "日付を入力してください")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください"),
  durationMinutes: z
    .string()
    .min(1, "実施時間を入力してください")
    .refine((value) => !Number.isNaN(Number(value)), {
      message: "実施時間は数値で入力してください",
    })
    .refine((value) => Number.isInteger(Number(value)), {
      message: "実施時間は整数で入力してください",
    })
    .refine((value) => Number(value) >= 1, { message: "実施時間は1分以上で入力してください" })
    .refine((value) => Number(value) <= 600, { message: "実施時間は600分以下で入力してください" }),
  intensity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  exerciseSets: z.array(exerciseSetFormSchema),
});

type TrainingSessionFormValues = z.infer<typeof trainingSessionFormSchema>;

export interface TrainingSessionFormProps {
  exercises: { id: string; name: string }[];
  onSubmit: (values: {
    date: string;
    durationMinutes: number;
    intensity: "LOW" | "MEDIUM" | "HIGH";
    exerciseSets: { exerciseId: string; sets: number; reps: number; weightKg: number }[];
  }) => void;
}

const FormRoot = styled("form")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  maxWidth: 480,
}));

const ExerciseRow = styled(Stack)(({ theme }) => ({
  flexDirection: "row",
  gap: theme.spacing(1),
  alignItems: "flex-start",
}));

export const TrainingSessionForm = ({ exercises, onSubmit }: TrainingSessionFormProps) => {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TrainingSessionFormValues>({
    resolver: zodResolver(trainingSessionFormSchema),
    defaultValues: { date: "", durationMinutes: "", intensity: "LOW", exerciseSets: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "exerciseSets" });

  const handleValidSubmit = (values: TrainingSessionFormValues) => {
    onSubmit({
      date: values.date,
      durationMinutes: Number(values.durationMinutes),
      intensity: values.intensity,
      exerciseSets: values.exerciseSets.map((exerciseSet) => ({
        exerciseId: exerciseSet.exerciseId,
        sets: Number(exerciseSet.sets),
        reps: Number(exerciseSet.reps),
        weightKg: Number(exerciseSet.weightKg),
      })),
    });
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
        label="実施時間(分)"
        {...register("durationMinutes")}
        error={!!errors.durationMinutes}
        helperText={errors.durationMinutes?.message}
      />
      <FormControl>
        <FormLabel id="training-intensity-label">強度</FormLabel>
        <Controller
          name="intensity"
          control={control}
          render={({ field }) => (
            <RadioGroup {...field} aria-labelledby="training-intensity-label">
              <FormControlLabel value="LOW" control={<Radio />} label="低強度" />
              <FormControlLabel value="MEDIUM" control={<Radio />} label="中強度" />
              <FormControlLabel value="HIGH" control={<Radio />} label="高強度" />
            </RadioGroup>
          )}
        />
      </FormControl>

      {fields.map((field, index) => (
        <ExerciseRow key={field.id}>
          <TextField
            select
            label="種目"
            slotProps={{ select: { native: true } }}
            {...register(`exerciseSets.${index}.exerciseId` as const)}
            error={!!errors.exerciseSets?.[index]?.exerciseId}
            helperText={errors.exerciseSets?.[index]?.exerciseId?.message}
          >
            <option value="" />
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </TextField>
          <TextField
            label="セット数"
            {...register(`exerciseSets.${index}.sets` as const)}
            error={!!errors.exerciseSets?.[index]?.sets}
            helperText={errors.exerciseSets?.[index]?.sets?.message}
          />
          <TextField
            label="回数"
            {...register(`exerciseSets.${index}.reps` as const)}
            error={!!errors.exerciseSets?.[index]?.reps}
            helperText={errors.exerciseSets?.[index]?.reps?.message}
          />
          <TextField
            label="重量(kg)"
            {...register(`exerciseSets.${index}.weightKg` as const)}
            error={!!errors.exerciseSets?.[index]?.weightKg}
            helperText={errors.exerciseSets?.[index]?.weightKg?.message}
          />
          <Button type="button" onClick={() => remove(index)}>
            削除
          </Button>
        </ExerciseRow>
      ))}

      <Button
        type="button"
        variant="outlined"
        onClick={() => append({ exerciseId: "", sets: "", reps: "", weightKg: "" })}
      >
        種目を追加
      </Button>

      <Button type="submit" variant="contained">
        保存
      </Button>
    </FormRoot>
  );
};
