import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { MemoryRouter } from "react-router";
import { AppRoutes } from "./AppRoutes";
import { createFakeApiClient } from "../test-support/createFakeApiClient";
import { withApiProviders } from "../test-support/withApiProviders";

// ブラウザを開いて確かめていた内容(4画面への遷移と、注入した API のデータが
// 表示されること)を Interaction Test で置き換える(research.md #5)。
// 画面ごとの詳細な振る舞いは各 *Page.stories.tsx が受け持つ。
const api = createFakeApiClient({
  WeightRecords: async () => ({
    weightRecords: [{ id: "1", date: "2026-01-14", weightKg: 68.5 }],
  }),
  TrainingSessions: async () => ({
    trainingSessions: [
      {
        id: "1",
        date: "2026-01-13",
        durationMinutes: 45,
        intensity: "MEDIUM" as const,
        totalVolume: 1200,
        exerciseSets: [{ id: "1-1", exerciseId: "squat", sets: 3, reps: 10, weightKg: 40 }],
        calorieEstimate: {
          calories: 260,
          formula: "METs × 体重 × 時間",
          source: "テスト用の固定値",
          assumedConstants: [{ label: "体重", value: 68, unit: "kg" }],
        },
      },
    ],
  }),
  ExerciseCatalog: async () => ({
    exerciseCatalog: [{ id: "squat", name: "スクワット", mets: 5, source: "テスト用の固定値" }],
  }),
  DailyCalorieSummaries: async () => ({
    dailyCalorieSummaries: [
      {
        date: "2026-01-12",
        periodLabel: "2026-01-12",
        trainingCalories: 260,
        stepCalories: 210,
        totalCalories: 470,
        isApproximate: true,
        stepCalorieEstimate: {
          calories: 210,
          formula: "歩数 × 体重 × 係数",
          source: "テスト用の固定値",
          assumedConstants: [{ label: "歩幅", value: 0.7, unit: "m" }],
        },
      },
    ],
  }),
  FoodItems: async () => ({
    foodItems: [
      { id: "1", name: "鶏むね肉", caloriesPer100g: 108, proteinG: 22.3, fatG: 1.5, carbG: 0.1 },
    ],
  }),
});

const meta: Meta<typeof AppRoutes> = {
  title: "app/AppRoutes",
  component: AppRoutes,
  decorators: [
    withApiProviders(api),
    (Story) => (
      // 実行時の BrowserRouter の代わりに、履歴をメモリ上に持つ Router を使う。
      <MemoryRouter initialEntries={["/weight"]}>
        <Story />
      </MemoryRouter>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof AppRoutes>;

export const NavigateAllScreens: Story = {
  name: "ナビゲーションから4画面に移動でき、各画面のデータが表示される",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 体重(初期表示)
    await expect(await canvas.findByRole("heading", { name: "体重記録" })).toBeInTheDocument();
    await expect(await canvas.findByText(/68\.5\s*kg/)).toBeInTheDocument();

    // トレーニング
    await userEvent.click(canvas.getByRole("link", { name: "トレーニング" }));
    // 遷移に合わせてナビゲーションの現在地も切り替わる(contracts/app-shell.md 3)。
    await expect(canvas.getByRole("link", { name: "トレーニング" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      await canvas.findByRole("heading", { name: "トレーニング記録" }),
    ).toBeInTheDocument();
    await expect(await canvas.findByText(/スクワット/)).toBeInTheDocument();

    // 歩数
    await userEvent.click(canvas.getByRole("link", { name: "歩数" }));
    await expect(await canvas.findByRole("heading", { name: "歩数記録" })).toBeInTheDocument();
    await expect(await canvas.findByText("2026-01-12")).toBeInTheDocument();

    // 食材
    await userEvent.click(canvas.getByRole("link", { name: "食材" }));
    await expect(await canvas.findByRole("heading", { name: "食材一覧" })).toBeInTheDocument();
    await expect(await canvas.findByRole("rowheader", { name: "鶏むね肉" })).toBeInTheDocument();

    // 体重へ戻る(キャッシュから再表示される)
    await userEvent.click(canvas.getByRole("link", { name: "体重" }));
    await expect(await canvas.findByText(/68\.5\s*kg/)).toBeInTheDocument();
  },
};
