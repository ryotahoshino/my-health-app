import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { graphqlClient } from "../../app/queryClient";
import { getSdk } from "../../graphql/generated/sdk";
import { StepsForm } from "./StepsForm";
import { DailyCalorieSummary } from "./DailyCalorieSummary";
import { EmptyState } from "../../components/EmptyState";
import { QueryState } from "../../components/QueryState";
import { PeriodSelector, type AggregationPeriod } from "../../components/PeriodSelector";

const sdk = getSdk(graphqlClient);
const dailyCalorieSummariesBaseKey = ["dailyCalorieSummaries"];

const Root = styled(Stack)({
  maxWidth: 480,
});

export const StepsPage = () => {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<AggregationPeriod>("DAILY");

  const { data, isLoading } = useQuery({
    queryKey: [...dailyCalorieSummariesBaseKey, period],
    queryFn: () => sdk.DailyCalorieSummaries({ period }),
  });

  const upsertMutation = useMutation({
    // キーの先頭が一致する全periodのキャッシュをまとめて無効化する
    // (表示中のperiod以外もいずれ見る可能性があるため)。
    mutationFn: (input: { date: string; steps: number }) => sdk.UpsertStepRecord({ input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dailyCalorieSummariesBaseKey }),
  });

  const summaries = data?.dailyCalorieSummaries ?? [];

  return (
    <Root spacing={4}>
      <Typography variant="h5" component="h1">
        歩数記録
      </Typography>
      <StepsForm onSubmit={(values) => upsertMutation.mutate(values)} />
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
