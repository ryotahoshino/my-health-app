// クエリキーは feature 内の1箇所で定義し、画面から直接組み立てない
// (contracts/api-injection.md 規則4)。無効化の範囲もここを見れば分かる。
export const weightQueryKeys = {
  records: ["weightRecords"] as const,
  // 期間集計は期間ごとに別のキャッシュを持つ。先頭が一致する全期間をまとめて
  // 無効化できるよう、基底キーと期間つきキーを分けて定義する。
  aggregateBase: ["weightTrendAggregate"] as const,
  aggregate: (period: string) => ["weightTrendAggregate", period] as const,
};
