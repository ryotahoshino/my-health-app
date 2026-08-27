import { builder } from "./builder.js";

// Mutation型そのものの宣言。フィールドは各機能のスキーマファイルが
// builder.mutationFields() で追加する。mutationを持つファイルは必ず
// このファイルをside-effect importしてから使うこと(import "./mutation.js";)。
builder.mutationType({});
