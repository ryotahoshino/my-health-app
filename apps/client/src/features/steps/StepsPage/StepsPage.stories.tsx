import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
// T035 で画面をこのフォルダへ移す(このテストは移すまで失敗する)。
import { StepsPage } from "./StepsPage";
import { createFakeApiClient } from "../../../test-support/createFakeApiClient";
import { withApiProviders } from "../../../test-support/withApiProviders";

const createSummary = (date: string, periodLabel: string) => ({
  date,
  periodLabel,
  trainingCalories: 320,
  stepCalories: 210,
  totalCalories: 530,
  isApproximate: true,
  stepCalorieEstimate: {
    calories: 210,
    formula: "歩数 × 体重 × 係数",
    source: "テスト用の固定値",
    assumedConstants: [{ label: "歩幅", value: 0.7, unit: "m" }],
  },
});

const dailySummaries = [createSummary("2026-01-14", "2026-01-14")];

const meta: Meta<typeof StepsPage> = {
  title: "features/steps/StepsPage",
  component: StepsPage,
};
export default meta;

type Story = StoryObj<typeof StepsPage>;

const neverResolves = () => new Promise<never>(() => {});

export const Loading: Story = {
  name: "取得中は読み込み中と表示する",
  decorators: [withApiProviders(createFakeApiClient({ DailyCalorieSummaries: neverResolves }))],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("読み込み中...")).toBeInTheDocument();
  },
};

export const Empty: Story = {
  name: "記録が0件のときは記録の作成へ導く",
  decorators: [
    withApiProviders(
      createFakeApiClient({ DailyCalorieSummaries: async () => ({ dailyCalorieSummaries: [] }) }),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("歩数記録はまだありません")).toBeInTheDocument();
  },
};

export const WithSummaries: Story = {
  name: "記録があるときは日別の消費カロリーを表示する",
  decorators: [
    withApiProviders(
      createFakeApiClient({
        DailyCalorieSummaries: async () => ({ dailyCalorieSummaries: dailySummaries }),
      }),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("2026-01-14")).toBeInTheDocument();
  },
};

export const RefetchAfterUpsert: Story = {
  name: "記録を追加すると集計を取り直す",
  decorators: [
    (() => {
      let summaries = dailySummaries;
      return withApiProviders(
        createFakeApiClient({
          DailyCalorieSummaries: async () => ({ dailyCalorieSummaries: summaries }),
          UpsertStepRecord: async () => {
            summaries = [...summaries, createSummary("2026-01-15", "2026-01-15")];
            return { upsertStepRecord: { id: "2", date: "2026-01-15", steps: 8000 } };
          },
        }),
      );
    })(),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("2026-01-14");

    await userEvent.type(canvas.getByLabelText("日付"), "2026-01-15");
    await userEvent.type(canvas.getByLabelText("歩数"), "8000");
    await userEvent.click(canvas.getByRole("button", { name: "保存" }));

    await waitFor(async () => {
      await expect(canvas.getByText("2026-01-15")).toBeInTheDocument();
    });
  },
};

export const AggregateOnPeriodChange: Story = {
  name: "週次に切り替えると週の集計を取得する",
  decorators: [
    (() => {
      // 期間はクエリキーに含まれるため、切り替えると別のクエリとして取得される。
      const summariesByPeriod = {
        DAILY: dailySummaries,
        WEEKLY: [createSummary("2026-01-12", "2026-01-12週")],
        MONTHLY: [createSummary("2026-01-01", "2026年1月")],
      };
      return withApiProviders(
        createFakeApiClient({
          DailyCalorieSummaries: async (variables) => ({
            dailyCalorieSummaries: summariesByPeriod[variables?.period ?? "DAILY"],
          }),
        }),
      );
    })(),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "週次" }));

    await expect(await canvas.findByText("2026-01-12週")).toBeInTheDocument();
  },
};

export const ApiFailure: Story = {
  name: "取得に失敗したときは現状どおり0件の表示になる",
  decorators: [
    withApiProviders(
      createFakeApiClient({
        DailyCalorieSummaries: async () => {
          throw new Error("ネットワークエラー");
        },
      }),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("歩数記録はまだありません")).toBeInTheDocument();
  },
};
