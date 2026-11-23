// SQL を実行する実体の型。ドライバ(pg / PGlite)の差はこの層で吸収し、
// リポジトリ以降は下記の型にのみ依存する(憲法 原則V・VI / contracts/database-access.md)。

export type SqlResult<TRow> = {
  rows: TRow[];
  // 更新・削除された行数。pg は rowCount、PGlite は affectedRows と名前が違うため、
  // 各実装がこの名前に揃える。
  rowCount: number;
};

// クエリを実行できるもの。トランザクションの内側でも同じ形で使える。
export type SqlExecutor = {
  query<TRow = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<SqlResult<TRow>>;
  // 複数の文を含むSQL(マイグレーションのファイルなど)をまとめて実行する。
  // パラメータは渡せない。1文だけのクエリや値を渡す場合は query を使う。
  exec(sql: string): Promise<void>;
};

// 接続の実体。アプリの寿命と同じだけ生きる。
export type Database = SqlExecutor & {
  // 渡した関数が例外を投げた場合、その中の変更は何も適用されない。
  transaction<T>(run: (tx: SqlExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
};
