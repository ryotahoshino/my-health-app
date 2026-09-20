import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
// T033 で画面をこのフォルダへ移す(このテストは移すまで失敗する)。
// フェイクの ApiClient を注入して、実サーバーなしで画面の振る舞いを検証する(SC-015)。
import { WeightPage } from "./WeightPage";
import { createFakeApiClient } from "../../../test-support/createFakeApiClient";
import { withApiProviders } from "../../../test-support/withApiProviders";

const sampleRecords = [
  { id: "1", date: "2026-01-01", weightKg: 68.5 },
  { id: "2", date: "2026-01-08", weightKg: 67.5 },
];

const meta: Meta<typeof WeightPage> = {
  title: "features/weight/WeightPage",
  component: WeightPage,
};
export default meta;

type Story = StoryObj<typeof WeightPage>;

// 解決しない Promise を返すと読み込み中のままになる。
const neverResolves = () => new Promise<never>(() => {});

export const Loading: Story = {
  name: "取得中は読み込み中と表示する",
  decorators: [withApiProviders(createFakeApiClient({ WeightRecords: neverResolves }))],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("読み込み中...")).toBeInTheDocument();
  },
};

export const Empty: Story = {
  name: "記録が0件のときは記録の作成へ導く",
  decorators: [
    withApiProviders(createFakeApiClient({ WeightRecords: async () => ({ weightRecords: [] }) })),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("体重の記録はまだありません")).toBeInTheDocument();
  },
};

export const WithRecords: Story = {
  name: "記録があるときは一覧を表示する",
  decorators: [
    withApiProviders(
      createFakeApiClient({ WeightRecords: async () => ({ weightRecords: sampleRecords }) }),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "表で見る" }));

    const table = canvas.getByRole("table");
    await expect(within(table).getByText("2026-01-08")).toBeInTheDocument();
    await expect(within(table).getByText("67.5")).toBeInTheDocument();
  },
};

export const RefetchAfterUpsert: Story = {
  name: "記録を追加すると一覧を取り直す",
  decorators: [
    (() => {
      // 追加の前後で異なる一覧を返し、再取得が起きたことを表示で確かめる。
      let records = sampleRecords;
      return withApiProviders(
        createFakeApiClient({
          WeightRecords: async () => ({ weightRecords: records }),
          UpsertWeightRecord: async () => {
            records = [...records, { id: "3", date: "2026-01-15", weightKg: 66.8 }];
            return { upsertWeightRecord: { id: "3", date: "2026-01-15", weightKg: 66.8 } };
          },
        }),
      );
    })(),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "表で見る" }));

    await userEvent.type(canvas.getByLabelText("日付"), "2026-01-15");
    await userEvent.type(canvas.getByLabelText("体重(kg)"), "66.8");
    await userEvent.click(canvas.getByRole("button", { name: "保存" }));

    await waitFor(async () => {
      await expect(within(canvas.getByRole("table")).getByText("2026-01-15")).toBeInTheDocument();
    });
  },
};

export const RefetchAfterDelete: Story = {
  name: "記録を削除すると一覧を取り直す",
  decorators: [
    (() => {
      let records = sampleRecords;
      return withApiProviders(
        createFakeApiClient({
          WeightRecords: async () => ({ weightRecords: records }),
          DeleteWeightRecord: async () => {
            records = records.filter((record) => record.id !== "1");
            return { deleteWeightRecord: true };
          },
        }),
      );
    })(),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "表で見る" }));

    const firstRow = canvas.getByText("2026-01-01").closest("tr");
    await expect(firstRow).not.toBeNull();
    await userEvent.click(within(firstRow!).getByRole("button", { name: "削除" }));

    await waitFor(async () => {
      await expect(canvas.queryByText("2026-01-01")).not.toBeInTheDocument();
    });
  },
};

export const AggregateOnPeriodChange: Story = {
  name: "週次に切り替えると期間集計を取得する",
  decorators: [
    withApiProviders(
      createFakeApiClient({
        WeightRecords: async () => ({ weightRecords: sampleRecords }),
        WeightTrendAggregate: async () => ({
          weightTrendAggregate: [
            {
              periodLabel: "2026-01-05週",
              startDate: "2026-01-05",
              endDate: "2026-01-11",
              hasData: true,
              value: 67.5,
            },
          ],
        }),
      }),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "週次" }));

    await expect(await canvas.findByText("2026-01-05週")).toBeInTheDocument();
  },
};

export const ApiFailure: Story = {
  name: "取得に失敗したときは現状どおり0件の表示になる",
  decorators: [
    withApiProviders(
      createFakeApiClient({
        WeightRecords: async () => {
          throw new Error("ネットワークエラー");
        },
      }),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 失敗時に専用のエラー表示を出す改善は US1 以降の課題で、ここでは現状の
    // 振る舞い(空状態にフォールバックする)を固定する(spec Edge Cases)。
    await expect(await canvas.findByText("体重の記録はまだありません")).toBeInTheDocument();
  },
};
