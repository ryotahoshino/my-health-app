---

description: "Task list for 記録データの保存先をマネージドデータベースへ移す"
---

# Tasks: 記録データの保存先をマネージドデータベースへ移す

**Input**: Design documents from `/specs/004-database-migration/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/database-access.md](./contracts/database-access.md), [contracts/migrations.md](./contracts/migrations.md), [quickstart.md](./quickstart.md)

**Tests**: 憲法 原則III(テスト先行)により必須。各フェーズでテストタスクを実装タスクより先に置き、実装前に失敗することを確認する。既存のサーバーのテスト107件は移行の回帰テストとして機能するため、各段階で全件を実行する。

**Organization**: spec.md のユーザーストーリーごとにフェーズを分ける。US1 と US2 はともに P1 だが、スキーマが無いとリポジトリの移行を検証できないため US2(スキーマ変更の履歴管理)を先に実施する。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行実行可能(別ファイル・未完了タスクへの依存なし)
- **[Story]**: 対応するユーザーストーリー(US1〜US4)
- 各タスクに具体的なファイルパスを含める

## Path Conventions

plan.md の Project Structure に基づく。変更は `apps/server` と CI に閉じ、`apps/client` には触れない。

- SQL 実行とスキーマ管理: `apps/server/src/db/`
- マイグレーションSQL: `apps/server/migrations/`
- CLI・使い捨てスクリプト: `apps/server/scripts/`
- リポジトリ: `apps/server/src/repositories/`
- GraphQL: `apps/server/src/schema/`
- テスト支援: `apps/server/test-support/`

---

## Phase 1: Setup(依存・接続情報・基準値)

**Purpose**: 新しい依存を入れ、接続先を用意し、移行前の基準値を記録する

- [X] T001 `apps/server/package.json` に `pg`(と型定義 `@types/pg`)・`@electric-sql/pglite` を追加し、`better-sqlite3` を dependencies から devDependencies へ移す(既存データの書き出しスクリプトでのみ使うため、research #2・#3)
- [ ] T002 Neon のプロジェクト(無料プラン)を作成し、接続文字列を `apps/server/.env.local` に `DATABASE_URL` として設定する。`.gitignore` に `.env*` が含まれていること、リポジトリ内に接続文字列が存在しないことを確認する(FR-012 / SC-008)
  - **未実施(利用者の操作が必要)**: Neon のプロジェクト作成と接続文字列の取得はアカウント操作のため代行できない。`.gitignore` には `.env` と `.env.*` が既に含まれていることを確認済み(リポジトリ内に接続文字列は存在しない)。
- [X] T003 [P] `apps/server/package.json` の `dev` スクリプトに Node の `--env-file=.env.local` を付け、接続情報を dotenv なしで読み込めるようにする(research #7)
- [X] T004 [P] 移行前の基準値を測定して `specs/004-database-migration/research.md` の #10 に記録する: サーバーのテスト件数と所要時間(SC-006 の判定基準)
  - 移行前の基準値(2026-11-23 計測): サーバーのテスト 17ファイル / 107件、vitest の Duration 1.05秒(コマンド全体の実時間 2.97秒)。SC-006 の判定基準はこの2倍。
- [X] T005 [P] `specs/004-database-migration/research.md` の #1 の無料枠の条件を公式ページで再確認し、差異があれば更新する(研究時点から変動しうるため)

---

## Phase 2: Foundational(すべてのユーザーストーリーをブロックする前提作業)

**Purpose**: SQL 実行の抽象(`pg` と PGlite の2実装)とテスト支援を用意する

**⚠️ CRITICAL**: このフェーズが完了するまでユーザーストーリーの実装に着手しない

### Tests for Foundational ⚠️

> テストを先に書き、実装前に失敗することを確認する(憲法 原則III)

- [X] T006 [P] SQL 実行の契約テストを `apps/server/src/db/pgliteClient.test.ts` に作成する。(a) `query` がパラメータ(`$1`)付きで行を返す、(b) `rowCount` が更新・削除した行数を返す、(c) `transaction` が例外時に何も適用しない、(d) `transaction` 内の `SqlExecutor` で同じ接続のデータが見える。実装前に失敗することを確認する(contracts/database-access.md「インターフェース」)
- [X] T007 [P] 接続情報の検証のテストを `apps/server/src/db/databaseUrl.test.ts` に作成する。未設定・空文字・スキーマが不正な値に対して、必要な環境変数名を含むエラーになること。実装前に失敗することを確認する(FR-013 / SC-007)

### Implementation for Foundational

- [X] T008 `apps/server/src/db/client.ts` に `SqlResult` / `SqlExecutor` / `Database` の型を定義する。ドライバ差(`rowCount` と `affectedRows`)を吸収する方針をコメントに残す(contracts/database-access.md)
  - 実装時の追加: PGlite の `query` は複数文を扱えないため(`cannot insert multiple commands into a prepared statement`)、マイグレーションのファイルを流すための `exec(sql)` を `SqlExecutor` に追加した。pg 側はパラメータなしの単純クエリで複数文を実行できる。
- [X] T009 `apps/server/src/db/pgliteClient.ts` に `createPgliteDatabase(dataDir?)` を実装し、T006 を成功させる。引数なしでインメモリ、パス指定でファイル永続化(research #3、依存: T008)
- [X] T010 [P] `apps/server/src/db/postgresClient.ts` に `createPostgresDatabase(connectionString)` を実装する(`pg` の `Pool`、`transaction` は `BEGIN` / `COMMIT` / `ROLLBACK`)。SSL の指定は research #10 のとおり起動確認時に検証する(依存: T008)
- [X] T011 [P] `apps/server/src/db/databaseUrl.ts` に接続情報の読み取りと検証を純粋関数として実装し、T007 を成功させる。接続そのものは行わない(原則V)
- [X] T012 `apps/server/test-support/createTestDatabase.ts` を実装する。PGlite のインスタンスをテストファイル単位で用意し、マイグレーションの適用処理を実行して `Database` を返す。各テストの前に全テーブルを `TRUNCATE` する関数も提供する(research #3 / contracts/database-access.md「テストの契約」、依存: T009, T021)

**Checkpoint**: SQL 実行の抽象が2実装で揃い、テストから PGlite のDBを用意できる

---

## Phase 3: User Story 2 - スキーマの変更が履歴として管理される (Priority: P1、US1 より先に実施)

**Goal**: 番号付きSQLファイルと適用済み記録でスキーマ変更を管理し、アプリ起動時の DDL 実行をやめる

**Independent Test**: 空のデータベースに対して適用処理を実行し、必要なテーブルと制約がすべて揃うこと、同じ処理を2回実行しても失敗しないことを確認する(spec US2)

### Tests for User Story 2 ⚠️

- [X] T013 [P] [US2] マイグレーション適用処理のテストを `apps/server/src/db/migrate.test.ts` に作成する。(a) 空のDBに適用すると全テーブルが作られる、(b) 2回目の適用は0件で正常終了する、(c) 失敗するSQLを含む変更単位は何も残さない(1ファイル=1トランザクション)、(d) 新しいファイルを1つ足すとそれだけが適用される。実装前に失敗することを確認する(contracts/migrations.md「検証」)
- [X] T014 [P] [US2] 固定データ投入のテストを `apps/server/src/db/seed.test.ts` に作成する。(a) 投入後に種目マスタ・食材が TypeScript 配列と一致する、(b) 2回実行しても件数が変わらない(INV-5)、(c) 配列の値を変えて再実行すると値が追従する。実装前に失敗することを確認する

### Implementation for User Story 2

- [X] T015 [US2] `apps/server/migrations/0001_init.sql` を作成する。data-model.md の型の対応表に従って既存6テーブル・`CHECK`・外部キー(CASCADE)・一意制約・インデックスを定義する。日付は `text` のまま維持する(FR-005)
- [X] T016 [US2] `apps/server/src/db/migrate.ts` に `runMigrations(db)` を実装し、T013 を成功させる。`schema_migrations`(ファイル名・適用時刻)で適用済みを管理し、1ファイルを1トランザクションで適用する(依存: T013, T008)
- [X] T017 [P] [US2] `apps/server/src/db/seed.ts` に `runSeeds(db)` を実装し、T014 を成功させる。一次ソースは既存の TypeScript 配列(`db/seed/exerciseCatalog.ts`・`foodItems.ts`)、`INSERT ... ON CONFLICT (id) DO UPDATE` で冪等にする(依存: T014, T008)
- [X] T018 [US2] `apps/server/scripts/migrate.ts` と `apps/server/scripts/seed.ts`(CLI)を作成し、`apps/server/package.json` に `migrate` / `seed` スクリプトを追加する。接続情報は `--env-file=.env.local` と `DATABASE_URL` から読む(依存: T016, T017, T011)
- [ ] T019 [US2] Neon の空のデータベースに対して `migrate` と `seed` を実行し、`specs/004-database-migration/quickstart.md` の手順2の期待結果(1回目は適用あり、2回目は0件、投入の重複なし)を確認する(SC-003 / SC-004、依存: T018)
- [X] T020 [US2] 旧 `apps/server/src/db/schema.sql` と、起動時にスキーマを作る経路を削除する。スキーマの一次ソースを `migrations/` に一本化する(FR-010 / 原則IV、依存: T016)
- [X] T021 [US2] `apps/server/test-support/createTestDatabase.ts` から `runMigrations` を呼ぶ形に仕上げ、テストが本番と同じ適用経路でスキーマを得るようにする(contracts/migrations.md 規則2、依存: T016, T012)

**Checkpoint**: 空のDBから1コマンドでスキーマが揃い、テストも同じ経路でスキーマを得られる

---

## Phase 4: User Story 1 - 記録が開発用PCの外に保存される (Priority: P1)

**Goal**: リポジトリとリゾルバを Postgres 前提に移し、4画面の振る舞いを変えずに保存先をマネージドDBへ切り替える

**Independent Test**: 新しい保存先に接続した状態で4画面を開き、記録の作成・取得・削除・期間切替が移行前と同じ結果になることを確認する(spec US1)

### Tests for User Story 1 ⚠️

> 既存テストの移植が中心。移植した時点では実装が同期APIのままなので失敗する

- [X] T022 [US1] `apps/server/src/repositories/weightRepository.test.ts` を、PGlite のDBを注入し `await` で検証する形に移植する。検証内容(一覧の順序・同一日付の上書き・指定日以前の最新・削除)は変えない(依存: T012)
- [X] T023 [P] [US1] `apps/server/src/repositories/trainingSessionRepository.test.ts` を同様に移植する。セッションと種目内訳がまとめて置き換わること、削除で種目内訳も消えること(INV-2)を維持する(依存: T012)
- [X] T024 [P] [US1] `apps/server/src/repositories/stepRecordRepository.test.ts` を同様に移植する(依存: T012)
- [X] T025 [P] [US1] `apps/server/src/app.test.ts` を、PGlite のDBと固定の日付を注入する形に移植する。HTTP 経由の作成→取得と期間集計の検証内容は変えない(SC-001、依存: T012)
- [X] T026 [P] [US1] 同一日付への同時書き込みのテストを `apps/server/src/repositories/weightRepository.test.ts` に追加する。同じ日付の upsert を並行して実行しても1件に収まること(spec Edge Case / research #4)

### Implementation for User Story 1

- [X] T027 [US1] `apps/server/src/repositories/weightRepository.ts` を非同期化する。戻り値を `Promise` に、プレースホルダを `$n` に、upsert を `INSERT ... ON CONFLICT (date) DO UPDATE ... RETURNING` に変更し、T022・T026 を成功させる(FR-003、依存: T022, T008)
- [X] T028 [P] [US1] `apps/server/src/repositories/trainingSessionRepository.ts` を非同期化する。セッションと種目内訳の置き換えは `transaction` 内で行い、T023 を成功させる(依存: T023, T008)
- [X] T029 [P] [US1] `apps/server/src/repositories/stepRecordRepository.ts` を非同期化し、T024 を成功させる(依存: T024, T008)
- [X] T030 [US1] `apps/server/src/schema/context.ts` のリポジトリの型を非同期版に更新し、`apps/server/src/app.ts` の `createApp({ db, today })` が `Database` を受け取る形に変更する(依存: T027〜T029)
- [X] T031 [US1] `apps/server/src/schema/weight.ts`・`steps.ts`・`training.ts`・`exerciseCatalog.ts`・`foodItems.ts` のうち、取得結果に後続処理がある箇所(体重のグラフ用整形、歩数・トレーニングのカロリー算出、期間集計)に `await` を追加する。そのまま返している箇所は変更しない(research #8、依存: T030)
- [X] T032 [US1] `apps/server/src/schema/weight.test.ts`・`steps.test.ts`・`training.test.ts`・`trainingCalorie.test.ts`・`foodItems.test.ts` のDBの用意を PGlite に置き換え、全件成功させる(SC-001、依存: T031, T012)
- [X] T033 [US1] `apps/server/src/index.ts` を、接続の生成(`createPostgresDatabase`)と `createApp` の呼び出し・待ち受けのみにする。DDL と固定データの投入は行わない。接続情報が未設定・不正なら起動時に失敗させる(FR-010 / FR-013、依存: T011, T010, T030)
- [X] T034 [US1] 旧 `apps/server/src/db/connection.ts`(SQLite 接続)を削除し、`better-sqlite3` への参照が書き出しスクリプト以外に残っていないことを確認する(依存: T032, T033)
- [X] T035 [US1] 誤った接続文字列・未設定で起動し、10秒以内に必要な環境変数名を含むメッセージで停止することを確認する(SC-007 / `specs/004-database-migration/quickstart.md` 手順5。対象: `apps/server/src/index.ts`、依存: T033)
  - 確認済み: `DATABASE_URL` 未設定で「環境変数 DATABASE_URL が設定されていません。apps/server/.env.local に Postgres の接続文字列を設定してください」、postgres 以外のスキームで「postgres の接続文字列ではありません(指定されたスキーム: mysql:)」と表示して即座に停止する。
- [ ] T036 [US1] 実サーバー(Neon)+ クライアントを起動し、`specs/004-database-migration/quickstart.md` 手順6のシナリオ1〜5(記録・上書き・削除時の連動・期間切替・固定データ)を確認する(SC-010、依存: T033, T019)
- [ ] T037 [US1] 自動停止からの復帰を確認する。5分以上放置してから操作し、読み込み中の表示を経て結果が表示されること(research #1 / `specs/004-database-migration/quickstart.md` 手順6シナリオ6、依存: T036)

**Checkpoint**: 記録がマネージドDBに保存され、4画面の振る舞いは移行前と同じ

---

## Phase 5: User Story 4 - 外部サービスに接続せずに検証・開発ができる (Priority: P2)

**Goal**: テストとローカル開発がネットワークなしで動き、テスト間でデータが混ざらず、実行時間が許容範囲に収まる

**Independent Test**: ネットワークを切断した状態で、クライアントとサーバーの全テストが成功することを確認する(spec US4)

### Tests for User Story 4 ⚠️

- [X] T038 [P] [US4] テスト間の独立性のテストを `apps/server/test-support/createTestDatabase.test.ts` に作成する。前のテストで投入したデータが次のテストから見えないこと(`TRUNCATE` が効いていること、FR-019)

### Implementation for User Story 4

- [X] T039 [US4] `apps/server/test-support/createTestDatabase.ts` のインスタンス共有と `TRUNCATE` の方式を確定し、T038 を成功させる。ファイル単位で1インスタンスを使い回す(research #3、依存: T038)
- [~] T040 [US4] サーバーのテストの所要時間を測定し、T004 の基準値の2倍以内に収まることを確認する。超える場合は `apps/server/test-support/createTestDatabase.ts` のインスタンスの共有範囲を広げる(SC-006、依存: T039, T032)
  - **未達(判断が必要)**: 移行前 1.05秒 → 移行後 8.21秒。対策を3つ実施しても約7.3〜8.2秒で、SC-006 の2倍以内(2.1秒)には届かない。PGlite の WASM 起動コストが支配的で、代替(Docker の Postgres)は FR-018(外部サービスなしでの検証)に反する。基準の見直し(例: 全テストが15秒以内)を提案する。詳細は research.md #10。
- [X] T041 [P] [US4] ローカル開発でネットワークなしに動かす手段を用意する。`DATABASE_URL` が未設定のときにファイル永続化の PGlite を使う開発用スクリプト(`dev:local` など)を `apps/server/package.json` に追加する(FR-020、依存: T009, T033)
- [~] T042 [US4] ネットワークを切断した状態で、`corepack yarn workspace @my-health-app/server test` と `corepack yarn workspace @my-health-app/client test` が成功することを確認する(SC-005、依存: T040)
  - 確認済み: `DATABASE_URL` を外した状態でサーバーのテスト(DB を使う8ファイル46件)が成功する。クライアントのテストも 111件成功。物理的なネットワーク切断での再確認は利用者環境で行う。
- [X] T043 [US4] `.github/workflows/ci.yml` を確認し、サーバーのテストが接続情報(Secrets)なしで通ることを確かめる。必要なら手順の順序のみ調整する(research #7、依存: T042)

**Checkpoint**: 外部サービスなしでテスト・開発ができ、テストは互いに影響しない

---

## Phase 6: User Story 3 - 既存の記録が失われない (Priority: P2)

**Goal**: 現行のローカルデータを読み取り専用で書き出し、新しい保存先へ冪等に取り込む

**Independent Test**: 現行のローカルデータから書き出し、新しい保存先に取り込んだうえで、記録の件数と内容が移送前と一致することを確認する(spec US3)

### Tests for User Story 3 ⚠️

- [X] T044 [P] [US3] 取り込み処理のテストを `apps/server/scripts/importRecords.test.ts` に作成する。(a) 書き出し形式のデータを取り込むと件数と内容が一致する、(b) 2回取り込んでも増えない(FR-016)、(c) セッションより先に種目内訳を入れようとしても整合性が崩れない(取り込み順序、data-model.md #5)。実装前に失敗することを確認する

### Implementation for User Story 3

- [X] T045 [US3] `apps/server/scripts/export-sqlite.ts` を作成する。現行のSQLiteファイルを読み取り専用で開き、利用者の記録(体重・セッション・種目内訳・歩数)をJSONに書き出す。固定データは対象外(FR-017 / data-model.md #5)
- [X] T046 [US3] `apps/server/scripts/import-records.ts` と取り込み処理を実装し、T044 を成功させる。`ON CONFLICT (id) DO NOTHING` で冪等にし、`training_sessions` → `exercise_sets` の順に取り込む(依存: T044)
- [X] T047 [US3] `apps/server/package.json` に `export:sqlite` / `import:records` スクリプトを追加する(依存: T045, T046)
- [~] T048 [US3] 現行データのコピーを控えたうえで移送を実行し、書き出し件数と取り込み後の件数が一致すること、再実行で増えないこと、元の `apps/server/data/health-app.db` が更新されていないことを確認する(SC-002 / `specs/004-database-migration/quickstart.md` 手順3、依存: T047)
  - `apps/server/data/` に既存のローカルDBが存在しなかったため、移送対象のデータは無し。代わりに一時的な SQLite(旧スキーマ)を作って書き出しスクリプトの動作を確認した(4種の記録が件数どおり JSON に出力される)。実データの移送が必要になった場合は、quickstart.md 手順3のとおり実行する。

**Checkpoint**: 既存の記録が新しい保存先に移り、画面から過去の記録が見える

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 後片付け・ドキュメント・CI 相当の最終確認

- [ ] T049 [P] 移送スクリプト(`apps/server/scripts/export-sqlite.ts` / `apps/server/scripts/import-records.ts` と `apps/server/scripts/importRecords.test.ts`、`apps/server/package.json` のスクリプト)を削除し、`better-sqlite3` を devDependencies から外す(contracts/migrations.md「移送」規則5、依存: T048)
- [X] T050 [P] `README.md` に接続情報の設定手順(`.env.local` と `DATABASE_URL`)、マイグレーションと固定データ投入のコマンド、ローカル開発でネットワークなしに動かす方法を追記する
- [X] T051 [P] `apps/server/data/` の扱いを整理する。移行後は使わないことを明記し、バックアップの保管場所(リポジトリ外)を決める
- [X] T052 [P] `specs/004-database-migration/research.md` の #10(未確認事項)を実測結果で更新する: SSL 設定の組み合わせ、PGlite の起動時間とテスト所要時間、`ON CONFLICT ... RETURNING` の挙動
- [X] T053 CI 相当の検証を通す: `corepack yarn lint`(エラー0件)・`corepack yarn format:check`・両ワークスペースの typecheck と test・クライアントの build・Storybook のビルド。あわせて `git diff --stat main -- apps/client` が空(クライアントに変更がない)ことを確認する(FR-006、依存: T042, T048)
  - 実施結果(2026-11-23): lint エラー0件、format:check 通過、サーバー・クライアントの typecheck 通過、サーバー 133件 / クライアント 111件のテスト成功、クライアントの build と Storybook の build 成功。`git diff --stat main -- apps/client` は空(クライアントに変更なし = GraphQL の公開契約が変わっていない証拠、FR-006)。
- [ ] T054 `specs/004-database-migration/quickstart.md` の全手順を通しで実施し、`[手動]` の項目を確認する(依存: T053)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup(Phase 1)**: 依存なし。最初に実施する
- **Foundational(Phase 2)**: Setup の完了が前提。すべてのユーザーストーリーをブロックする
- **US2(Phase 3)**: Foundational の完了が前提。US1 の前提でもある(スキーマが無いとリポジトリを検証できない)
- **US1(Phase 4)**: US2 の完了が前提
- **US4(Phase 5)**: US1 の完了が前提(移植後のテストを対象に計測・独立性を確認するため)
- **US3(Phase 6)**: US1 の完了が前提(取り込み先のスキーマと接続が必要)
- **Polish(Phase 7)**: US3 の完了が前提(移送スクリプトの削除を含むため)

### User Story Dependencies

- **US2(P1)**: 他のストーリーに依存しない。単独で検証できる(空のDBへの適用)
- **US1(P1)**: US2 に依存する
- **US4(P2)**: US1 に依存する。ただし T041(ローカル開発モード)は US1 完了後すぐに着手できる
- **US3(P2)**: US1 に依存する。US4 とは独立

### Within Each User Story

- テストを先に書き、実装前に失敗することを確認する
- データ層 → リポジトリ → リゾルバ → 組み立て(`app.ts` / `index.ts`)の順
- 1つのストーリーを完了させてから次に進む

### Parallel Opportunities

- Setup の T003・T004・T005 は並行可能
- Foundational のテスト T006・T007 は並行可能。実装では T010・T011 が並行可能
- US2 のテスト T013・T014 は並行可能
- US1 のテスト移植 T023・T024・T025・T026 は並行可能(T022 と同一ファイルのものを除く)
- US1 の実装 T028・T029 は並行可能(別ファイル)
- Polish の T049〜T052 は並行可能

---

## Parallel Example: User Story 1

```bash
# テストの移植を並行して進める(別ファイル):
Task: "trainingSessionRepository.test.ts を PGlite + await に移植"
Task: "stepRecordRepository.test.ts を PGlite + await に移植"
Task: "app.test.ts を PGlite 注入に移植"

# リポジトリの非同期化を並行して進める(別ファイル):
Task: "trainingSessionRepository.ts を transaction つきで非同期化"
Task: "stepRecordRepository.ts を非同期化"
```

---

## Implementation Strategy

### MVP(US2 + US1)

1. Phase 1: Setup(依存・接続先・基準値)
2. Phase 2: Foundational(SQL 実行の抽象とテスト支援)
3. Phase 3: US2(スキーマの適用と固定データ投入)
4. Phase 4: US1(リポジトリ・リゾルバの移行、保存先の切り替え)
5. **ここで停止して検証**: 4画面が新しい保存先で移行前と同じように動く

この時点で「SQLite のままコードを積み増す」問題は解消され、以降の機能追加(LLM 関連のテーブルなど)を
新しい保存先の上で進められる。

### Incremental Delivery

1. Setup + Foundational → 土台
2. US2 → 空のDBにスキーマを作れる
3. US1 → 記録がマネージドDBに保存される(ここまでで移行の目的を達成)
4. US4 → 検証と開発がネットワークなしで安定する
5. US3 → 過去の記録が戻る
6. Polish → 後片付けとドキュメント

### 中断した場合の安全性

- US1 完了まではローカルのSQLiteファイルを削除しない(移送の原本になる)
- T049(移送スクリプトの削除)は T048(移送の確認)完了後にのみ実施する

---

## Notes

- [P] タスク = 別ファイルで依存なし
- コード規約(既存の合意事項): 関数・コンポーネントはアロー関数で定義する / 条件分岐は三項演算子ではなく if/else を使う / 型定義は interface ではなく type を使う
- SQL は Postgres の構文のみを使い、パラメータは必ず `$n` で渡す(contracts/database-access.md 規則1・7)
- 各タスクまたは論理的なまとまりごとにコミットする。コミットメッセージは日本語の conventional commit 形式
- 各フェーズの Checkpoint で停止して検証できる
