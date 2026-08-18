import type { Preview } from "@storybook/react-vite";

const preview: Preview = {
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
