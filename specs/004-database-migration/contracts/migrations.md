# Contract: マイグレーションと固定データの投入

**Date**: 2026-11-23 | **Feature**: [spec.md](../spec.md) | **Research**: [research.md](../research.md) #5・#6

スキーマ変更の管理方法と、固定データの投入方法を定める。

## マイグレーション

### ファイルの置き場所と命名

```text
apps/server/migrations/
├── 0001_init.sql        # 既存6テーブル・制約・インデックス
└── NNNN_<変更の内容>.sql  # 以降の変更
```

- 4桁の連番 + `_` + 内容を表す英小文字(例: `0002_add_review_cache.sql`)。
- 適用順はファイル名の昇順。番号は再利用しない。
- **適用済みのファイルは編集しない**。変更は必ず新しいファイルとして追加する。

### 適用処理

| 項目 | 内容 |
|---|---|
| 公開する関数 | `runMigrations(db: Database): Promise<{ applied: string[] }>` |
| CLI | `corepack yarn workspace @my-health-app/server migrate` |
| 適用単位 | 1ファイル = 1トランザクション。失敗時はそのファイルの変更が残らない |
| 冪等性 | 適用済みのファイルは読み飛ばす。全件適用済みなら何も変更せず正常終了する |
| 記録 | `schema_migrations`(ファイル名・適用時刻)に追加する |
| 戻り値 | 今回適用したファイル名の一覧(0件なら空配列) |

### 規則

1. **アプリの起動経路では実行しない**(FR-010)。`index.ts` は接続するだけで、DDL を流さない。
2. **テストは同じ `runMigrations` を使う**。テスト専用のスキーマ定義を別に置かない(原則IV)。
3. **破壊的な変更の扱い**: 列の削除・改名は「追加 → 移行 → 削除」の複数ファイルに分ける。
   本specの範囲では発生しない。
4. **`schema.sql` は削除する**。スキーマの一次ソースは `migrations/` に一本化する。

## 固定データの投入

| 項目 | 内容 |
|---|---|
| 一次ソース | `apps/server/src/db/seed/exerciseCatalog.ts`・`foodItems.ts` の TypeScript 配列(現行を維持) |
| 公開する関数 | `runSeeds(db: SqlExecutor): Promise<void>` |
| CLI | `corepack yarn workspace @my-health-app/server seed` |
| 冪等性 | `INSERT ... ON CONFLICT (id) DO UPDATE` で、値の更新にも追従する |
| 範囲 | 種目マスタ・食材のみ。利用者の記録は対象外 |

### 規則

1. 投入処理はアプリの起動経路では実行しない(起動時の書き込みをなくす)。
2. 配列から削除された項目をDBから消す処理は作らない(参照している記録が壊れるため)。
3. マイグレーションSQLに `INSERT` を書かない(TypeScript 配列との二重管理を避ける、原則IV)。

## 既存データの移送(1回限り)

| スクリプト | 内容 |
|---|---|
| `apps/server/scripts/export-sqlite.ts` | 現行のSQLiteファイルを**読み取り専用で開き**、記録をJSONに書き出す(FR-017) |
| `apps/server/scripts/import-records.ts` | 書き出したJSONを新しい保存先に取り込む |

### 規則

1. 取り込みは `ON CONFLICT (id) DO NOTHING` で冪等にする(FR-016)。
2. 取り込みの順序は `training_sessions` → `exercise_sets`(外部キーの順)。
3. 固定データは移送しない(投入処理で再生成する)。
4. 移送の前に、現行のSQLiteファイルのコピーを控える(手順は [quickstart.md](../quickstart.md))。
5. **移送完了後、この2つのスクリプトは削除する**。恒久的に使う機能ではない。

## 検証(いずれも `[自動]`)

| 観点 | 手段 |
|---|---|
| 空のDBに適用すると全テーブルが揃う | 適用処理の単体テスト |
| 2回続けて適用しても失敗しない | 同上(2回呼んで適用件数が0件になることを確認) |
| 1ファイルの途中失敗で変更が残らない | 失敗するSQLを含むファイルを与えるテスト |
| 投入処理を繰り返しても重複しない | 投入処理の単体テスト(2回呼んで件数が変わらない) |
| 取り込みを繰り返しても重複しない | 取り込み処理の単体テスト |
