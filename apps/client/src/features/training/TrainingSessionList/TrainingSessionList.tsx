import { Button, List, ListItem, Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { SessionCalorieCard, type CalorieEstimate } from "../SessionCalorieCard";
import { Section } from "../../../components/Section";

export type TrainingSessionListExerciseSet = {
  id: string;
  exerciseId: string;
  sets: number;
  reps: number;
  weightKg: number;
};

export type TrainingSessionListItem = {
  id: string;
  date: string;
  durationMinutes: number;
  intensity: "LOW" | "MEDIUM" | "HIGH";
  exerciseSets: TrainingSessionListExerciseSet[];
  totalVolume: number;
  calorieEstimate: CalorieEstimate;
};

export type TrainingSessionListProps = {
  sessions: TrainingSessionListItem[];
  exercises: { id: string; name: string }[];
  onDelete?: (session: TrainingSessionListItem) => void;
};

const intensityLabels: Record<TrainingSessionListItem["intensity"], string> = {
  LOW: "低強度",
  MEDIUM: "中強度",
  HIGH: "高強度",
};

const Root = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(2),
}));

// 余白は面(Section)側で与えるため、一覧自体は余白を持たない。
const ExerciseSets = styled(List)({
  padding: 0,
});

// 操作は内容から少し離して置き、誤操作しにくくする。
const DeleteAction = styled("div")(({ theme }) => ({
  paddingTop: theme.spacing(1),
  alignSelf: "flex-start",
}));

// セッション一覧・詳細(種目内訳 + 消費カロリー/総ボリューム表示)。種目名は
// exerciseIdをキーにexercises(種目マスタ参照データ)から解決する(FR-007)。
// 体重未記録の場合はSessionCalorieCard側が「算出できません」の表示になる(FR-011)。
// 1セッションを1つの面にまとめ、日付・実施時間・強度をそのまとまりの見出しにする。
// 内側の消費カロリーは面にせず、面の入れ子を2段までに保つ(data-model.md #5)。
export const TrainingSessionList = ({
  sessions,
  exercises,
  onDelete,
}: TrainingSessionListProps) => {
  const exerciseNameById = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));

  return (
    <Root>
      {sessions.map((session) => {
        const title = `${session.date} ・ ${session.durationMinutes}分 ・ ${intensityLabels[session.intensity]}`;

        return (
          <Section key={session.id} title={title}>
            <ExerciseSets dense disablePadding>
              {session.exerciseSets.map((exerciseSet) => (
                <ListItem key={exerciseSet.id} disableGutters disablePadding>
                  <Typography variant="body1">
                    {exerciseNameById.get(exerciseSet.exerciseId) ?? exerciseSet.exerciseId}{" "}
                    {exerciseSet.sets}セット × {exerciseSet.reps}回 × {exerciseSet.weightKg}kg
                  </Typography>
                </ListItem>
              ))}
            </ExerciseSets>
            <SessionCalorieCard
              calorieEstimate={session.calorieEstimate}
              totalVolume={session.totalVolume}
            />
            {onDelete && (
              <DeleteAction>
                <Button variant="outlined" onClick={() => onDelete(session)}>
                  削除
                </Button>
              </DeleteAction>
            )}
          </Section>
        );
      })}
    </Root>
  );
};
