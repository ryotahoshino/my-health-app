import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../../app/api";
import { stepsQueryKeys } from "./stepsQueryKeys";

export type StepRecordInput = {
  date: string;
  steps: number;
};

export const useStepsMutations = () => {
  const api = useApi();
  const queryClient = useQueryClient();

  const upsert = useMutation({
    mutationFn: (input: StepRecordInput) => api.UpsertStepRecord({ input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stepsQueryKeys.summariesBase }),
  });

  return { upsert };
};
