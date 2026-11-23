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
  test: {
    // テスト用DB(PGlite)はプロセス内で Postgres を起動するため、インスタンスの
    // 生成が最も重い。ファイルごとにモジュールを隔離しない設定にすると、同じワーカー内の
    // テストファイルが1つのインスタンスを共有でき、起動回数を減らせる
    // (specs/004-database-migration/research.md #3)。
    // テストごとの独立性は、記録テーブルを空にする reset() で担保する。
    isolate: false,
    pool: "forks",
    poolOptions: {
      // 1つのプロセスで全ファイルを実行し、PGlite の起動を1回に抑える。
      forks: { singleFork: true },
    },
  },
});
