import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { graphqlClient } from "../../app/queryClient";
import { getSdk } from "../../graphql/generated/sdk";
import { StepsForm } from "./StepsForm";
import { DailyCalorieSummary } from "./DailyCalorieSummary";
import { EmptyState } from "../../components/EmptyState";
import { PeriodSelector, type AggregationPeriod } from "../../components/PeriodSelector";

const sdk = getSdk(graphqlClient);

const Root = styled(Stack)({
  maxWidth: 480,
});

export const StepsPage = () => {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<AggregationPeriod>("DAILY");
  const dailyCalorieSummariesQueryKey = ["dailyCalorieSummaries", period];

  const { data, isLoading } = useQuery({
    queryKey: dailyCalorieSummariesQueryKey,
    queryFn: () => sdk.DailyCalorieSummaries({ period }),
  });

  const upsertMutation = useMutation({
    mutationFn: (input: { date: string; steps: number }) => sdk.UpsertStepRecord({ input }),
    // キーの先頭("dailyCalorieSummaries")が一致する全periodのキャッシュを
    // まとめて無効化する(表示中のperiod以外もいずれ見る可能性があるため)。
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dailyCalorieSummaries"] }),
  });

  const summaries = data?.dailyCalorieSummaries ?? [];

  let content;
  if (isLoading) {
    content = <Typography>読み込み中...</Typography>;
  } else if (summaries.length === 0) {
    content = (
      <EmptyState
        message="歩数記録はまだありません"
        description="上のフォームから最初の記録を追加しましょう"
      />
    );
  } else {
    content = (
      <Stack spacing={2}>
        {summaries.map((summary) => (
          <DailyCalorieSummary
            key={summary.date}
            date={summary.date}
            trainingCalories={summary.trainingCalories}
            stepCalorieEstimate={summary.stepCalorieEstimate}
            totalCalories={summary.totalCalories}
          />
        ))}
      </Stack>
    );
  }

  return (
    <Root spacing={4}>
      <Typography variant="h5" component="h1">
        歩数記録
      </Typography>
      <StepsForm onSubmit={(values) => upsertMutation.mutate(values)} />
      <PeriodSelector value={period} onChange={setPeriod} />
      {content}
    </Root>
  );
};
