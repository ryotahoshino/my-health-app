// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

// 生値の禁止ルール(下記 no-restricted-syntax)で、数値の直接記述を「原則禁止」とし、
// 寸法ではないことが明らかなものだけを許可する(specs/003-design-system-tokens FR-003)。
// 禁止する名前を列挙する方式では、列挙から漏れた名前(top・fontSize・size など)を
// 見逃すため採らない。新たに許可する場合は、寸法でない理由をコメントで残して追加する。

// JSX 属性で数値を直接書いてよいもの。
const numericJsxPropsAllowed = [
  // テーマの余白単位(8px)・影の段階に対する倍率・添字で、テーマ経由の値になる
  "spacing",
  "elevation",
  // 個数・順序・入力値の範囲で、見た目の寸法ではない
  "tabIndex",
  "rows",
  "minRows",
  "maxRows",
  "colSpan",
  "rowSpan",
  "min",
  "max",
  "step",
  "aria-[a-z]+",
];

// スタイル定義(styled / sx / style)や JSX 属性内のオブジェクトで、数値を直接書いてよいキー。
const numericStyleKeysAllowed = [
  // 単位を持たない比率・順序
  "flex",
  "flexGrow",
  "flexShrink",
  "order",
  "opacity",
  // 入力値の範囲(例: inputProps={{ min: 0, step: 0.1 }})
  "min",
  "max",
  "step",
];

const toAlternation = (names) => names.join("|");

// 0 は単位に関係なく同じ意味のため許可する。負の数は UnaryExpression(-)+ Literal になる。
const isNonZeroNumber = "[raw=/^\\d/][raw!='0']";

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
          // JSX 属性に直接書いた数値(例: <LineChart height={300} />、top={-8})。
          selector: `JSXAttribute[name.name!=/^(${toAlternation(numericJsxPropsAllowed)})$/] > JSXExpressionContainer > :matches(Literal${isNonZeroNumber}, UnaryExpression > Literal${isNonZeroNumber})`,
          message:
            "JSX 属性に数値を直接書かず、テーマの spacing・layout・typography を参照してください。寸法でない数値の場合は eslint.config.js の numericJsxPropsAllowed に理由を添えて追加してください(憲法 原則X / FR-003)。",
        },
        {
          // スタイル定義(styled(...)(...)・sx・style)と、JSX 属性に渡すオブジェクト
          // (例: margin={{ left: 40 }})の中に直接書いた数値。
          selector: `:matches(CallExpression[callee.type='CallExpression'][callee.callee.name='styled'], JSXAttribute) Property[key.name!=/^(${toAlternation(numericStyleKeysAllowed)})$/]:matches([value.type='Literal'][value.raw=/^\\d/][value.raw!='0'], [value.type='UnaryExpression'][value.argument.raw=/^\\d/][value.argument.raw!='0'])`,
          message:
            "スタイルに数値を直接書かず、テーマの spacing・layout・typography を参照してください。寸法でない数値の場合は eslint.config.js の numericStyleKeysAllowed に理由を添えて追加してください(憲法 原則X / FR-003)。",
        },
      ],
    },
  },
  storybook.configs["flat/recommended"],
);
