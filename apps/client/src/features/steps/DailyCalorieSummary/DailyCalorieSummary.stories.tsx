import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
// T062で実装する(このテストは実装が無い間は失敗する)。
// 契約: props = {
//   date: string,
//   trainingCalories: number | null,
//   stepCalorieEstimate: { calories: number | null; formula: string; source: string;
//                           assumedConstants: { label: string; value: number; unit: string }[] },
//   totalCalories: number | null,
// }
//       トレーニング分・歩数分・合計をあわせて表示し、合計は概算である旨を
//       明示する(FR-014)。歩数の算出根拠(計算式・定数・出典)も表示する(FR-013)。
import { DailyCalorieSummary } from "./DailyCalorieSummary";

const stepCalorieEstimate = {
  calories: 210,
  formula: "消費カロリー(kcal) = METs × 体重(kg) × 実施時間(h)",
  assumedConstants: [
    { label: "歩行のMETs", value: 3, unit: "METs" },
    { label: "ケイデンス", value: 100, unit: "歩/分" },
  ],
  source: "国立健康・栄養研究所「改訂版 身体活動のメッツ(METs)表」",
};

const meta: Meta<typeof DailyCalorieSummary> = {
  title: "features/steps/DailyCalorieSummary",
  component: DailyCalorieSummary,
};
export default meta;

type Story = StoryObj<typeof DailyCalorieSummary>;

export const CombinedTotal: Story = {
  name: "トレーニングと歩数の両方がある日は合算値と概算注記が表示される",
  args: {
    date: "2026-01-02",
    trainingCalories: 350,
    stepCalorieEstimate,
    totalCalories: 560,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/350\s*kcal/)).toBeInTheDocument();
    await expect(canvas.getByText(/210\s*kcal/)).toBeInTheDocument();
    await expect(canvas.getByText(/560\s*kcal/)).toBeInTheDocument();
    await expect(canvas.getByText(/概算/)).toBeInTheDocument();
  },
};

export const StepsOnly: Story = {
  name: "歩数のみ記録された日は歩数分のみの値が表示される",
  args: {
    date: "2026-01-03",
    trainingCalories: 0,
    stepCalorieEstimate,
    totalCalories: 210,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // トレーニング分が0なので、歩数分(210kcal)と合計(210kcal)が同じ値になる。
    await expect(canvas.getAllByText(/210\s*kcal/).length).toBeGreaterThanOrEqual(1);
    await expect(canvas.getByText(/METs × 体重/)).toBeInTheDocument();
    await expect(canvas.getByText(/国立健康・栄養研究所/)).toBeInTheDocument();
  },
};
