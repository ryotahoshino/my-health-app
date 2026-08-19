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
    "src/graphql/generated/sdk.ts": {
      plugins: ["typescript", "typescript-operations", "typescript-graphql-request"],
    },
  },
};

export default config;
