import type { Preview } from "@storybook/react-vite";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "../src/app/theme";
import "../src/app/theme/fonts.css";

const preview: Preview = {
  // アプリと同じテーマ・書体でストーリーを描画し、a11y 検査も適用後の見た目で行う
  // (specs/003-design-system-tokens T015)。
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 憲法 原則I(アクセシビリティ・ファースト): 「後で対応する」は認めないため、
      // a11y違反はtodo(警告のみ)ではなくerror(テスト失敗)として扱う。
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "error",
    },
  },
};

export default preview;
