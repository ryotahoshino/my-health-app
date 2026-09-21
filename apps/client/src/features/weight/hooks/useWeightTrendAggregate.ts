import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../../app/api";
import type { AggregationPeriod } from "../../../components/PeriodSelector";
import { weightQueryKeys } from "./weightQueryKeys";

// 週次・月次のときだけ期間集計を取得する(日次は記録一覧を見るため無効化する)。
export const useWeightTrendAggregate = (period: AggregationPeriod, enabled: boolean) => {
  const api = useApi();

  return useQuery({
    queryKey: weightQueryKeys.aggregate(period),
    queryFn: () => api.WeightTrendAggregate({ period }),
    enabled,
  });
};
