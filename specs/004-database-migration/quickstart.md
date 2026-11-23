# Quickstart: 記録データの保存先をマネージドデータベースへ移す

**Date**: 2026-11-23 | **Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

移行後の動作確認の手順。自動で確認できるものは `[自動]`、画面や外部サービスを見る必要があるものは `[手動]`。

## 前提

- Node.js 22 / Corepack 有効(既存どおり)
- Neon のアカウントとプロジェクト(無料プラン)。接続文字列を取得できる状態
- 現行のローカルデータ(`apps/server/data/health-app.db`)が手元にある

## 1. 接続情報の設定

```bash
# apps/server/.env.local を作成する(.gitignore 対象。リポジトリに含めない)
# DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
```

確認:

- `[自動]` `git status` に `.env.local` が現れない
- `[自動]` リポジトリ内に接続文字列が含まれていない(検索して0件、SC-008)

## 2. スキーマの適用と固定データの投入

```bash
corepack yarn workspace @my-health-app/server migrate
corepack yarn workspace @my-health-app/server seed
```

期待する結果:

- `[自動]` 1回目はすべてのマイグレーションが適用され、適用したファイル名が出力される
- `[自動]` 2回目は適用0件で正常終了する(SC-004)
- `[自動]` 投入を2回実行しても固定データの件数が変わらない(INV-5)

## 3. 既存データの移送(1回限り)

```bash
# 事前にコピーを控える
cp apps/server/data/health-app.db apps/server/data/health-app.db.backup

corepack yarn workspace @my-health-app/server export:sqlite   # JSON に書き出す
corepack yarn workspace @my-health-app/server import:records  # 新しい保存先に取り込む
```

期待する結果:

- `[自動]` 書き出した件数と、取り込み後の件数が一致する(SC-002)
- `[自動]` 取り込みを2回実行しても件数が増えない(FR-016)
- `[手動]` 元のSQLiteファイルの更新時刻が変わっていない(読み取りのみ、FR-017)

## 4. 自動テスト

```bash
corepack yarn workspace @my-health-app/server test     # PGlite を使う。接続情報は不要
corepack yarn workspace @my-health-app/client test     # 変更なし
corepack yarn lint
corepack yarn format:check
corepack yarn workspace @my-health-app/server typecheck
corepack yarn workspace @my-health-app/client typecheck
```

期待する結果:

- `[自動]` サーバーのテストが移行前と同じ件数以上で成功する(SC-001)
- `[自動]` クライアントのテストが変更なしで成功する(GraphQL の契約が変わっていない証拠)
- `[自動]` ネットワークを切断した状態でもサーバーのテストが成功する(SC-005)
- `[自動]` サーバーのテストの所要時間が移行前の2倍以内(SC-006)
  - 移行前の基準値: サーバー 17ファイル / 107件。実行時間を移行前に計測して記録する

## 5. 接続情報の誤りの検知

```bash
# 誤った接続文字列、または未設定で起動する
corepack yarn workspace @my-health-app/server dev
```

期待する結果:

- `[自動]` 起動から10秒以内に停止し、必要な環境変数の名前を含むメッセージが出る(SC-007 / FR-013)

## 6. 画面の通し確認

```bash
corepack yarn dev:server   # 新しい保存先に接続
corepack yarn dev:client
```

手動シナリオ:

1. `[手動]` 体重を記録 → 一覧に出る → 再読込しても残る(US1 シナリオ1)
2. `[手動]` 同じ日付でもう一度記録 → 件数が増えず、値が上書きされる(US1 シナリオ2)
3. `[手動]` トレーニングのセッションを記録 → 削除 → 種目内訳も消える(US1 シナリオ3)
4. `[手動]` 歩数を記録 → 日次・週次・月次を切り替える → 集計が移行前と同じ(US1 シナリオ4)
5. `[手動]` 食材一覧が表示される(固定データの投入確認)
6. `[手動]` 5分以上放置してから操作する → 読み込み中の表示を経て結果が出る(自動停止からの復帰、research #1)

## 7. 移行の後片付け

- `[手動]` `export:sqlite` / `import:records` スクリプトと、SQLite 関連の依存・設定を削除する
- `[手動]` `apps/server/data/` のバックアップの保管場所を決める(リポジトリには置かない)
- `[手動]` README に接続情報の設定手順(`.env.local`)を追記する
