# Contract: API依存の注入(US5)

**Date**: 2026-09-19 | **Feature**: [spec.md](../spec.md) | **Research**: [research.md](../research.md) #8・#9

クライアントの画面・フック・表示部品と、API クライアントの実体との関係を定める。
憲法 原則V(v1.2.0)の「依存の注入」「役割の分離」「フェイク注入による検証」を具体化したもの。

## クライアント

### 層と責務

| 層 | 置き場所 | 責務 | 依存してよいもの |
|---|---|---|---|
| composition root | `apps/client/src/app/App.tsx` | 実体(GraphQLClient・SDK・QueryClient)を生成し Provider で注入する | `app/api`・`app/queryClient` |
| 注入の仕組み | `apps/client/src/app/api/` | `ApiClient` 型、`createApiClient(endpoint)`、`ApiProvider`、`useApi()` を提供する | 生成SDK・`graphql-request` |
| データフック | `apps/client/src/features/*/hooks/` | API 呼び出し・クエリキー・キャッシュ無効化を担う | `useApi()`・TanStack Query |
| 画面 | `apps/client/src/features/*/*Page/` | フックと表示部品を組み合わせる。表示の条件分岐以外のロジックを持たない | データフック・表示部品・共通コンポーネント |
| 表示部品 | `apps/client/src/features/*/<Component>/`・`apps/client/src/components/` | props から描画する。API に触れない | テーマ・共通コンポーネント |

### 型

- `ApiClient` は GraphQL Code Generator が生成する `getSdk` の戻り値の型とする
  (`ReturnType<typeof getSdk>`)。手書きのインターフェースを別に定義しない(原則IV)。

### 規則

1. **直接 import の禁止**: `apps/client/src/features/**` と `apps/client/src/components/**` は、
   `graphql-request` および `createApiClient` を import してはならない。Lint(`no-restricted-imports`、error)で検出する(SC-014)。
2. **生成の一元化**: `createApiClient` を呼んでよいのは composition root(`App.tsx`)のみ。
   モジュールレベルのシングルトン(import しただけで生成される実体)を置かない。
3. **受け取り方**: データフックは `useApi()` で `ApiClient` を受け取る。Provider の外で呼ばれた場合は
   明示的なエラーを投げる(注入忘れを即座に検出するため)。
4. **クエリキー**: クエリキーはデータフックと同じ feature 内で1箇所に定義し、画面から直接組み立てない。
5. **振る舞いの維持**: 注入構造への変更によって、取得・更新・キャッシュ無効化の振る舞いを変えない(FR-013)。

### フェイク(テスト用)

- `createFakeApiClient(上書き)` は `ApiClient` を返す。上書きしなかったメソッドは、
  呼ばれた時点でメソッド名を含むエラーで失敗する(意図しない API 呼び出しをテストで検出するため)。
- ストーリー用デコレーター `withApiProviders` は、ストーリーごとに新しい QueryClient(再試行なし)と
  フェイクの `ApiClient` を注入する。ストーリー間でキャッシュを共有しない。

### 検証(いずれも `[自動]`)

| 観点 | 手段 |
|---|---|
| 4画面の 読み込み中 / 0件 / 記録あり / 追加・削除後の再取得 | 各画面のストーリー(Interaction Test)にフェイクを注入(SC-015) |
| API 失敗時の現状の振る舞いの固定 | 各画面のストーリーで、フェイクが失敗したときの現状の表示を明示的に検証する(spec Edge Cases) |
| 直接 import が0件 | `corepack yarn lint`(SC-014) |
| Provider 外での `useApi()` 呼び出しがエラーになる | 注入の仕組みの単体テスト |

## サーバー

### 起動処理の分離

| ファイル | 責務 |
|---|---|
| `apps/server/src/app.ts` | `createApp({ db, today })`: リポジトリの生成と GraphQL の context 組み立てを行い、GraphQL Yoga のインスタンスを返す。待ち受けはしない |
| `apps/server/src/index.ts` | 実DBの接続・シード・`createApp` の呼び出し・待ち受けのみを行う |

- `today` は「当日の日付を返す関数」として注入する。`index.ts` はシステムクロックを読む実装を、
  テストは固定の日付を返す実装を渡す。
- スキーマ・リゾルバ・リポジトリ・ドメインロジックは変更しない(FR-013)。

### 検証(`[自動]`)

- 一時DB(`createConnection(":memory:")`)と固定の日付を注入した `createApp` に対し、
  Yoga の `fetch` で記録の作成(mutation)→ 取得(query)を行い、作成した記録が返ることを確認する(SC-016)。
