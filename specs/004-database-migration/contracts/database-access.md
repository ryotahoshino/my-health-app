# Contract: データベースアクセス

**Date**: 2026-11-23 | **Feature**: [spec.md](../spec.md) | **Research**: [research.md](../research.md) #2・#3・#8

SQL を実行する実体と、その利用側(リポジトリ・GraphQL の組み立て)の関係を定める。
憲法 原則V(外部I/Oは端に寄せる)と原則VI(データ層は差し替え可能にする)を具体化したもの。

## 層と責務

| 層 | 置き場所 | 責務 | 依存してよいもの |
|---|---|---|---|
| 入口 | `apps/server/src/index.ts`・`apps/server/scripts/*.ts` | 接続の実体を生成し、注入する。接続情報の読み取りはここだけ | ドライバ(`pg` / PGlite) |
| SQL 実行 | `apps/server/src/db/` | `query` と `transaction` を提供する。方言差・ドライバ差をここで吸収する | ドライバ |
| リポジトリ | `apps/server/src/repositories/` | SQL を書き、ドメインの型に変換する | SQL実行インターフェース |
| GraphQL | `apps/server/src/schema/` | リポジトリを呼ぶ。SQL を書かない | context 経由のリポジトリ |
| ドメイン | `apps/server/src/domain/` | 純粋関数。DB に触れない | なし |

## インターフェース

```ts
// 1行の結果とその型は呼び出し側が指定する。
type SqlResult<TRow> = {
  rows: TRow[];
  // 更新・削除された行数。ドライバ差(pg の rowCount / PGlite の affectedRows)はここで吸収する。
  rowCount: number;
};

// クエリを実行できるもの。トランザクションの内側でも同じ形で使える。
type SqlExecutor = {
  query<TRow>(sql: string, params?: unknown[]): Promise<SqlResult<TRow>>;
};

// 接続の実体。アプリの寿命と同じだけ生きる。
type Database = SqlExecutor & {
  transaction<T>(run: (tx: SqlExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
};
```

### 規則

1. **プレースホルダ**: パラメータは必ず `$1`, `$2`, … で渡す。文字列連結で値を埋め込まない。
2. **実装は2つだけ**: 実行時は `pg` の `Pool`(`createPostgresDatabase`)、テスト・ローカル開発は
   PGlite(`createPgliteDatabase`)。どちらも同じ `Database` を満たす。
3. **生成は入口だけ**: `createPostgresDatabase` / `createPgliteDatabase` を呼んでよいのは
   `index.ts` と `scripts/*.ts`、およびテストの支援モジュール。リポジトリ・リゾルバからは呼ばない。
4. **注入**: `createApp({ db, today })` は `Database` を受け取る(現行の形を維持)。
   リポジトリは `SqlExecutor` を受け取る。
5. **トランザクション**: 複数の文が1単位で成立する処理(セッションと種目内訳の保存)でのみ使う。
   `transaction` に渡した関数が例外を投げた場合は、何も適用されない。
6. **接続情報**: 読み取るのは入口のみ。環境変数 `DATABASE_URL`。未設定・不正なら起動時に失敗する(FR-013)。
7. **方言**: Postgres の構文のみを使う。SQLite 固有の構文・PRAGMA は書かない。

## リポジトリの契約

- 公開する関数の戻り値はすべて `Promise` にする(FR-001 の結果として生じる変更)。
  型の形(`WeightRecord` 等)は変更しない。
- 現行の振る舞いを変えない(FR-002):

  | 操作 | 現行の振る舞い | 移行後の実装 |
  |---|---|---|
  | 一覧 | 日付の昇順 | `ORDER BY date ASC`(同じ) |
  | 同一日付への保存 | 既存を上書きし、同じ id を保つ | `INSERT ... ON CONFLICT (date) DO UPDATE ... RETURNING` |
  | 削除 | 削除できたら true | `rowCount > 0` |
  | 指定日以前の最新の体重 | 1件 or null | `WHERE date <= $1 ORDER BY date DESC LIMIT 1`(同じ) |
  | セッションの保存 | セッションと種目内訳をまとめて置き換える | `transaction` 内で実行 |

- **GraphQL の公開契約は変えない**(FR-006)。クエリ・ミューテーションの名前と形、
  生成されるクライアントの型に差分が出ないこと。

## テストの契約

- サーバーのテストは `apps/server/test-support/createTestDatabase.ts` を使う。
  この支援モジュールは PGlite のインスタンスを用意し、マイグレーションの適用処理を実行して返す。
- **インスタンスはテストファイル単位で共有し、各テストの前に全テーブルを `TRUNCATE` する**
  (research #3: 起動コストの対策)。固定データが必要なテストは投入処理を呼ぶ。
- テストはネットワークに接続しない。`DATABASE_URL` を必要としない(FR-018)。
- 時刻の注入(`today`)は現行どおり固定値を渡す(原則V)。
