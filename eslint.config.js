// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/storybook-static/**",
      "**/node_modules/**",
      "**/*.generated.ts",
      "apps/server/schema.graphql",
      "apps/server/data/**",
      "apps/client/src/graphql/generated/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["apps/server/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["apps/client/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // 憲法 技術スタック「静的解析」: 違反はすべて error とし、warn で放置しない。
      "react-refresh/only-export-components": ["error", { allowConstantExport: true }],
    },
  },
  {
    // トークンを迂回した生値の直接記述を禁止する(憲法 原則X / specs/003-design-system-tokens FR-003)。
    // 見た目の値は src/app/theme/ のトークン定義を唯一の定義元とし、コンポーネントは
    // テーマ経由でのみ参照する。テスト・ストーリー内の検証用の値は対象外。
    files: ["apps/client/src/**/*.{ts,tsx}"],
    ignores: [
      "apps/client/src/app/theme/**",
      "apps/client/src/**/*.stories.tsx",
      "apps/client/src/**/*.test.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
          message:
            "色コードを直接書かず、テーマの palette を参照してください(憲法 原則X / FR-003)。",
        },
        {
          selector: "Literal[value=/\\d(px|rem)\\b/]",
          message:
            "px・rem 付きの寸法を直接書かず、テーマの spacing・layout・typography を参照してください(憲法 原則X / FR-003)。",
        },
        {
          selector:
            "Property[key.name=/^(gap|rowGap|columnGap|margin|marginTop|marginRight|marginBottom|marginLeft|padding|paddingTop|paddingRight|paddingBottom|paddingLeft|width|minWidth|maxWidth|height|minHeight|maxHeight)$/][value.type='Literal'][value.raw=/^-?\\d/][value.raw!='0']",
          message:
            "寸法を数値で直接書かず、テーマの spacing・layout を参照してください(憲法 原則X / FR-003)。",
        },
        {
          // グラフ等のコンポーネントに props で渡す寸法(例: <LineChart height={300} />)。
          selector:
            "JSXAttribute[name.name=/^(width|height|minWidth|maxWidth|minHeight|maxHeight|gap|margin|padding)$/] > JSXExpressionContainer > Literal[raw=/^-?\\d/][raw!='0']",
          message:
            "寸法を数値で直接書かず、テーマの spacing・layout を参照してください(憲法 原則X / FR-003)。",
        },
      ],
    },
  },
  storybook.configs["flat/recommended"],
);
