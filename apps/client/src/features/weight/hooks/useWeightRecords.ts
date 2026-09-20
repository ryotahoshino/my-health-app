import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../../app/api";
import { weightQueryKeys } from "./weightQueryKeys";

// 日次のときだけ記録一覧を取得する(週次・月次は集計だけを見るため無効化する)。
// リファクタ前と同じ取得条件を保つ(FR-013)。
export const useWeightRecords = (enabled: boolean) => {
  const api = useApi();

  return useQuery({
    queryKey: weightQueryKeys.records,
    queryFn: () => api.WeightRecords(),
    enabled,
  });
};
