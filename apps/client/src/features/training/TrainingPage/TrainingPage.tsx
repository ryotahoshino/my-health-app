import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useExerciseCatalog, useTrainingMutations, useTrainingSessions } from "../hooks";
import { TrainingSessionForm } from "../TrainingSessionForm";
import { TrainingSessionList } from "../TrainingSessionList";
import { EmptyState } from "../../../components/EmptyState";
import { QueryState } from "../../../components/QueryState";

const Root = styled(Stack)(({ theme }) => ({
  maxWidth: theme.layout.contentWide,
}));

export const TrainingPage = () => {
  const { data: exerciseCatalogData } = useExerciseCatalog();
  const { data: sessionsData, isLoading } = useTrainingSessions();
  const { upsert, remove } = useTrainingMutations();

  const exercises = exerciseCatalogData?.exerciseCatalog ?? [];
  const sessions = sessionsData?.trainingSessions ?? [];

  return (
    <Root spacing={4}>
      <Typography variant="h5" component="h1">
        トレーニング記録
      </Typography>
      <TrainingSessionForm exercises={exercises} onSubmit={(values) => upsert.mutate(values)} />
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
          onDelete={(session) => remove.mutate(session.id)}
        />
      </QueryState>
    </Root>
  );
};
