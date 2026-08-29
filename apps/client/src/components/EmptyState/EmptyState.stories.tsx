import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
// 契約: props = { message: string; description?: string }
//       記録が0件の画面で、記録がないことを分かりやすく示す(FR-023)。
//       descriptionは作成導線(例: 「上のフォームから追加しましょう」)を
//       示すためのもので省略可能(食材一覧のような参照専用画面向け)。
import { EmptyState } from "./EmptyState";

const meta: Meta<typeof EmptyState> = {
  title: "components/EmptyState",
  component: EmptyState,
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

export const WithDescription: Story = {
  name: "メッセージと作成導線の説明をあわせて表示する",
  args: {
    message: "体重の記録はまだありません",
    description: "上のフォームから最初の記録を追加しましょう",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("体重の記録はまだありません")).toBeInTheDocument();
    await expect(
      canvas.getByText("上のフォームから最初の記録を追加しましょう"),
    ).toBeInTheDocument();
  },
};

export const MessageOnly: Story = {
  name: "作成導線が無い画面ではメッセージのみを表示する",
  args: {
    message: "食材データがありません",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("食材データがありません")).toBeInTheDocument();
  },
};
