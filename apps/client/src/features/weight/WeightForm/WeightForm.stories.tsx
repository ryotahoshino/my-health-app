import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
// T024で実装する(このテストは実装が無い間は失敗する)。
// 契約: props = { onSubmit: (values: { date: string; weightKg: number }) => void }
//       日付フィールドのlabelは「日付」、体重フィールドのlabelは「体重(kg)」
//       保存ボタンのaccessible nameは「保存」
//       バリデーションエラーは対象フィールドに関連付けて表示する(FR-019)
import { WeightForm } from "./WeightForm";

const meta: Meta<typeof WeightForm> = {
  title: "features/weight/WeightForm",
  component: WeightForm,
  args: {
    onSubmit: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof WeightForm>;

export const ValidSubmit: Story = {
  name: "正常な値を入力すると保存できる",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("日付"), "2026-01-01");
    await userEvent.type(canvas.getByLabelText("体重(kg)"), "68.5");
    await userEvent.click(canvas.getByRole("button", { name: "保存" }));

    await expect(args.onSubmit).toHaveBeenCalledWith({ date: "2026-01-01", weightKg: 68.5 });
  },
};

export const MissingWeight: Story = {
  name: "体重未入力の場合はエラーが対象フィールドに表示される",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("日付"), "2026-01-01");
    await userEvent.click(canvas.getByRole("button", { name: "保存" }));

    const weightField = canvas.getByLabelText("体重(kg)");
    await expect(weightField).toBeInvalid();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const KeyboardOnly: Story = {
  name: "キーボードのみで入力から保存まで完了できる",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await userEvent.keyboard("2026-01-01");
    await userEvent.tab();
    await userEvent.keyboard("68.5");
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");

    const saveButton = canvas.getByRole("button", { name: "保存" });
    await expect(saveButton).toHaveFocus();
    await expect(args.onSubmit).toHaveBeenCalledWith({ date: "2026-01-01", weightKg: 68.5 });
  },
};
