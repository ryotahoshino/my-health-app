import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export interface AssumedConstant {
  label: string;
  value: number;
  unit: string;
}

export interface StepCalorieEstimate {
  calories: number | null;
  formula: string;
  assumedConstants: AssumedConstant[];
  source: string;
}

export interface DailyCalorieSummaryProps {
  date: string;
  trainingCalories: number | null;
  stepCalorieEstimate: StepCalorieEstimate;
  totalCalories: number | null;
}

const Root = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(0.5),
}));

const formatCalories = (calories: number | null): string => {
  if (calories === null) {
    return "算出できません";
  }
  return `${Math.round(calories)}kcal`;
};

// トレーニング分・歩数分・合計をあわせて表示し、合計は常に概算である旨を
// 明示する(FR-014: トレーニング中の歩数と歩数記録は重複しうるため)。
// 歩数分の算出根拠(計算式・定数・出典)も画面上で確認できるようにする
// (憲法 原則VII)。
export const DailyCalorieSummary = ({
  date,
  trainingCalories,
  stepCalorieEstimate,
  totalCalories,
}: DailyCalorieSummaryProps) => {
  return (
    <Root>
      <Typography variant="subtitle1">{date}</Typography>
      <Typography variant="body2">トレーニング分: {formatCalories(trainingCalories)}</Typography>
      <Typography variant="body2">
        歩数分: {formatCalories(stepCalorieEstimate.calories)}
      </Typography>
      <Typography variant="subtitle2">合計(概算): {formatCalories(totalCalories)}</Typography>
      <Typography variant="caption" color="text.secondary">
        計算式: {stepCalorieEstimate.formula}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        定数:{" "}
        {stepCalorieEstimate.assumedConstants
          .map((constant) => `${constant.label} ${constant.value}${constant.unit}`)
          .join(", ")}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        出典: {stepCalorieEstimate.source}
      </Typography>
    </Root>
  );
};
