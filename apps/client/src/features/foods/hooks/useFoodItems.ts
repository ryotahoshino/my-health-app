import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../../app/api";
import { foodsQueryKeys } from "./foodsQueryKeys";

export const useFoodItems = () => {
  const api = useApi();

  return useQuery({
    queryKey: foodsQueryKeys.items,
    queryFn: () => api.FoodItems(),
  });
};
