import SchemaBuilder from "@pothos/core";
import ZodPlugin from "@pothos/plugin-zod";
import type { GraphQLContext } from "./context.js";

// GraphQLスキーマの一次ソース(憲法 原則IV)。SDLは手書きせず、この
// code-first定義から printSchema() で導出する(research.md #3)。
// 値の制約(範囲・必須・書式)は ZodPlugin 経由でinput型に付与し、
// GraphQL型の形と分離する(原則IV)。
export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  // Pothos v4ではランタイムの値だけでなく型パラメータでも指定する必要がある。
  DefaultFieldNullability: false;
}>({
  plugins: [ZodPlugin],
  // GraphQLのベストプラクティスとして、既定を非nullにする
  // (nullを許容したいフィールドだけ個別に { nullable: true } を指定する)。
  defaultFieldNullability: false,
});

builder.queryType({});
// Mutation型の宣言自体は ./mutation.ts に分離している。フィールドが0件のまま
// 宣言するとスキーマがinvalidになるため、mutationを持つ機能のスキーマファイルが
// ./mutation.ts をside-effect importしてから builder.mutationFields() で
// フィールドを追加する(単一のファイルにmutationTypeの宣言を暗黙的に依存させない)。
