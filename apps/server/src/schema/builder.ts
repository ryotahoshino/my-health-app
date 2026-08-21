import SchemaBuilder from "@pothos/core";
import ZodPlugin from "@pothos/plugin-zod";
import type { GraphQLContext } from "./context.js";

// GraphQLスキーマの一次ソース(憲法 原則IV)。SDLは手書きせず、この
// code-first定義から printSchema() で導出する(research.md #3)。
// 値の制約(範囲・必須・書式)は ZodPlugin 経由でinput型に付与し、
// GraphQL型の形と分離する(原則IV)。
export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
}>({
  plugins: [ZodPlugin],
});

builder.queryType({});
// Mutation型はPhase3で実際のmutation(upsertWeightRecord等)を追加する際に宣言する。
// フィールドが0件のまま宣言するとスキーマがinvalidになるため、今は宣言しない。
