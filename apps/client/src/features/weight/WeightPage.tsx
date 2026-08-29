import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { graphqlClient } from "../../app/queryClient";
import { getSdk } from "../../graphql/generated/sdk";
import { WeightForm } from "./WeightForm";
import { WeightTrend } from "./WeightTrend";
import { WeightTrendAggregate } from "./WeightTrendAggregate";
import { EmptyState } from "../../components/EmptyState";
import { PeriodSelector, type AggregationPeriod } from "../../components/PeriodSelector";

const sdk = getSdk(graphqlClient);
const weightRecordsQueryKey = ["weightRecords"];

const Root = styled(Stack)({
  maxWidth: 480,
});

export const WeightPage = () => {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<AggregationPeriod>("DAILY");

  // 日次はこれまでどおり生の記録一覧(グラフ/表切替・削除操作つき)を表示し、
  // 週次・月次のみ期間集計(平均)を別クエリで取得する。
  const { data, isLoading } = useQuery({
    queryKey: weightRecordsQueryKey,
    queryFn: () => sdk.WeightRecords(),
  });

  const { data: aggregateData, isLoading: isAggregateLoading } = useQuery({
    queryKey: ["weightTrendAggregate", period],
    queryFn: () => sdk.WeightTrendAggregate({ period }),
    enabled: period !== "DAILY",
  });

  const upsertMutation = useMutation({
    mutationFn: (input: { date: string; weightKg: number }) => sdk.UpsertWeightRecord({ input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weightRecordsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["weightTrendAggregate"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.DeleteWeightRecord({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weightRecordsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["weightTrendAggregate"] });
    },
  });

  const records = data?.weightRecords ?? [];
  const aggregatePoints = aggregateData?.weightTrendAggregate ?? [];

  // 日次(生の記録一覧)と週次・月次(期間集計)はデータソースが異なるだけで、
  // 読み込み中・0件・表示の3分岐は共通なので、どちらを見るかだけをここで
  // 決めてから分岐を1回にまとめる。
  let isCurrentLoading: boolean;
  let isEmpty: boolean;
  let loadedContent;
  if (period === "DAILY") {
    isCurrentLoading = isLoading;
    isEmpty = records.length === 0;
    loadedContent = (
      <WeightTrend
        records={records}
        onDelete={(record) => record.id && deleteMutation.mutate(record.id)}
      />
    );
  } else {
    isCurrentLoading = isAggregateLoading;
    isEmpty = aggregatePoints.length === 0;
    loadedContent = <WeightTrendAggregate points={aggregatePoints} />;
  }

  let content;
  if (isCurrentLoading) {
    content = <Typography>読み込み中...</Typography>;
  } else if (isEmpty) {
    content = (
      <EmptyState
        message="体重の記録はまだありません"
        description="上のフォームから最初の記録を追加しましょう"
      />
    );
  } else {
    content = loadedContent;
  }

  return (
    <Root spacing={4}>
      <Typography variant="h5" component="h1">
        体重記録
      </Typography>
      <WeightForm onSubmit={(values) => upsertMutation.mutate(values)} />
      <PeriodSelector value={period} onChange={setPeriod} />
      {content}
    </Root>
  );
};
