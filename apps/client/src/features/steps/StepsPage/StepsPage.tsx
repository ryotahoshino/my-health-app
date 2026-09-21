import { useState } from "react";
import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useDailyCalorieSummaries, useStepsMutations } from "../hooks";
import { StepsForm } from "../StepsForm";
import { DailyCalorieSummary } from "../DailyCalorieSummary";
import { EmptyState } from "../../../components/EmptyState";
import { QueryState } from "../../../components/QueryState";
import { PeriodSelector, type AggregationPeriod } from "../../../components/PeriodSelector";

const Root = styled(Stack)(({ theme }) => ({
  maxWidth: theme.layout.contentNarrow,
}));

export const StepsPage = () => {
  const [period, setPeriod] = useState<AggregationPeriod>("DAILY");

  const { data, isLoading } = useDailyCalorieSummaries(period);
  const { upsert } = useStepsMutations();

  const summaries = data?.dailyCalorieSummaries ?? [];

  return (
    <Root spacing={4}>
      <Typography variant="h5" component="h1">
        歩数記録
      </Typography>
      <StepsForm onSubmit={(values) => upsert.mutate(values)} />
      <PeriodSelector value={period} onChange={setPeriod} />
      <QueryState
        isLoading={isLoading}
        isEmpty={summaries.length === 0}
        emptyState={
          <EmptyState
            message="歩数記録はまだありません"
            description="上のフォームから最初の記録を追加しましょう"
          />
        }
      >
        <Stack spacing={2}>
          {summaries.map((summary) => (
            <DailyCalorieSummary
              key={summary.date}
              date={summary.periodLabel}
              trainingCalories={summary.trainingCalories}
              stepCalorieEstimate={summary.stepCalorieEstimate}
              totalCalories={summary.totalCalories}
            />
          ))}
        </Stack>
      </QueryState>
    </Root>
  );
};
