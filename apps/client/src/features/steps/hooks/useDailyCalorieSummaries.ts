import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../../app/api";
import type { AggregationPeriod } from "../../../components/PeriodSelector";
import { stepsQueryKeys } from "./stepsQueryKeys";

export const useDailyCalorieSummaries = (period: AggregationPeriod) => {
  const api = useApi();

  return useQuery({
    queryKey: stepsQueryKeys.summaries(period),
    queryFn: () => api.DailyCalorieSummaries({ period }),
  });
};
