// 現在時刻の取得はI/O相当(システムクロックへの依存)のため、ドメイン層の
// 純粋関数には置かずスキーマ層(エッジ)に置く(憲法 原則V)。GraphQL
// contextファクトリ(index.ts)がリクエストごとに1回だけ呼び出し、
// テストではcontext.todayに固定値を注入して決定的に検証する。
export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
