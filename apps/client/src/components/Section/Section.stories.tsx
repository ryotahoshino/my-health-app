import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Typography } from "@mui/material";
import { Section } from "./Section";
import { theme } from "../../app/theme";

const meta: Meta<typeof Section> = {
  title: "components/Section",
  component: Section,
  args: {
    title: "体重の推移",
    children: <Typography variant="body1">まとまりの中身</Typography>,
  },
};
export default meta;

type Story = StoryObj<typeof Section>;

export const HasHeadingAndRegion: Story = {
  name: "見出しが付き、その名前で領域として取得できる",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("heading", { name: "体重の推移", level: 2 })).toBeInTheDocument();
    // 見出しと領域が対応づけられている(支援技術でまとまりを識別できる)。
    const region = canvas.getByRole("region", { name: "体重の推移" });
    await expect(within(region).getByText("まとまりの中身")).toBeInTheDocument();
  },
};

export const HeadingUsesSectionTextStyle: Story = {
  name: "見出しは節見出しのテキストスタイルで描画される",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const heading = getComputedStyle(canvas.getByRole("heading", { name: "体重の推移" }));
    const body = getComputedStyle(canvas.getByText("まとまりの中身"));

    // 見出しは本文より大きく太い(FR-004)。
    await expect(Number.parseFloat(heading.fontSize)).toBeGreaterThan(
      Number.parseFloat(body.fontSize),
    );
    await expect(Number(heading.fontWeight)).toBe(theme.typography.h2.fontWeight);
  },
};

export const HeadingLevelIsSelectable: Story = {
  name: "入れ子の位置に応じて見出しレベルを選べる",
  args: { titleComponent: "h3" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "体重の推移", level: 3 })).toBeInTheDocument();
  },
};
