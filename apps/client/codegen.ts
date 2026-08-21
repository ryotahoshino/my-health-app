import type { CodegenConfig } from "@graphql-codegen/cli";

// apps/server/schema.graphql(printSchema()によるビルド時生成物)を入力元とする。
// サーバーを起動しなくてもcodegenが実行できるようにするため(research.md #3)。
// `yarn workspace @my-health-app/server generate:schema` を先に実行しておくこと。
const config: CodegenConfig = {
  schema: "../server/schema.graphql",
  documents: ["src/**/*.graphql"],
  // Phase3以降で各ストーリーの.graphqlクエリ/ミューテーションを追加するまでは
  // documentsが0件になるため、この段階ではエラーにしない。
  ignoreNoDocuments: true,
  generates: {
    // typescript-operationsは選択セットをフラットな型として自己完結で
    // 生成するため、typescriptプラグイン(スキーマ全体の型)は現状不要。
    // 両方を同じファイルに出力すると、typescript-operationsが変数の
    // input型を独自に再宣言し"Duplicate identifier"になるため併用しない。
    "src/graphql/generated/sdk.ts": {
      plugins: ["typescript-operations", "typescript-graphql-request"],
    },
  },
};

export default config;
