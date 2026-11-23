# Research: 記録データの保存先をマネージドデータベースへ移す

**Date**: 2026-11-23 | **Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## 1. Neon 無料プランの条件(SC-009)

- **Decision**: 本番の保存先を Neon の無料プラン(Free)とする。個人利用の想定(1日数十回の読み書き、
  記録は年間で数千行規模)であれば、下記の上限に対して十分な余裕がある。
- **一次情報で確認した条件(2026-11-23 時点、[Neon Pricing](https://neon.com/pricing))**:

  | 項目 | 無料プランの条件 |
  |---|---|
  | 料金 | $0。試用期間ではなく恒久的に無料。クレジットカード不要 |
  | ストレージ | プロジェクトあたり 1 GB(超えると書き込みがブロックされる) |
  | コンピュート時間 | プロジェクトあたり月 100 CU-hours |
  | データ転送(egress) | プロジェクトあたり月 5 GB |
  | ブランチ | プロジェクトあたり 10 |
  | 履歴保持 | 6時間(上限 1 GB) |
  | 自動停止 | 常に有効(無効化不可)。アイドル5分で停止 |
  | 復帰 | 次のクエリで自動起動。通常は数百ミリ秒 |
  | 上限到達時 | コンピュートは翌請求期間まで停止。データは削除されない |

- **Rationale**: 記録は1日あたり数十行、1行あたり数百バイト規模のため、ストレージ1GBに対して桁で余裕がある。
  自動停止があるため、常時起動のコンピュート時間を消費しない。
- **影響**: アイドル明けの最初のクエリに遅延が乗る。画面は既存の読み込み中表示で吸収できる(FR-007)。
  恒久的な待ち時間ではないため、専用の表示は追加しない。
- **Alternatives considered**:
  - Turso(SQLite互換): 今回の差分は最小になるが、SQL が SQLite 方言に固定される。
    将来 Postgres 固有の機能が必要になった時点で再移行が発生するため却下(会話での判断)。
  - Supabase: Postgres に認証が付くが、本specの範囲(認証は別spec)に対して広すぎる。
    無料枠が一定期間の無アクセスで一時停止する点も、記録アプリの用途に合いにくい。

## 2. ドライバの選定(`pg` と Neon サーバーレスドライバ)

- **Decision**: 実行時は標準の `pg`(node-postgres)の `Pool` を使う。
- **Rationale**: サーバーは Node.js の常駐プロセス(`node:http` + GraphQL Yoga)で、TCP 接続を維持できる。
  `pg` は Postgres 互換のどのホストでも動くため、将来ホスティング先を変えても差し替えが要らない。
- **確認した事実([Neon Serverless Driver](https://neon.com/docs/serverless/serverless-driver))**:
  サーバーレスドライバは TCP の代わりに HTTP / WebSocket で接続する。既定の `neon()`(HTTP)は
  単発クエリと非対話型トランザクション向けで、対話型トランザクションや `pg` 互換が必要な場合は
  `Pool` / `Client`(WebSocket)を使う。`pg` からの移行は import の差し替えで済む。
- **影響**: 将来サーバーレス環境(エッジ関数など)に載せる場合も、`pg` の import を
  `@neondatabase/serverless` に差し替えるだけで済む。本specではその切り替えは行わない。
- **実装時に確認する点**: Neon への接続には SSL が必要なため、接続文字列の `sslmode` 指定と
  `pg` 側の SSL オプションの組み合わせを起動確認時に検証する。
- **Alternatives considered**: サーバーレスドライバを最初から使う案。常駐サーバーでは TCP の方が素直で、
  トランザクションの扱いも標準的なため却下。

## 3. テスト・ローカル開発の保存先(PGlite)

- **Decision**: テストとローカル開発の保存先を PGlite(`@electric-sql/pglite`)にする。
  テストはインメモリ、ローカル開発はファイル永続化を使う。
- **確認した事実([PGlite Docs](https://pglite.dev/docs/))**: Node.js で利用でき、
  インメモリは `new PGlite()`、ファイル永続化は `new PGlite("./path")`。
  API は `query`(パラメータ付き)、`exec`(複数文のまとめ実行。マイグレーション向け)、`transaction`。
  Postgres 拡張は extensions API 経由で利用できる。
- **Rationale**: プロセス内で動くため、ネットワーク接続なしでテストできる(FR-018 / SC-005)。
  SQL 方言は Postgres そのものなので、実行時(Neon)との差が出ない。
- **リスクと対策(重要)**: PGlite はインスタンス起動時に WASM の Postgres を立ち上げるため、
  テストごとに新規インスタンスを作ると起動コストが積み上がる。現行はテストごとに
  SQLite のインメモリDBを作る形(安価)なので、同じ作り方をすると SC-006(2倍以内)を超える恐れがある。
  → **テストファイルごとに1インスタンスを使い回し、テストの前後で全テーブルを `TRUNCATE` する**方式を採る。
  実装時に実行時間を計測し、2倍以内に収まらない場合はインスタンスの共有範囲をさらに広げる。
- **Alternatives considered**:
  - Docker で Postgres を立てる: Windows 環境に Docker Desktop の前提が増え、CI にもサービス定義が必要。
    テストの起動が遅くネットワークにも依存するため却下。
  - テスト専用の Neon ブランチを使う: ネットワーク依存になり、FR-018 に反するため却下。

## 4. SQL の方言差(SQLite → Postgres)

- **Decision**: スキーマは型の読み替えのみで移植し、クエリはプレースホルダと upsert の書き方を変更する。
- 確認した差分と対応(現行スキーマは [data-model.md](./data-model.md) に全対応表):

  | 観点 | 現行(SQLite) | 移行後(Postgres) |
  |---|---|---|
  | 文字列・ID | `TEXT` | `text` |
  | 小数(体重・METs 等) | `REAL` | `double precision` |
  | 整数 | `INTEGER` | `integer` |
  | プレースホルダ | `?` / `@name` | `$1`, `$2`, … |
  | upsert | 検索 → `INSERT` か `UPDATE` に分岐 | `INSERT ... ON CONFLICT (date) DO UPDATE` |
  | 更新行数 | `result.changes` | `rowCount`(`pg`)/ `affectedRows`(PGlite) |
  | 外部キー | 接続ごとに `PRAGMA foreign_keys = ON` が必要 | 既定で有効(PRAGMA 不要) |
  | 準備済み文の使い回し | `db.prepare` を生成時に1回 | 文はクエリ発行時に渡す(プールのため) |

- **Rationale**: 現行スキーマは SQLite 固有の機能(`AUTOINCREMENT`、日時関数)を使っておらず、
  UUID はアプリ側で生成しているため、移植は機械的に収まる。
- **upsert を `ON CONFLICT` にする理由**: 現行は「検索してから分岐」のため、同一日付への同時書き込みで
  二重作成が起こりうる。`ON CONFLICT` は一意制約に対して原子的に動くので、spec の Edge Case を解消できる。
  返り値は `RETURNING` で取得し、現行と同じ値を返す。
- **日付は文字列のまま維持する**: 期間集計のドメインロジック(`periodAggregate.ts`)が
  `YYYY-MM-DD` 文字列を前提にしている。`date` 型に変えるとドメイン層とそのテストに波及するため、
  本specでは `text` のまま保持する(FR-005)。

## 5. マイグレーションの管理方式

- **Decision**: `apps/server/migrations/NNNN_<名前>.sql` を番号順に適用する小さな処理を自作する。
  適用済みは `schema_migrations`(ファイル名を主キー、適用時刻)で管理する。ORM は導入しない。
- **Rationale**: 001 research #2 の「ORM・マイグレーションフレームワークは導入しない」方針を維持する。
  必要な機能は「未適用のSQLを順に適用し、記録する」だけで、数十行で書ける。
- **設計の要点**:
  - 1ファイルの適用は1トランザクションで行い、途中失敗時は何も残らない(spec Edge Case)。
  - 適用処理はアプリの起動経路から切り離し、CLI(`yarn workspace @my-health-app/server migrate`)で実行する(FR-010)。
  - テストは同じ適用処理を関数として呼び、テスト用DBにスキーマを作る(本番と同じ経路で検証する)。
- **Alternatives considered**:
  - 起動時に `CREATE TABLE IF NOT EXISTS` を流し続ける(現行方式): 共有DBに対して起動のたびに DDL を流すのは
    権限・同時起動の面で危険。変更の履歴も残らないため却下。
  - Drizzle / Prisma の migrate: スキーマ定義の一次ソースが増え、原則IVと 001 の方針に反するため却下。

## 6. 固定データ(種目マスタ・食材)の投入

- **Decision**: 投入処理は TypeScript の配列を一次ソースとして維持し、`INSERT ... ON CONFLICT (id) DO UPDATE`
  で冪等にする。実行は CLI(`seed`)とテストのセットアップから呼ぶ。
- **Rationale**: 既存のテストが `exerciseCatalogSeed` / `foodItemsSeed` の配列と取得結果を比較している。
  配列を一次ソースに保てば、それらのテストを変更せずに済む。マスタの値を更新したときに
  `DO UPDATE` で追従できる(削除は扱わない)。
- **Alternatives considered**: マイグレーションSQLに `INSERT` を書く案。値の更新履歴が追いやすい一方、
  既存テストが参照する TypeScript 配列と二重管理になるため却下(原則IV)。

## 7. 秘匿情報の扱い(FR-012 / FR-013)

- **Decision**: 接続文字列は環境変数 `DATABASE_URL` で渡す。ローカルは `.env.local`、CI は Secrets。
  読み込みは Node.js 22 の `--env-file` を使い、dotenv は追加しない。
- **検証**: 接続文字列が未設定・不正な場合は、起動時に「どの環境変数が必要か」を含むメッセージで失敗させる。
  起動から10秒以内に落ちることを確認する(SC-007)。
- **CI**: サーバーのテストは PGlite を使うため、**CI に接続情報は不要**。
  Secrets が要るのは、将来デプロイを行う spec になってから。
- **確認**: `.env*` が `.gitignore` に含まれていることと、リポジトリに接続文字列が含まれていないことを検査する(SC-008)。

## 8. 同期 → 非同期への移行手順(作業の進め方)

- **Decision**: 「インターフェースを非同期にする → リポジトリを書き換える → リゾルバに await を足す」の順で、
  既存テストを通したまま段階的に進める。
- **影響範囲(実測)**:

  | 層 | ファイル | 変更内容 |
  |---|---|---|
  | データ層 | `db/client.ts`(新規)・`postgresClient.ts`(新規)・`pgliteClient.ts`(新規) | `query` と `transaction` のみを持つ最小の抽象 |
  | リポジトリ | `weightRepository.ts`(65行)・`trainingSessionRepository.ts`(130行)・`stepRecordRepository.ts` | 戻り値を `Promise` に。`prepare` の使い回しをやめ、`$n` と `ON CONFLICT` に書き換え |
  | リポジトリのテスト | 3ファイル | `await` の追加と、DBの用意を PGlite に変更 |
  | リゾルバ | `weight.ts`(43行目の `list().map`)・`steps.ts`・`training.ts` | 後続処理がある箇所のみ `await`。そのまま返している箇所は**変更不要**(GraphQL が Promise を解決する) |
  | 組み立て | `app.ts`・`index.ts` | 注入する実体が SQL実行インターフェースに変わる |
  | スキーマ層のテスト | 5ファイル(約800行) | DBの用意を PGlite に変更 |

- **Rationale**: トランザクションを使っているのは `trainingSessionRepository` の upsert(セッション + 種目内訳)
  のみで、ここだけ `transaction` を使う。他はクエリ単体で完結する。
- **検証のよりどころ**: サーバーの既存テスト107件がそのまま回帰テストになる。移行の各段階で全件を実行する。

## 9. 取得に失敗したときの画面の振る舞い(FR-007)

- **Decision**: 現状の振る舞い(取得失敗時は空状態の表示にフォールバック)を維持する。
- **Rationale**: 保存先が変わると、一時的な接続失敗や自動停止明けの遅延が起こりうるが、
  エラー表示の設計は画面側の課題で、本specの範囲(保存先の載せ替え)から外れる。
  既存の画面テスト(`*Page.stories.tsx` の「取得に失敗したときは現状どおり0件の表示になる」)が
  この振る舞いを固定しているため、移行で崩れたら検知できる。
- **別specで扱う**: 専用のエラー表示と再試行の導線。

## 10. 未確認事項(実装時に確認する)

- `pg` と Neon の SSL 設定の組み合わせ(接続文字列の `sslmode` と `pg` のオプション)
- PGlite のインスタンス起動にかかる実時間と、テスト全体の所要時間(SC-006 の 2倍以内に収まるか)
- PGlite が `ON CONFLICT ... RETURNING` を含む本specで使う構文をすべて同じ結果で扱うこと
- Neon 無料プランの条件は変動しうるため、作業着手時に [Neon Pricing](https://neon.com/pricing) を再確認する

## 出典

- [Neon Pricing](https://neon.com/pricing)
- [Neon Serverless Driver](https://neon.com/docs/serverless/serverless-driver)
- [PGlite Documentation](https://pglite.dev/docs/)
