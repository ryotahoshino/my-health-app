import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
// T034 で画面をこのフォルダへ移す(このテストは移すまで失敗する)。
import { TrainingPage } from "./TrainingPage";
import { createFakeApiClient } from "../../../test-support/createFakeApiClient";
import { withApiProviders } from "../../../test-support/withApiProviders";

const exercises = [
  { id: "squat", name: "スクワット", mets: 5, source: "テスト用の固定値" },
  { id: "bench-press", name: "ベンチプレス", mets: 3.5, source: "テスト用の固定値" },
];

const createSession = (id: string, date: string) => ({
  id,
  date,
  durationMinutes: 45,
  intensity: "MEDIUM" as const,
  totalVolume: 1200,
  exerciseSets: [{ id: `${id}-1`, exerciseId: "squat", sets: 3, reps: 10, weightKg: 40 }],
  calorieEstimate: {
    calories: 260,
    formula: "METs × 体重 × 時間",
    source: "テスト用の固定値",
    assumedConstants: [{ label: "体重", value: 68, unit: "kg" }],
  },
});

const sessions = [createSession("1", "2026-01-14")];

const meta: Meta<typeof TrainingPage> = {
  title: "features/training/TrainingPage",
  component: TrainingPage,
};
export default meta;

type Story = StoryObj<typeof TrainingPage>;

const neverResolves = () => new Promise<never>(() => {});

export const Loading: Story = {
  name: "取得中は読み込み中と表示する",
  decorators: [
    withApiProviders(
      createFakeApiClient({
        ExerciseCatalog: async () => ({ exerciseCatalog: exercises }),
        TrainingSessions: neverResolves,
      }),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("読み込み中...")).toBeInTheDocument();
  },
};

export const Empty: Story = {
  name: "記録が0件のときは記録の作成へ導く",
  decorators: [
    withApiProviders(
      createFakeApiClient({
        ExerciseCatalog: async () => ({ exerciseCatalog: exercises }),
        TrainingSessions: async () => ({ trainingSessions: [] }),
      }),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("トレーニング記録はまだありません")).toBeInTheDocument();
  },
};

export const WithSessions: Story = {
  name: "記録があるときは種目マスタの名称つきで一覧表示する",
  decorators: [
    withApiProviders(
      createFakeApiClient({
        ExerciseCatalog: async () => ({ exerciseCatalog: exercises }),
        TrainingSessions: async () => ({ trainingSessions: sessions }),
      }),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 一覧は種目IDではなく、種目マスタから引いた名称を表示する。
    await expect(await canvas.findByText(/スクワット/)).toBeInTheDocument();
    await expect(canvas.getByText("2026-01-14")).toBeInTheDocument();
  },
};

export const RefetchAfterUpsert: Story = {
  name: "セッションを追加すると一覧を取り直す",
  decorators: [
    (() => {
      let current = sessions;
      return withApiProviders(
        createFakeApiClient({
          ExerciseCatalog: async () => ({ exerciseCatalog: exercises }),
          TrainingSessions: async () => ({ trainingSessions: current }),
          UpsertTrainingSession: async () => {
            const added = createSession("2", "2026-01-15");
            current = [...current, added];
            return {
              upsertTrainingSession: {
                id: added.id,
                date: added.date,
                durationMinutes: added.durationMinutes,
                intensity: added.intensity,
                exerciseSets: added.exerciseSets,
              },
            };
          },
        }),
      );
    })(),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("2026-01-14");

    await userEvent.type(canvas.getByLabelText("日付"), "2026-01-15");
    await userEvent.type(canvas.getByLabelText("実施時間(分)"), "45");
    await userEvent.click(canvas.getByRole("button", { name: "保存" }));

    await waitFor(async () => {
      await expect(canvas.getByText("2026-01-15")).toBeInTheDocument();
    });
  },
};

export const RefetchAfterDelete: Story = {
  name: "セッションを削除すると一覧を取り直す",
  decorators: [
    (() => {
      let current = sessions;
      return withApiProviders(
        createFakeApiClient({
          ExerciseCatalog: async () => ({ exerciseCatalog: exercises }),
          TrainingSessions: async () => ({ trainingSessions: current }),
          DeleteTrainingSession: async () => {
            current = [];
            return { deleteTrainingSession: true };
          },
        }),
      );
    })(),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const listItem = (await canvas.findByText("2026-01-14")).closest(".MuiCard-root");
    await expect(listItem).not.toBeNull();

    // フォームの種目行にも「削除」があるため、一覧のカード内に限定して押す。
    await userEvent.click(within(listItem as HTMLElement).getByRole("button", { name: "削除" }));

    await waitFor(async () => {
      await expect(canvas.getByText("トレーニング記録はまだありません")).toBeInTheDocument();
    });
  },
};

export const ApiFailure: Story = {
  name: "取得に失敗したときは現状どおり0件の表示になる",
  decorators: [
    withApiProviders(
      createFakeApiClient({
        ExerciseCatalog: async () => ({ exerciseCatalog: exercises }),
        TrainingSessions: async () => {
          throw new Error("ネットワークエラー");
        },
      }),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("トレーニング記録はまだありません")).toBeInTheDocument();
  },
};
