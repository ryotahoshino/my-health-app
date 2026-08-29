import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
// 契約: props = {
//   value: "DAILY" | "WEEKLY" | "MONTHLY",
//   onChange: (value: "DAILY" | "WEEKLY" | "MONTHLY") => void,
//   slotProps?: { toggleButtonGroup?: Partial<ToggleButtonGroupProps> },
// }
//       日次・週次・月次を排他選択できるトグルボタン群。選択中のボタンを
//       再クリックしても未選択状態にはならない(常にいずれか1つを選択、FR-016)。
import { PeriodSelector } from "./PeriodSelector";

const meta: Meta<typeof PeriodSelector> = {
  title: "components/PeriodSelector",
  component: PeriodSelector,
  args: {
    value: "DAILY",
    onChange: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof PeriodSelector>;

export const SwitchesPeriod: Story = {
  name: "週次・月次のボタンを選ぶとonChangeが呼ばれる",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "週次" }));
    await expect(args.onChange).toHaveBeenCalledWith("WEEKLY");

    await userEvent.click(canvas.getByRole("button", { name: "月次" }));
    await expect(args.onChange).toHaveBeenCalledWith("MONTHLY");
  },
};

export const KeepsSelectionOnReclick: Story = {
  name: "選択中のボタンを再度押しても未選択にはならない",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "日次" }));
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(canvas.getByRole("button", { name: "日次" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};

export const KeyboardOnly: Story = {
  name: "キーボードのみで期間を切り替えられる",
  play: async ({ args }) => {
    await userEvent.tab(); // 日次
    await userEvent.tab(); // 週次
    await userEvent.keyboard("{Enter}");

    await expect(args.onChange).toHaveBeenCalledWith("WEEKLY");
  },
};
