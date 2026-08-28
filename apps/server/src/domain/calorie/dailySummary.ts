export interface DailyCalorieSummaryInput {
  trainingCalories: number | null;
  stepCalories: number | null;
}

export interface DailyCalorieSummary {
  trainingCalories: number | null;
  stepCalories: number | null;
  totalCalories: number | null;
  isApproximate: true;
}

// トレーニング中の歩数と歩数記録由来の消費カロリーは重複しうるため、
// 合算値は常に概算である旨を示す(FR-014)。どちらかが体重未記録等でnullの
// 場合は、正確な合計を示せないためtotalCaloriesもnullにする。
export const calculateDailyCalorieSummary = (
  input: DailyCalorieSummaryInput,
): DailyCalorieSummary => {
  let totalCalories: number | null;
  if (input.trainingCalories === null || input.stepCalories === null) {
    totalCalories = null;
  } else {
    totalCalories = input.trainingCalories + input.stepCalories;
  }

  return {
    trainingCalories: input.trainingCalories,
    stepCalories: input.stepCalories,
    totalCalories,
    isApproximate: true,
  };
};
