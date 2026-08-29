import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
// 契約: props = { points: { periodLabel: string; hasData: boolean; value: number | null }[] }
//       週次・月次など期間集計されたPeriodAggregatePointの一覧を表で表示する。
//       記録がない期間(hasData: false)は0ではなく「欠測」として区別する
//       (Edge Cases、FR-016)。
import { WeightTrendAggregate } from "./WeightTrendAggregate";

const meta: Meta<typeof WeightTrendAggregate> = {
  title: "features/weight/WeightTrendAggregate",
  component: WeightTrendAggregate,
};
export default meta;

type Story = StoryObj<typeof WeightTrendAggregate>;

export const ShowsAggregatedValuesAndMissingPeriods: Story = {
  name: "集計値と欠測期間を区別して表示する",
  args: {
    points: [
      { periodLabel: "2026-08-03週", hasData: true, value: 70.5 },
      { periodLabel: "2026-08-10週", hasData: false, value: null },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("2026-08-03週")).toBeInTheDocument();
    await expect(canvas.getByText(/70\.5\s*kg/)).toBeInTheDocument();
    await expect(canvas.getByText("2026-08-10週")).toBeInTheDocument();
    await expect(canvas.getByText("欠測")).toBeInTheDocument();
  },
};
