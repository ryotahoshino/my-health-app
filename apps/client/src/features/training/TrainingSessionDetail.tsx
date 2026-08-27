import { Button, Card, CardContent, List, ListItem, Typography } from "@mui/material";
import { SessionCalorieCard, type CalorieEstimate } from "./SessionCalorieCard";

export interface TrainingSessionDetailExerciseSet {
  id: string;
  exerciseId: string;
  sets: number;
  reps: number;
  weightKg: number;
}

export interface TrainingSessionDetailItem {
  id: string;
  date: string;
  durationMinutes: number;
  intensity: "LOW" | "MEDIUM" | "HIGH";
  exerciseSets: TrainingSessionDetailExerciseSet[];
  totalVolume: number;
  calorieEstimate: CalorieEstimate;
}

export interface TrainingSessionDetailProps {
  session: TrainingSessionDetailItem;
  exercises: { id: string; name: string }[];
  onDelete?: () => void;
}

const intensityLabels: Record<TrainingSessionDetailItem["intensity"], string> = {
  LOW: "低強度",
  MEDIUM: "中強度",
  HIGH: "高強度",
};

// セッション詳細(種目内訳 + 消費カロリー/総ボリューム)。体重未記録の場合は
// SessionCalorieCard側が「算出できません」の表示になる(FR-011)。
export const TrainingSessionDetail = ({
  session,
  exercises,
  onDelete,
}: TrainingSessionDetailProps) => {
  const exerciseNameById = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));

  return (
    <Card variant="outlined">
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
          <Button size="small" onClick={onDelete}>
            削除
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
