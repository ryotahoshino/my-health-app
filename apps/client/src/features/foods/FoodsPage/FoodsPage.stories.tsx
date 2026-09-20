import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
// T036 で画面をこのフォルダへ移す(このテストは移すまで失敗する)。
import { FoodsPage } from "./FoodsPage";
import { createFakeApiClient } from "../../../test-support/createFakeApiClient";
import { withApiProviders } from "../../../test-support/withApiProviders";

const sampleFoods = [
  { id: "1", name: "鶏むね肉", caloriesPer100g: 108, proteinG: 22.3, fatG: 1.5, carbG: 0.1 },
  { id: "2", name: "白米", caloriesPer100g: 156, proteinG: 2.5, fatG: 0.3, carbG: 37.1 },
];

const meta: Meta<typeof FoodsPage> = {
  title: "features/foods/FoodsPage",
  component: FoodsPage,
};
export default meta;

type Story = StoryObj<typeof FoodsPage>;

const neverResolves = () => new Promise<never>(() => {});

export const Loading: Story = {
  name: "取得中は読み込み中と表示する",
  decorators: [withApiProviders(createFakeApiClient({ FoodItems: neverResolves }))],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("読み込み中...")).toBeInTheDocument();
  },
};

export const Empty: Story = {
  name: "データが0件のときはその旨だけを表示する",
  decorators: [
    withApiProviders(createFakeApiClient({ FoodItems: async () => ({ foodItems: [] }) })),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 参照専用の画面のため、記録の作成へ導く説明は出さない(FR-015)。
    await expect(await canvas.findByText("食材データがありません")).toBeInTheDocument();
  },
};

export const WithFoods: Story = {
  name: "食材の一覧を表で表示する",
  decorators: [
    withApiProviders(createFakeApiClient({ FoodItems: async () => ({ foodItems: sampleFoods }) })),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = await canvas.findByRole("table");

    await expect(within(table).getByRole("rowheader", { name: "鶏むね肉" })).toBeInTheDocument();
    await expect(within(table).getByText("108")).toBeInTheDocument();
  },
};

export const ApiFailure: Story = {
  name: "取得に失敗したときは現状どおり0件の表示になる",
  decorators: [
    withApiProviders(
      createFakeApiClient({
        FoodItems: async () => {
          throw new Error("ネットワークエラー");
        },
      }),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("食材データがありません")).toBeInTheDocument();
  },
};
