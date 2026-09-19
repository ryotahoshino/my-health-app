import { createAppTheme, designTokens } from "./theme";

// テーマの公開窓口。アプリとストーリーはこのファイル経由でのみテーマを参照する
// (contracts/theme-tokens.md)。
export { createAppTheme, designTokens, type DesignTokens } from "./theme";
export { spacingScale } from "./tokens";

export const theme = createAppTheme(designTokens);
