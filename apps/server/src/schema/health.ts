import { builder } from "./builder.js";

// Phase3以降で weightRecords 等の実フィールドが追加されるまで、
// GraphQLの Query型は最低1フィールド必要なためのプレースホルダー。
// 実フィールドが揃った時点でこのファイルとフィールドは削除してよい。
builder.queryField("health", (t) =>
  t.boolean({
    resolve: () => true,
  }),
);
