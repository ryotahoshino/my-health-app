import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { graphqlClient } from "../../app/queryClient";
import { getSdk } from "../../graphql/generated/sdk";
import { WeightForm } from "./WeightForm";
import { WeightTrend } from "./WeightTrend";
import { WeightEmptyState } from "./WeightEmptyState";

const sdk = getSdk(graphqlClient);
const weightRecordsQueryKey = ["weightRecords"];

const Root = styled(Stack)({
  maxWidth: 480,
});

export const WeightPage = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: weightRecordsQueryKey,
    queryFn: () => sdk.WeightRecords(),
  });

  const upsertMutation = useMutation({
    mutationFn: (input: { date: string; weightKg: number }) => sdk.UpsertWeightRecord({ input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: weightRecordsQueryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.DeleteWeightRecord({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: weightRecordsQueryKey }),
  });

  const records = data?.weightRecords ?? [];

  return (
    <Root spacing={4}>
      <Typography variant="h5" component="h1">
        体重記録
      </Typography>
      <WeightForm onSubmit={(values) => upsertMutation.mutate(values)} />
      {isLoading ? (
        <Typography>読み込み中...</Typography>
      ) : records.length === 0 ? (
        <WeightEmptyState />
      ) : (
        <WeightTrend
          records={records}
          onDelete={(record) => record.id && deleteMutation.mutate(record.id)}
        />
      )}
    </Root>
  );
};
