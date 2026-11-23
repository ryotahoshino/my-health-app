import { PGlite } from "@electric-sql/pglite";
import type { Database, SqlExecutor, SqlResult } from "./client.js";

// テストとローカル開発の保存先。PGlite はプロセス内で動く Postgres のため、
// ネットワーク接続なしで実行時と同じ SQL を検証できる
// (specs/004-database-migration/research.md #3)。

const toResult = <TRow>(result: { rows: TRow[]; affectedRows?: number }): SqlResult<TRow> => {
  return { rows: result.rows, rowCount: result.affectedRows ?? 0 };
};

const toExecutor = (client: {
  query: <TRow>(
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: TRow[]; affectedRows?: number }>;
  exec: (sql: string) => Promise<unknown>;
}): SqlExecutor => {
  return {
    query: async <TRow>(sql: string, params?: unknown[]) => {
      const result = await client.query<TRow>(sql, params);
      return toResult(result);
    },
    exec: async (sql: string) => {
      await client.exec(sql);
    },
  };
};

/**
 * PGlite の保存先を作る。
 * dataDir を省略するとインメモリ(テスト用)、パスを渡すとファイルに永続化する(ローカル開発用)。
 */
export const createPgliteDatabase = (dataDir?: string): Database => {
  let pglite: PGlite;
  if (dataDir) {
    pglite = new PGlite(dataDir);
  } else {
    pglite = new PGlite();
  }

  const executor = toExecutor(pglite);

  return {
    query: executor.query,
    exec: executor.exec,
    transaction: async (run) => {
      // PGlite の transaction は、渡した関数が例外を投げるとロールバックする。
      return pglite.transaction(async (tx) => run(toExecutor(tx)));
    },
    close: async () => {
      await pglite.close();
    },
  };
};
