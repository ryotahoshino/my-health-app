import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { graphqlClient } from "../../app/queryClient";
import { getSdk } from "../../graphql/generated/sdk";
import { WeightForm } from "./WeightForm";
import { WeightTrend } from "./WeightTrend";
import { EmptyState } from "../../components/EmptyState";

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

  let content;
  if (isLoading) {
    content = <Typography>読み込み中...</Typography>;
  } else if (records.length === 0) {
    content = (
      <EmptyState
        message="体重の記録はまだありません"
        description="上のフォームから最初の記録を追加しましょう"
      />
    );
  } else {
    content = (
      <WeightTrend
        records={records}
        onDelete={(record) => record.id && deleteMutation.mutate(record.id)}
      />
    );
  }

  return (
    <Root spacing={4}>
      <Typography variant="h5" component="h1">
        体重記録
      </Typography>
      <WeightForm onSubmit={(values) => upsertMutation.mutate(values)} />
      {content}
    </Root>
  );
};
