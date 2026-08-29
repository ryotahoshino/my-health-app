import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { graphqlClient } from "../../app/queryClient";
import { getSdk } from "../../graphql/generated/sdk";
import { TrainingSessionForm } from "./TrainingSessionForm";
import { TrainingSessionList } from "./TrainingSessionList";
import { EmptyState } from "../../components/EmptyState";
import { QueryState } from "../../components/QueryState";

const sdk = getSdk(graphqlClient);
const trainingSessionsQueryKey = ["trainingSessions"];
const exerciseCatalogQueryKey = ["exerciseCatalog"];

const Root = styled(Stack)({
  maxWidth: 640,
});

export const TrainingPage = () => {
  const queryClient = useQueryClient();

  const { data: exerciseCatalogData } = useQuery({
    queryKey: exerciseCatalogQueryKey,
    queryFn: () => sdk.ExerciseCatalog(),
  });

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: trainingSessionsQueryKey,
    queryFn: () => sdk.TrainingSessions(),
  });

  const upsertMutation = useMutation({
    mutationFn: (input: {
      date: string;
      durationMinutes: number;
      intensity: "LOW" | "MEDIUM" | "HIGH";
      exerciseSets: { exerciseId: string; sets: number; reps: number; weightKg: number }[];
    }) => sdk.UpsertTrainingSession({ input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trainingSessionsQueryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.DeleteTrainingSession({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trainingSessionsQueryKey }),
  });

  const exercises = exerciseCatalogData?.exerciseCatalog ?? [];
  const sessions = sessionsData?.trainingSessions ?? [];

  return (
    <Root spacing={4}>
      <Typography variant="h5" component="h1">
        トレーニング記録
      </Typography>
      <TrainingSessionForm
        exercises={exercises}
        onSubmit={(values) => upsertMutation.mutate(values)}
      />
      <QueryState
        isLoading={isLoading}
        isEmpty={sessions.length === 0}
        emptyState={
          <EmptyState
            message="トレーニング記録はまだありません"
            description="上のフォームから最初のセッションを記録しましょう"
          />
        }
      >
        <TrainingSessionList
          sessions={sessions}
          exercises={exercises}
          onDelete={(session) => deleteMutation.mutate(session.id)}
        />
      </QueryState>
    </Root>
  );
};
