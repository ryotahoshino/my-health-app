import { Button, Card, CardContent, List, ListItem, Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { SessionCalorieCard, type CalorieEstimate } from "../SessionCalorieCard";

export interface TrainingSessionListExerciseSet {
  id: string;
  exerciseId: string;
  sets: number;
  reps: number;
  weightKg: number;
}

export interface TrainingSessionListItem {
  id: string;
  date: string;
  durationMinutes: number;
  intensity: "LOW" | "MEDIUM" | "HIGH";
  exerciseSets: TrainingSessionListExerciseSet[];
  totalVolume: number;
  calorieEstimate: CalorieEstimate;
}

export interface TrainingSessionListProps {
  sessions: TrainingSessionListItem[];
  exercises: { id: string; name: string }[];
  onDelete?: (session: TrainingSessionListItem) => void;
}

const intensityLabels: Record<TrainingSessionListItem["intensity"], string> = {
  LOW: "低強度",
  MEDIUM: "中強度",
  HIGH: "高強度",
};

const Root = styled(Stack)({
  gap: 16,
});

// セッション一覧・詳細(種目内訳 + 消費カロリー/総ボリューム表示)。種目名は
// exerciseIdをキーにexercises(種目マスタ参照データ)から解決する(FR-007)。
// 体重未記録の場合はSessionCalorieCard側が「算出できません」の表示になる(FR-011)。
export const TrainingSessionList = ({
  sessions,
  exercises,
  onDelete,
}: TrainingSessionListProps) => {
  const exerciseNameById = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));

  return (
    <Root>
      {sessions.map((session) => (
        <Card key={session.id} variant="outlined">
          <CardContent>
            <Typography variant="subtitle1">
              <span>{session.date}</span> ・ <span>{session.durationMinutes}分</span> ・{" "}
              <span>{intensityLabels[session.intensity]}</span>
            </Typography>
            <List dense>
              {session.exerciseSets.map((exerciseSet) => (
                <ListItem key={exerciseSet.id} disableGutters>
                  {exerciseNameById.get(exerciseSet.exerciseId) ?? exerciseSet.exerciseId}{" "}
                  {exerciseSet.sets}セット × {exerciseSet.reps}回 × {exerciseSet.weightKg}kg
                </ListItem>
              ))}
            </List>
            <SessionCalorieCard
              calorieEstimate={session.calorieEstimate}
              totalVolume={session.totalVolume}
            />
            {onDelete && (
              <Button size="small" onClick={() => onDelete(session)}>
                削除
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </Root>
  );
};
