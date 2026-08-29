import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
// 契約: props = { isLoading: boolean; isEmpty: boolean; emptyState: ReactNode; children: ReactNode }
//       読み込み中→空状態→本体表示、の3分岐を各ページで共通化するための
//       ラッパー。4つのfeatureページ(Weight/Training/Steps/Foods)で同じ
//       分岐が重複していたのをここに集約する。
import { QueryState } from "./QueryState";

const meta: Meta<typeof QueryState> = {
  title: "components/QueryState",
  component: QueryState,
  args: {
    emptyState: <p>記録はまだありません</p>,
    children: <p>本体コンテンツ</p>,
  },
};
export default meta;

type Story = StoryObj<typeof QueryState>;

export const Loading: Story = {
  name: "読み込み中は本体・空状態のどちらも表示しない",
  args: { isLoading: true, isEmpty: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("読み込み中...")).toBeInTheDocument();
    await expect(canvas.queryByText("本体コンテンツ")).not.toBeInTheDocument();
    await expect(canvas.queryByText("記録はまだありません")).not.toBeInTheDocument();
  },
};

export const Empty: Story = {
  name: "0件時は空状態を表示する",
  args: { isLoading: false, isEmpty: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("記録はまだありません")).toBeInTheDocument();
    await expect(canvas.queryByText("本体コンテンツ")).not.toBeInTheDocument();
  },
};

export const Loaded: Story = {
  name: "データがある場合は本体を表示する",
  args: { isLoading: false, isEmpty: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("本体コンテンツ")).toBeInTheDocument();
    await expect(canvas.queryByText("記録はまだありません")).not.toBeInTheDocument();
  },
};
