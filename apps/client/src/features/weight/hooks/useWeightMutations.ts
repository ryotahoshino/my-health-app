import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../../app/api";
import { weightQueryKeys } from "./weightQueryKeys";

export type WeightRecordInput = {
  date: string;
  weightKg: number;
};

// 記録の追加・削除はどちらも一覧と全期間の集計に影響するため、無効化の範囲は同じ。
export const useWeightMutations = () => {
  const api = useApi();
  const queryClient = useQueryClient();

  const invalidateWeightQueries = () => {
    queryClient.invalidateQueries({ queryKey: weightQueryKeys.records });
    queryClient.invalidateQueries({ queryKey: weightQueryKeys.aggregateBase });
  };

  const upsert = useMutation({
    mutationFn: (input: WeightRecordInput) => api.UpsertWeightRecord({ input }),
    onSuccess: invalidateWeightQueries,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.DeleteWeightRecord({ id }),
    onSuccess: invalidateWeightQueries,
  });

  return { upsert, remove };
};
