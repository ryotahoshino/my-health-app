import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { graphqlClient } from "../../app/queryClient";
import { getSdk } from "../../graphql/generated/sdk";
import { StepsForm } from "./StepsForm";
import { DailyCalorieSummary } from "./DailyCalorieSummary";
import { EmptyState } from "../../components/EmptyState";

const sdk = getSdk(graphqlClient);
const dailyCalorieSummariesQueryKey = ["dailyCalorieSummaries"];

const Root = styled(Stack)({
  maxWidth: 480,
});

export const StepsPage = () => {
  const queryClient = useQueryClient();

  // 集計プリセット切替UI(PeriodSelector)はT074で導入する。それまでは
  // 従来どおり日次(1日1件の内訳)を既定表示とする。
  const { data, isLoading } = useQuery({
    queryKey: dailyCalorieSummariesQueryKey,
    queryFn: () => sdk.DailyCalorieSummaries({ period: "DAILY" }),
  });

  const upsertMutation = useMutation({
    mutationFn: (input: { date: string; steps: number }) => sdk.UpsertStepRecord({ input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dailyCalorieSummariesQueryKey }),
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
      {content}
    </Root>
  );
};
