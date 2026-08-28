import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
// T061で実装する(このテストは実装が無い間は失敗する)。
// 契約: props = { onSubmit: (values: { date: string; steps: number }) => void }
//       日付フィールドのlabelは「日付」、歩数フィールドのlabelは「歩数」
//       保存ボタンのaccessible nameは「保存」
//       バリデーションエラーは対象フィールドに関連付けて表示する(FR-019)
import { StepsForm } from "./StepsForm";

const meta: Meta<typeof StepsForm> = {
  title: "features/steps/StepsForm",
  component: StepsForm,
  args: {
    onSubmit: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof StepsForm>;

export const ValidSubmit: Story = {
  name: "正常な値を入力すると保存できる",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("日付"), "2026-01-01");
    await userEvent.type(canvas.getByLabelText("歩数"), "8000");
    await userEvent.click(canvas.getByRole("button", { name: "保存" }));

    await expect(args.onSubmit).toHaveBeenCalledWith({ date: "2026-01-01", steps: 8000 });
  },
};

export const MissingSteps: Story = {
  name: "歩数未入力の場合はエラーが対象フィールドに表示される",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("日付"), "2026-01-01");
    await userEvent.click(canvas.getByRole("button", { name: "保存" }));

    const stepsField = canvas.getByLabelText("歩数");
    await expect(stepsField).toBeInvalid();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const KeyboardOnly: Story = {
  name: "キーボードのみで入力から保存まで完了できる",
  play: async ({ args }) => {
    await userEvent.tab(); // 日付
    await userEvent.keyboard("2026-01-01");
    await userEvent.tab(); // 歩数
    await userEvent.keyboard("8000");
    await userEvent.tab(); // 保存ボタン
    await userEvent.keyboard("{Enter}");

    await expect(args.onSubmit).toHaveBeenCalledWith({ date: "2026-01-01", steps: 8000 });
  },
};
