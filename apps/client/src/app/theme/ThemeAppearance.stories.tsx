import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { contrastRatio } from "./contrast";
import { designTokens, theme } from "./index";

// スクリーンショット比較(VRT)は導入しない方針のため(research.md #5)、
// 「テーマが実際に描画へ反映されているか」はブラウザ上の計算済みスタイルを
// expect で確認する。目視では気づきにくい取り違え(書体が当たっていない、
// 文字色がトークンと違う、余白が8pxの段階から外れている)をここで止める。

const SpacedStack = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(2),
}));

const Sample = () => {
  return (
    <SpacedStack data-testid="spaced">
      <Typography variant="h1">画面見出し</Typography>
      <Typography variant="h2">節見出し</Typography>
      <Typography variant="body1">
        本文のサンプルです。日本語の判読性を確かめるための文章を置いています。
      </Typography>
      <Typography variant="body2" color="text.secondary">
        補足のサンプルです。
      </Typography>
      <Button variant="contained">保存</Button>
      <Card>
        <CardContent>
          <Typography variant="body1">面の上のテキスト</Typography>
        </CardContent>
      </Card>
    </SpacedStack>
  );
};

const meta: Meta<typeof Sample> = {
  title: "app/theme/ThemeAppearance",
  component: Sample,
};
export default meta;

type Story = StoryObj<typeof Sample>;

// 期待値はトークン(theme)から引く。テーマを変えれば期待値も追随するため、
// ここで生値を書かない(FR-003)。
const toRgb = (hex: string): string => {
  const digits = hex.replace("#", "");
  const channel = (index: number) => Number.parseInt(digits.slice(index, index + 2), 16);
  return `rgb(${channel(0)}, ${channel(2)}, ${channel(4)})`;
};

const styleOf = (element: Element) => getComputedStyle(element);

export const Typography_: Story = {
  name: "書体・文字サイズ・行高がトークンどおりに描画される",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const body = styleOf(canvas.getByText(/本文のサンプルです/));
    // 公式トークンの書体(Noto Sans JP)が先頭に当たっていること。
    await expect(body.fontFamily).toContain("Noto Sans JP");
    // 本文は16px以上・行高1.5以上(INV-2)。行高は px で返るため割って判定する。
    const bodyFontSize = Number.parseFloat(body.fontSize);
    await expect(bodyFontSize).toBeGreaterThanOrEqual(16);
    await expect(Number.parseFloat(body.lineHeight) / bodyFontSize).toBeGreaterThanOrEqual(1.5);

    // 見出しは本文より大きく、太字で描画される(FR-004)。
    const heading1 = styleOf(canvas.getByText("画面見出し"));
    const heading2 = styleOf(canvas.getByText("節見出し"));
    await expect(Number.parseFloat(heading1.fontSize)).toBeGreaterThan(
      Number.parseFloat(heading2.fontSize),
    );
    await expect(Number.parseFloat(heading2.fontSize)).toBeGreaterThan(bodyFontSize);
    await expect(Number(heading1.fontWeight)).toBe(designTokens.typography.heading1.fontWeight);

    // 補足は本文より小さい。
    await expect(
      Number.parseFloat(styleOf(canvas.getByText(/補足のサンプルです/)).fontSize),
    ).toBeLessThan(bodyFontSize);
  },
};

export const Colors: Story = {
  name: "配色がトークンどおりに描画され、コントラストがAAを満たす",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const body = styleOf(canvas.getByText(/本文のサンプルです/));
    await expect(body.color).toBe(toRgb(theme.palette.text.primary));

    const secondary = styleOf(canvas.getByText(/補足のサンプルです/));
    await expect(secondary.color).toBe(toRgb(theme.palette.text.secondary));

    const button = styleOf(canvas.getByRole("button", { name: "保存" }));
    await expect(button.backgroundColor).toBe(toRgb(theme.palette.primary.main));
    await expect(button.color).toBe(toRgb(theme.palette.primary.contrastText));

    // 描画された実際の色から比を出す。テーマの値だけを見る単体テスト(contrast.test.ts)と
    // 違い、CssBaseline や component の上書きで色が変わっていても検出できる。
    const canvasBackground = styleOf(document.body).backgroundColor;
    await expect(contrastRatio(body.color, canvasBackground)).toBeGreaterThanOrEqual(4.5);
    await expect(contrastRatio(secondary.color, canvasBackground)).toBeGreaterThanOrEqual(4.5);
    await expect(contrastRatio(button.color, button.backgroundColor)).toBeGreaterThanOrEqual(4.5);
  },
};

export const SpacingAndSurface: Story = {
  name: "余白・角丸・影がトークンどおりに描画される",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // テーマの spacing(2) を指定した箇所が 16px として描画される(INV-3)。
    const spaced = styleOf(canvas.getByTestId("spaced"));
    await expect(spaced.rowGap).toBe(theme.spacing(2));

    // 面(Card)は公式の角丸と影が当たっている。
    const surface = canvas.getByText("面の上のテキスト").closest(".MuiPaper-root");
    await expect(surface).not.toBeNull();
    const surfaceStyle = styleOf(surface as Element);
    await expect(Number.parseFloat(surfaceStyle.borderTopLeftRadius)).toBe(designTokens.radius);
    await expect(surfaceStyle.boxShadow).not.toBe("none");
    await expect(surfaceStyle.backgroundColor).toBe(toRgb(theme.palette.background.paper));
  },
};
