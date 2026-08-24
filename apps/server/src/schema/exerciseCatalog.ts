import { builder } from "./builder.js";
import { exerciseCatalogSeed, type ExerciseCatalogEntry } from "../db/seed/exerciseCatalog.js";

// 種目マスタは固定データ(CRUD対象外、FR-007)。DBへ書き込み済みのものと
// 同じ内容なので、参照だけならDBに問い合わせずseed配列をそのまま返せば足りる。
const ExerciseCatalogItemType = builder
  .objectRef<ExerciseCatalogEntry>("ExerciseCatalogItem")
  .implement({
    fields: (t) => ({
      id: t.exposeID("id"),
      name: t.exposeString("name"),
      mets: t.exposeFloat("mets"),
      source: t.exposeString("source"),
    }),
  });

builder.queryField("exerciseCatalog", (t) =>
  t.field({
    type: [ExerciseCatalogItemType],
    resolve: () => exerciseCatalogSeed,
  }),
);
