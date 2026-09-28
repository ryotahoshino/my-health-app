import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Typography } from "@mui/material";
import { Surface } from "./Surface";
import { theme } from "../../app/theme";

const meta: Meta<typeof Surface> = {
  title: "components/Surface",
  component: Surface,
  args: {
    children: <Typography variant="body1">まとまりの中身</Typography>,
  },
};
export default meta;

type Story = StoryObj<typeof Surface>;

export const HasBoundaryAndPadding: Story = {
  name: "境界線と内側の余白でまとまりの範囲が分かる",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const surface = canvas.getByText("まとまりの中身").closest(".MuiPaper-root");
    await expect(surface).not.toBeNull();

    // 境界線・余白・角丸がトークンどおりに描画される(のっぺりを避ける、FR-006)。
    const style = getComputedStyle(surface as Element);
    await expect(Number.parseFloat(style.borderTopWidth)).toBe(theme.layout.borderWidth.hairline);
    await expect(style.padding).toBe(theme.spacing(2));
    await expect(Number.parseFloat(style.borderTopLeftRadius)).toBe(theme.shape.borderRadius);
  },
};
