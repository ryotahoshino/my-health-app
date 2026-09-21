import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../../app/api";
import { trainingQueryKeys } from "./trainingQueryKeys";

// 種目マスタは記録の入力(選択肢)と一覧(IDから名称への変換)の両方で使う。
export const useExerciseCatalog = () => {
  const api = useApi();

  return useQuery({
    queryKey: trainingQueryKeys.exerciseCatalog,
    queryFn: () => api.ExerciseCatalog(),
  });
};
