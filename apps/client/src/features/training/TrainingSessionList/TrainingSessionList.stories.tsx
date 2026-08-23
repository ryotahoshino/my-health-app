import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
// T038で実装する(このテストは実装が無い間は失敗する)。
// 契約: props = {
//   sessions: { id, date, durationMinutes, intensity, exerciseSets: { id, exerciseId, sets, reps, weightKg }[] }[],
//   exercises: { id: string; name: string }[], // exerciseIdから種目名を解決するための参照データ
// }
//       各セッションに日付・実施時間・強度、および種目内訳(種目名・セット数・回数・重量)を表示する
import { TrainingSessionList } from "./TrainingSessionList";

const exercises = [
  { id: "bench-press", name: "ベンチプレス" },
  { id: "squat", name: "スクワット" },
];

const sessions = [
  {
    id: "session-1",
    date: "2026-03-01",
    durationMinutes: 60,
    intensity: "MEDIUM" as const,
    exerciseSets: [
      { id: "set-1", exerciseId: "bench-press", sets: 3, reps: 10, weightKg: 50 },
      { id: "set-2", exerciseId: "squat", sets: 4, reps: 8, weightKg: 60 },
    ],
  },
];

const meta: Meta<typeof TrainingSessionList> = {
  title: "features/training/TrainingSessionList",
  component: TrainingSessionList,
  args: {
    sessions,
    exercises,
  },
};
export default meta;

type Story = StoryObj<typeof TrainingSessionList>;

export const ShowsSessionSummary: Story = {
  name: "セッションの日付・実施時間・強度が表示される",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("2026-03-01")).toBeInTheDocument();
    await expect(canvas.getByText(/60\s*分/)).toBeInTheDocument();
    await expect(canvas.getByText("中強度")).toBeInTheDocument();
  },
};

export const ShowsExerciseBreakdown: Story = {
  name: "種目内訳(種目名・セット数・回数・重量)が表示される",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/ベンチプレス/)).toBeInTheDocument();
    await expect(canvas.getByText(/スクワット/)).toBeInTheDocument();
    await expect(canvas.getByText(/3セット/)).toBeInTheDocument();
    await expect(canvas.getByText(/10回/)).toBeInTheDocument();
    await expect(canvas.getByText(/50kg/)).toBeInTheDocument();
  },
};
