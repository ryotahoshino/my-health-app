import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
// T047で実装する(このテストは実装が無い間は失敗する)。
// 契約: props = {
//   calorieEstimate: { calories: number | null; formula: string; source: string;
//                       assumedConstants: { label: string; value: number; unit: string }[] },
//   totalVolume: number,
// }
//       calories が null の場合は「算出不可」を示す表示にする(FR-011)
//       計算式・定数・出典(算出根拠)は常に確認できる(原則VII)
import { SessionCalorieCard } from "./SessionCalorieCard";

const meta: Meta<typeof SessionCalorieCard> = {
  title: "features/training/SessionCalorieCard",
  component: SessionCalorieCard,
};
export default meta;

type Story = StoryObj<typeof SessionCalorieCard>;

export const WithCalorieEstimate: Story = {
  name: "消費カロリー・算出根拠・総ボリュームが表示される",
  args: {
    totalVolume: 3420,
    calorieEstimate: {
      calories: 350,
      formula: "消費カロリー(kcal) = METs × 体重(kg) × 実施時間(h)",
      assumedConstants: [{ label: "中強度のMETs", value: 5, unit: "METs" }],
      source: "国立健康・栄養研究所「改訂版 身体活動のメッツ(METs)表」",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/350\s*kcal/)).toBeInTheDocument();
    await expect(canvas.getByText(/METs × 体重/)).toBeInTheDocument();
    await expect(canvas.getByText(/国立健康・栄養研究所/)).toBeInTheDocument();
    await expect(canvas.getByText(/3420\s*kg/)).toBeInTheDocument();
  },
};

export const WithoutWeightRecord: Story = {
  name: "体重未記録の場合は算出不可と表示される",
  args: {
    totalVolume: 1500,
    calorieEstimate: {
      calories: null,
      formula: "消費カロリー(kcal) = METs × 体重(kg) × 実施時間(h)",
      assumedConstants: [{ label: "中強度のMETs", value: 5, unit: "METs" }],
      source: "国立健康・栄養研究所「改訂版 身体活動のメッツ(METs)表」",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/算出できません|算出不可/)).toBeInTheDocument();
  },
};
