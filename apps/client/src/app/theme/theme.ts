import { createTheme, type Shadows, type Theme } from "@mui/material/styles";
import { textStyles, type TextStyle, type TextStyles } from "./textStyles";
import {
  colorTokens,
  elevationTokens,
  fontTokens,
  layoutTokens,
  radiusToken,
  spacingUnit,
  type ColorTokens,
  type LayoutTokens,
} from "./tokens";

// MUI のテーマ型にレイアウト幅(自前定義のトークン)を追加する。
// モジュール拡張は interface の宣言マージでしか書けないため、ここだけは type ではなく
// interface を使う(プロジェクト規約「type を使う」の例外)。
declare module "@mui/material/styles" {
  interface Theme {
    layout: LayoutTokens;
  }
  interface ThemeOptions {
    layout?: LayoutTokens;
  }
}

// テーマを組み立てる入力となるトークン一式。
// 値を差し替えたテーマを作れるように引数で受け取る(SC-004 / contracts/theme-tokens.md)。
export type DesignTokens = {
  color: ColorTokens;
  typography: TextStyles & { fontFamily: string };
  radius: number;
  elevation: string[];
  spacingUnit: number;
  layout: LayoutTokens;
};

export const designTokens: DesignTokens = {
  color: colorTokens,
  typography: { ...textStyles, fontFamily: fontTokens.family },
  radius: radiusToken,
  elevation: elevationTokens,
  spacingUnit,
  layout: layoutTokens,
};

// MUI の shadows は「影なし + 24段階」の25要素を要求する。公式の Elevation は8段階までのため、
// 9段階目以降は最も高い Elevation 8 を使い回す。
const SHADOW_LEVELS = 25;

const toShadows = (elevation: string[]): Shadows => {
  const highest = elevation[elevation.length - 1] ?? "none";
  const shadows = ["none", ...elevation];
  while (shadows.length < SHADOW_LEVELS) {
    shadows.push(highest);
  }
  return shadows as Shadows;
};

const toTypographyVariant = (style: TextStyle) => ({
  fontSize: style.fontSize,
  fontWeight: style.fontWeight,
  lineHeight: style.lineHeight,
  letterSpacing: style.letterSpacing,
});

export const createAppTheme = (tokens: DesignTokens): Theme =>
  createTheme({
    palette: {
      mode: "light",
      primary: { main: tokens.color.primary, contrastText: tokens.color.onPrimary },
      error: { main: tokens.color.error },
      text: { primary: tokens.color.textPrimary, secondary: tokens.color.textSecondary },
      background: { default: tokens.color.background, paper: tokens.color.surface },
      divider: tokens.color.divider,
    },
    typography: {
      fontFamily: tokens.typography.fontFamily,
      h1: toTypographyVariant(tokens.typography.heading1),
      h2: toTypographyVariant(tokens.typography.heading2),
      body1: toTypographyVariant(tokens.typography.body),
      body2: toTypographyVariant(tokens.typography.bodySmall),
      button: { ...toTypographyVariant(tokens.typography.button), textTransform: "none" },
    },
    shape: { borderRadius: tokens.radius },
    shadows: toShadows(tokens.elevation),
    spacing: tokens.spacingUnit,
    layout: tokens.layout,
  });
