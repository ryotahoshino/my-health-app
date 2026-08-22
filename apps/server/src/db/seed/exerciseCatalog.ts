import type Database from "better-sqlite3";

export interface ExerciseCatalogEntry {
  id: string;
  name: string;
  mets: number;
  source: string;
}

const METS_SOURCE =
  "国立健康・栄養研究所「改訂版 身体活動のメッツ(METs)表」のレジスタンストレーニング区分に基づく代表値";

// 種目マスタは固定データ(CRUD対象外、FR-007)。ここでのMETsは種目選択時の
// 参考表示用であり、セッション単位の消費カロリー算出には強度区分のMETs
// (research.md #5)を用いる。
export const exerciseCatalogSeed: ExerciseCatalogEntry[] = [
  { id: "bench-press", name: "ベンチプレス", mets: 5.0, source: METS_SOURCE },
  { id: "squat", name: "スクワット", mets: 5.0, source: METS_SOURCE },
  { id: "deadlift", name: "デッドリフト", mets: 6.0, source: METS_SOURCE },
  { id: "overhead-press", name: "ショルダープレス", mets: 5.0, source: METS_SOURCE },
  { id: "barbell-row", name: "バーベルロウ", mets: 5.0, source: METS_SOURCE },
  { id: "lat-pulldown", name: "ラットプルダウン", mets: 5.0, source: METS_SOURCE },
  { id: "leg-press", name: "レッグプレス", mets: 5.0, source: METS_SOURCE },
  { id: "pull-up", name: "懸垂", mets: 8.0, source: METS_SOURCE },
  { id: "push-up", name: "腕立て伏せ", mets: 3.8, source: METS_SOURCE },
  { id: "dumbbell-curl", name: "ダンベルカール", mets: 3.5, source: METS_SOURCE },
];

export const seedExerciseCatalog = (db: Database.Database): void => {
  const insert = db.prepare(
    `INSERT INTO exercise_catalog (id, name, mets, source)
     VALUES (@id, @name, @mets, @source)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, mets = excluded.mets, source = excluded.source`,
  );
  const insertAll = db.transaction((rows: ExerciseCatalogEntry[]) => {
    for (const row of rows) insert.run(row);
  });
  insertAll(exerciseCatalogSeed);
};
