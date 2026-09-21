import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../../app/api";
import { trainingQueryKeys } from "./trainingQueryKeys";

export type TrainingSessionInput = {
  date: string;
  durationMinutes: number;
  intensity: "LOW" | "MEDIUM" | "HIGH";
  exerciseSets: { exerciseId: string; sets: number; reps: number; weightKg: number }[];
};

export const useTrainingMutations = () => {
  const api = useApi();
  const queryClient = useQueryClient();

  const invalidateSessions = () => {
    queryClient.invalidateQueries({ queryKey: trainingQueryKeys.sessions });
  };

  const upsert = useMutation({
    mutationFn: (input: TrainingSessionInput) => api.UpsertTrainingSession({ input }),
    onSuccess: invalidateSessions,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.DeleteTrainingSession({ id }),
    onSuccess: invalidateSessions,
  });

  return { upsert, remove };
};
