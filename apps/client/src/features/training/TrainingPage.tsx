import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { graphqlClient } from "../../app/queryClient";
import { getSdk } from "../../graphql/generated/sdk";
import { TrainingSessionForm } from "./TrainingSessionForm";
import { TrainingSessionDetail } from "./TrainingSessionDetail";

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
      {isLoading ? (
        <Typography>読み込み中...</Typography>
      ) : sessions.length === 0 ? (
        <Typography>トレーニング記録はまだありません</Typography>
      ) : (
        sessions.map((session) => (
          <TrainingSessionDetail
            key={session.id}
            session={session}
            exercises={exercises}
            onDelete={() => deleteMutation.mutate(session.id)}
          />
        ))
      )}
    </Root>
  );
};
