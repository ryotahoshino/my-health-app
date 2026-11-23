import { Pool } from "pg";
import type { Database, SqlExecutor } from "./client.js";

// 実行時の保存先(Neon などのマネージド Postgres)。常駐の Node プロセスから
// TCP で接続するため標準の pg を使う。Postgres 互換のどのホストでも動く
// (specs/004-database-migration/research.md #2)。

const toExecutor = (client: {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }>;
}): SqlExecutor => {
  return {
    query: async <TRow>(sql: string, params?: unknown[]) => {
      const result = await client.query(sql, params);
      return { rows: result.rows as TRow[], rowCount: result.rowCount ?? 0 };
    },
    // パラメータを渡さない場合、pg は1回のクエリで複数の文を実行できる。
    exec: async (sql: string) => {
      await client.query(sql);
    },
  };
};

/**
 * マネージド Postgres への接続を作る。接続文字列の検証は readDatabaseUrl で行う。
 */
export const createPostgresDatabase = (connectionString: string): Database => {
  const pool = new Pool({ connectionString });
  const executor = toExecutor(pool);

  return {
    query: executor.query,
    exec: executor.exec,
    transaction: async (run) => {
      // トランザクションは1つの接続上で完結させる必要があるため、プールから borrow する。
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await run(toExecutor(client));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    close: async () => {
      await pool.end();
    },
  };
};
