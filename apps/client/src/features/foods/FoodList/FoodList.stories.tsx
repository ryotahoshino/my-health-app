import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
// T068で実装する(このテストは実装が無い間は失敗する)。
// 契約: props = { foods: { id, name, caloriesPer100g, proteinG, fatG, carbG }[] }
//       食材名・100gあたりカロリー・PFC(タンパク質・脂質・炭水化物)を表形式で表示する。
//       スクリーンリーダーで名称とカロリー・PFCの対応が伝わるよう、行見出し
//       (th scope="row")・列見出し(th scope="col")を持つ表構造にする(FR-015、Acceptance #2)。
import { FoodList } from "./FoodList";

const foods = [
  { id: "rice", name: "ご飯(白米)", caloriesPer100g: 156, proteinG: 2.5, fatG: 0.3, carbG: 37.1 },
  {
    id: "chicken-breast",
    name: "鶏むね肉(皮なし)",
    caloriesPer100g: 116,
    proteinG: 23.3,
    fatG: 1.9,
    carbG: 0,
  },
];

const meta: Meta<typeof FoodList> = {
  title: "features/foods/FoodList",
  component: FoodList,
  args: {
    foods,
  },
  parameters: {
    a11y: { test: "error" },
  },
};
export default meta;

type Story = StoryObj<typeof FoodList>;

export const ShowsFoodTable: Story = {
  name: "食材名・100gあたりカロリー・PFCが一覧表示される",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("columnheader", { name: /カロリー/ })).toBeInTheDocument();
    await expect(canvas.getByRole("columnheader", { name: /タンパク質/ })).toBeInTheDocument();
    await expect(canvas.getByRole("columnheader", { name: /脂質/ })).toBeInTheDocument();
    await expect(canvas.getByRole("columnheader", { name: /炭水化物/ })).toBeInTheDocument();

    await expect(canvas.getByText("ご飯(白米)")).toBeInTheDocument();
    await expect(canvas.getByText("鶏むね肉(皮なし)")).toBeInTheDocument();
  },
};

export const AssociatesNameWithValuesForScreenReaders: Story = {
  name: "行見出し(食材名)とカロリー・PFCの値が表構造で対応付けられる(スクリーンリーダー対応)",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 行(rowheader=食材名)単位でセル値が取得できることを確認し、
    // スクリーンリーダーが「食材名: カロリー、タンパク質、脂質、炭水化物」の
    // 対応関係を読み上げられる表構造になっていることを検証する。
    const riceRow = canvas.getByRole("row", { name: /ご飯\(白米\)/ });
    const riceCells = within(riceRow).getAllByRole("cell");
    await expect(riceCells[0]).toHaveTextContent(/156/);
    await expect(riceCells[1]).toHaveTextContent(/2\.5/);
    await expect(riceCells[2]).toHaveTextContent(/0\.3/);
    await expect(riceCells[3]).toHaveTextContent(/37\.1/);

    const chickenRow = canvas.getByRole("row", { name: /鶏むね肉\(皮なし\)/ });
    const chickenCells = within(chickenRow).getAllByRole("cell");
    await expect(chickenCells[0]).toHaveTextContent(/116/);
    await expect(chickenCells[1]).toHaveTextContent(/23\.3/);
  },
};
