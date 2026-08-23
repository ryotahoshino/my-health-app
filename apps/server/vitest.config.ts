import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

// Vitestは内部でVite(vite-node)の解決アルゴリズムを使うため、素のNodeの
// require解決と食い違い、"graphql"パッケージが2つの別モジュールとして
// 読み込まれることがある(graphql-js自身が警告している既知のdual package
// hazard)。builder.toSchema()が返すGraphQLSchemaと、テストがimportする
// graphql/GraphQLSchemaが別インスタンス扱いになりinstanceofが失敗するため、
// 解決先を1本化する。
const require = createRequire(import.meta.url);

export default defineConfig({
  resolve: {
    alias: {
      graphql: require.resolve("graphql"),
    },
  },
});
