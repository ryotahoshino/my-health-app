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

// dailyCalorieSummariesのdateは、週次・月次でもバケットの開始日
// (YYYY-MM-DD)をそのまま返す(サーバー側は単一のdateフィールドしか
// 持たないため)。表示上「3月1日の記録」のように誤読されないよう、
// 選択中のperiodに応じてweightTrendAggregateのperiodLabelと同じ書式に
// 整形する(apps/server/src/domain/period/periodAggregate.tsのラベル
// 生成ロジックと表示上の書式を合わせているだけで、集計そのものは
// サーバー側の結果をそのまま使う)。
const formatPeriodLabel = (date: string, period: AggregationPeriod): string => {
  if (period === "WEEKLY") {
    return `${date}週`;
  }
  if (period === "MONTHLY") {
    const [year, month] = date.split("-");
    return `${year}年${Number(month)}月`;
  }
  return date;
};

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
            date={formatPeriodLabel(summary.date, period)}
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
