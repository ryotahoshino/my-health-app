import { useState, type ReactNode } from "react";
import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useWeightMutations, useWeightRecords, useWeightTrendAggregate } from "../hooks";
import { WeightForm } from "../WeightForm";
import { WeightTrend } from "../WeightTrend";
import { WeightTrendAggregate } from "../WeightTrendAggregate";
import { EmptyState } from "../../../components/EmptyState";
import { QueryState } from "../../../components/QueryState";
import { PeriodSelector, type AggregationPeriod } from "../../../components/PeriodSelector";

const Root = styled(Stack)(({ theme }) => ({
  maxWidth: theme.layout.contentNarrow,
}));

// 画面はデータフックと表示部品を組み合わせるだけにし、API 呼び出し・クエリキー・
// キャッシュ無効化は features/weight/hooks/ に置く(contracts/api-injection.md)。
export const WeightPage = () => {
  const [period, setPeriod] = useState<AggregationPeriod>("DAILY");

  // 日次はこれまでどおり生の記録一覧(グラフ/表切替・削除操作つき)を表示し、
  // 週次・月次のみ期間集計(平均)を別クエリで取得する。表示していない方の
  // クエリは無効化し、無駄なfetchを避ける。
  const { data, isLoading } = useWeightRecords(period === "DAILY");
  const { data: aggregateData, isLoading: isAggregateLoading } = useWeightTrendAggregate(
    period,
    period !== "DAILY",
  );
  const { upsert, remove } = useWeightMutations();

  const records = data?.weightRecords ?? [];
  const aggregatePoints = aggregateData?.weightTrendAggregate ?? [];

  // 日次(生の記録一覧)と週次・月次(期間集計)はデータソースが異なるだけで、
  // 読み込み中・0件・表示の3分岐はQueryStateに共通化しているため、
  // どちらを見るかを1つの選択としてここで決める。
  let current: { isLoading: boolean; isEmpty: boolean; content: ReactNode };
  if (period === "DAILY") {
    current = {
      isLoading,
      isEmpty: records.length === 0,
      content: (
        <WeightTrend
          records={records}
          onDelete={(record) => record.id && remove.mutate(record.id)}
        />
      ),
    };
  } else {
    current = {
      isLoading: isAggregateLoading,
      isEmpty: aggregatePoints.length === 0,
      content: <WeightTrendAggregate points={aggregatePoints} />,
    };
  }

  return (
    <Root spacing={4}>
      <Typography variant="h5" component="h1">
        体重記録
      </Typography>
      <WeightForm onSubmit={(values) => upsert.mutate(values)} />
      <PeriodSelector value={period} onChange={setPeriod} />
      <QueryState
        isLoading={current.isLoading}
        isEmpty={current.isEmpty}
        emptyState={
          <EmptyState
            message="体重の記録はまだありません"
            description="上のフォームから最初の記録を追加しましょう"
          />
        }
      >
        {current.content}
      </QueryState>
    </Root>
  );
};
