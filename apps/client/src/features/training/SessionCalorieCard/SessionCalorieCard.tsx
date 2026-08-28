import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export interface AssumedConstant {
  label: string;
  value: number;
  unit: string;
}

export interface CalorieEstimate {
  calories: number | null;
  formula: string;
  assumedConstants: AssumedConstant[];
  source: string;
}

export interface SessionCalorieCardProps {
  calorieEstimate: CalorieEstimate;
  totalVolume: number;
}

const Root = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(0.5),
}));

// 消費カロリー・総ボリュームと、算出根拠(計算式・定数・出典)を常にあわせて
// 表示する(憲法 原則VII: 算出値は計算式と仮定した定数を画面上で確認できる
// ようにする)。体重が未記録の場合はcaloriesがnullになるため、算出不可を
// 明示する(FR-011)。
export const SessionCalorieCard = ({ calorieEstimate, totalVolume }: SessionCalorieCardProps) => {
  let calorieText: string;
  if (calorieEstimate.calories === null) {
    calorieText = "体重が未記録のため消費カロリーを算出できません";
  } else {
    calorieText = `消費カロリー: ${Math.round(calorieEstimate.calories)}kcal`;
  }

  return (
    <Root>
      <Typography variant="subtitle1">{calorieText}</Typography>
      <Typography variant="body2">総ボリューム: {totalVolume.toFixed(1)}kg</Typography>
      <Typography variant="caption" color="text.secondary">
        計算式: {calorieEstimate.formula}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        定数:{" "}
        {calorieEstimate.assumedConstants
          .map((constant) => `${constant.label} ${constant.value}${constant.unit}`)
          .join(", ")}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        出典: {calorieEstimate.source}
      </Typography>
    </Root>
  );
};
