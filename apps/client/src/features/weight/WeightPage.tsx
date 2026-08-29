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
import { QueryState } from "../../components/QueryState";
import { PeriodSelector, type AggregationPeriod } from "../../components/PeriodSelector";

const sdk = getSdk(graphqlClient);
const weightRecordsQueryKey = ["weightRecords"];
const weightTrendAggregateBaseKey = ["weightTrendAggregate"];

const Root = styled(Stack)({
  maxWidth: 480,
});

export const WeightPage = () => {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<AggregationPeriod>("DAILY");

  // 日次はこれまでどおり生の記録一覧(グラフ/表切替・削除操作つき)を表示し、
  // 週次・月次のみ期間集計(平均)を別クエリで取得する。表示していない方の
  // クエリはenabled: falseで無効化し、無駄なfetchを避ける。
  const { data, isLoading } = useQuery({
    queryKey: weightRecordsQueryKey,
    queryFn: () => sdk.WeightRecords(),
    enabled: period === "DAILY",
  });

  const { data: aggregateData, isLoading: isAggregateLoading } = useQuery({
    queryKey: [...weightTrendAggregateBaseKey, period],
    queryFn: () => sdk.WeightTrendAggregate({ period }),
    enabled: period !== "DAILY",
  });

  const upsertMutation = useMutation({
    mutationFn: (input: { date: string; weightKg: number }) => sdk.UpsertWeightRecord({ input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weightRecordsQueryKey });
      queryClient.invalidateQueries({ queryKey: weightTrendAggregateBaseKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.DeleteWeightRecord({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weightRecordsQueryKey });
      queryClient.invalidateQueries({ queryKey: weightTrendAggregateBaseKey });
    },
  });

  const records = data?.weightRecords ?? [];
  const aggregatePoints = aggregateData?.weightTrendAggregate ?? [];

  // 日次(生の記録一覧)と週次・月次(期間集計)はデータソースが異なるだけで、
  // 読み込み中・0件・表示の3分岐はQueryStateに共通化しているため、
  // どちらを見るかだけをここで決める。
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

  return (
    <Root spacing={4}>
      <Typography variant="h5" component="h1">
        体重記録
      </Typography>
      <WeightForm onSubmit={(values) => upsertMutation.mutate(values)} />
      <PeriodSelector value={period} onChange={setPeriod} />
      <QueryState
        isLoading={isCurrentLoading}
        isEmpty={isEmpty}
        emptyState={
          <EmptyState
            message="体重の記録はまだありません"
            description="上のフォームから最初の記録を追加しましょう"
          />
        }
      >
        {loadedContent}
      </QueryState>
    </Root>
  );
};
