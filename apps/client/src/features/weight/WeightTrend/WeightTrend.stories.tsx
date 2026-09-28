import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
// T025で実装する(このテストは実装が無い間は失敗する)。
// 契約: props = { records: { date: string; weightKg: number }[] }
//       既定はグラフ表示。「表で見る」ボタンで表形式に切り替えられる(FR-004)
//       推移の要約をテキストでも提供する(原則I: グラフの非視覚的代替)
import { WeightTrend } from "./WeightTrend";

const sampleRecords = [
  { date: "2026-01-01", weightKg: 68.5 },
  { date: "2026-01-08", weightKg: 68.0 },
  { date: "2026-01-15", weightKg: 67.5 },
];

const meta: Meta<typeof WeightTrend> = {
  title: "features/weight/WeightTrend",
  component: WeightTrend,
  args: {
    records: sampleRecords,
  },
};
export default meta;

type Story = StoryObj<typeof WeightTrend>;

export const ToggleToTable: Story = {
  name: "表形式に切り替えると同じデータが読める",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "表で見る" }));

    const table = canvas.getByRole("table");
    await expect(within(table).getByText("2026-01-01")).toBeInTheDocument();
    await expect(within(table).getByText("68.5")).toBeInTheDocument();
    await expect(within(table).getByText("67.5")).toBeInTheDocument();
  },
};

export const TextSummary: Story = {
  name: "推移の要約がテキストでも読める",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/67\.5\s*kg/)).toBeInTheDocument();
  },
};

// T049 で要約・切替・グラフ(表)を1つの面にまとめ、見出しを付ける(FR-004 / FR-010)。
export const HasSectionHeading: Story = {
  name: "推移のまとまりに見出しがある",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("heading", { name: "体重の推移" })).toBeInTheDocument();
    const section = canvas.getByRole("region", { name: "体重の推移" });
    await expect(within(section).getByText(/67\.5\s*kg/)).toBeInTheDocument();
  },
};
