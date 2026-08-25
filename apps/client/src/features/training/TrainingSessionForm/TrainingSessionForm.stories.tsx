import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
// T037で実装する(このテストは実装が無い間は失敗する)。
// 契約: props = {
//   exercises: { id: string; name: string }[],
//   onSubmit: (values: { date, durationMinutes, intensity, exerciseSets }) => void,
// }
//       日付「日付」、実施時間「実施時間(分)」、強度は「強度」ラベルのラジオグループ
//       (選択肢: 「低強度」「中強度」「高強度」、既定は「低強度」)
//       「種目を追加」ボタンで種目行(種目選択・セット数・回数・重量)を追加、
//       各行に「削除」ボタン。保存ボタンのaccessible nameは「保存」
import { TrainingSessionForm } from "./TrainingSessionForm";

const exercises = [
  { id: "bench-press", name: "ベンチプレス" },
  { id: "squat", name: "スクワット" },
];

const meta: Meta<typeof TrainingSessionForm> = {
  title: "features/training/TrainingSessionForm",
  component: TrainingSessionForm,
  args: {
    exercises,
    onSubmit: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof TrainingSessionForm>;

export const ValidSubmitWithExercise: Story = {
  name: "種目を1件追加して保存できる",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("日付"), "2026-03-01");
    await userEvent.type(canvas.getByLabelText("実施時間(分)"), "60");
    await userEvent.click(canvas.getByLabelText("中強度"));

    await userEvent.click(canvas.getByRole("button", { name: "種目を追加" }));
    await userEvent.selectOptions(canvas.getByLabelText("種目"), "bench-press");
    await userEvent.type(canvas.getByLabelText("セット数"), "3");
    await userEvent.type(canvas.getByLabelText("回数"), "10");
    await userEvent.type(canvas.getByLabelText("重量(kg)"), "50");

    await userEvent.click(canvas.getByRole("button", { name: "保存" }));

    await expect(args.onSubmit).toHaveBeenCalledWith({
      date: "2026-03-01",
      durationMinutes: 60,
      intensity: "MEDIUM",
      exerciseSets: [{ exerciseId: "bench-press", sets: 3, reps: 10, weightKg: 50 }],
    });
  },
};

export const RemoveExercise: Story = {
  name: "種目を削除すると一覧から除外される",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("日付"), "2026-03-01");
    await userEvent.type(canvas.getByLabelText("実施時間(分)"), "60");

    await userEvent.click(canvas.getByRole("button", { name: "種目を追加" }));
    await userEvent.click(canvas.getByRole("button", { name: "種目を追加" }));

    const deleteButtons = canvas.getAllByRole("button", { name: "削除" });
    await userEvent.click(deleteButtons[0]!);

    const exerciseSelects = canvas.getAllByLabelText("種目");
    expect(exerciseSelects).toHaveLength(1);
    await userEvent.selectOptions(exerciseSelects[0]!, "squat");
    await userEvent.type(canvas.getAllByLabelText("セット数")[0]!, "4");
    await userEvent.type(canvas.getAllByLabelText("回数")[0]!, "8");
    await userEvent.type(canvas.getAllByLabelText("重量(kg)")[0]!, "60");

    await userEvent.click(canvas.getByRole("button", { name: "保存" }));

    await expect(args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseSets: [{ exerciseId: "squat", sets: 4, reps: 8, weightKg: 60 }],
      }),
    );
  },
};

export const MissingDuration: Story = {
  name: "実施時間未入力の場合はエラーが対象フィールドに表示される",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("日付"), "2026-03-01");
    await userEvent.click(canvas.getByRole("button", { name: "保存" }));

    const durationField = canvas.getByLabelText("実施時間(分)");
    await expect(durationField).toBeInvalid();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const KeyboardOnly: Story = {
  name: "キーボードのみで日付・実施時間・強度・保存を完了できる",
  play: async ({ args }) => {
    await userEvent.tab(); // 日付
    await userEvent.keyboard("2026-03-01");
    await userEvent.tab(); // 実施時間
    await userEvent.keyboard("60");
    await userEvent.tab(); // 強度ラジオグループ(既定「低強度」のまま)
    await userEvent.tab(); // 種目を追加ボタン
    await userEvent.tab(); // 保存ボタン
    await userEvent.keyboard("{Enter}");

    await expect(args.onSubmit).toHaveBeenCalledWith({
      date: "2026-03-01",
      durationMinutes: 60,
      intensity: "LOW",
      exerciseSets: [],
    });
  },
};
