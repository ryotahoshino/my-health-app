import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../../app/api";
import { trainingQueryKeys } from "./trainingQueryKeys";

export const useTrainingSessions = () => {
  const api = useApi();

  return useQuery({
    queryKey: trainingQueryKeys.sessions,
    queryFn: () => api.TrainingSessions(),
  });
};
