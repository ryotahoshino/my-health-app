# Quickstart: デザイントークン適用の動作確認

**Date**: 2026-09-18 | **Feature**: [spec.md](./spec.md)

実装後に本フィーチャーが成立していることを確認する手順。トークンの詳細は
[data-model.md](./data-model.md)、参照規則は [contracts/theme-tokens.md](./contracts/theme-tokens.md)、
アプリシェルの要件は [contracts/app-shell.md](./contracts/app-shell.md)、
API依存の注入は [contracts/api-injection.md](./contracts/api-injection.md) を参照。

## 前提条件

- Node.js 22 以上、Corepack 有効(`corepack yarn --version` で Yarn Berry が動くこと)
- リポジトリルートで `corepack yarn install`

## セットアップ

```bash
# サーバーのGraphQLスキーマからSDLを生成(本フィーチャーでは変更しないが、クライアントのビルドに必要)
corepack yarn workspace @my-health-app/server generate:schema
corepack yarn workspace @my-health-app/client codegen

# クライアント起動
corepack yarn dev:client

# Storybook 起動(コンポーネント単位の確認用)
corepack yarn storybook
```

## 自動テストの実行(`[自動]` の受け入れ条件)

```bash
# テーマ・コントラストの単体テスト、画面単位のテスト(フェイクAPI注入)、全ストーリーのa11y検査
corepack yarn workspace @my-health-app/client test

# サーバー: 既存のリゾルバ/リポジトリのテスト + 起動処理ごとの統合テスト(一時DB注入)
corepack yarn workspace @my-health-app/server test

# トークンを迂回した生値(色コード・px)の検出
corepack yarn lint

# 型チェックとビルド
corepack yarn workspace @my-health-app/client typecheck
corepack yarn workspace @my-health-app/client build
```

上記に加え、Storybook のアクセシビリティ検査(コントラスト比を含む)は
クライアントの `test` に含まれて実行される。違反があればテストが失敗する。

| 受け入れ条件 | 検証手段 |
|---|---|
| SC-004 トークン変更が全画面に波及 | テーマ単体テスト |
| SC-005 生値の直接記述が0件 | `corepack yarn lint` |
| SC-006 アクセシビリティ違反0件 | クライアント `test`(全ストーリー) |
| SC-007 コントラスト比 | クライアント `test`(検査ルールに含まれる) |
| SC-009 既存機能の非破壊 | サーバー `test` + クライアント `test` + ビルド |
| SC-011 現在地・キーボード移動 | AppShell のストーリー |
| SC-013 コントラストが適用前の基準値を下回らない | コントラストの単体テスト(`contrast.test.ts`) |
| SC-014 画面・表示部品からの API 実体の直接参照が0件 | `corepack yarn lint`(`no-restricted-imports`) |
| SC-015 4画面の画面単位テスト | 各画面のストーリー(フェイクの ApiClient を注入) |
| SC-016 サーバーの起動処理ごとの統合テスト | サーバー `test`(`app.test.ts`) |
| SC-017 Lint の警告・エラー0件 | `corepack yarn lint` |
| INV-2 本文16px以上・行高1.5以上 | テーマ単体テスト |
| INV-3 余白が6段階に一致 | テーマ単体テスト |

## 手動確認シナリオ(`[手動]` の受け入れ条件)

ブラウザで4画面(`/weight`、`/training`、`/steps`、`/foods`)を開き、以下を確認する。

1. **階層(SC-001)**: 各画面で「画面見出し」「本文」「補足」の役割が、文字サイズ・太さ・色の
   複数の差によって区別できる。
2. **まとまり(SC-002)**: 情報のまとまりが面として認識でき、どこで区切られているかが分かる。
3. **入力と結果の分離(SC-003)**: 記録画面(体重・トレーニング・歩数)で、入力フォームの領域と
   結果表示の領域が別の面として区別できる。
4. **一貫性(SC-001/SC-002 の横断確認)**: 4画面を巡回し、同じ役割の要素が画面をまたいで
   同じ見え方になっている。
5. **空状態・読み込み中**: 記録を0件にした状態、および読み込み中の状態でも階層表現が保たれ、
   平坦に見えない。
6. **書体(SC-012)**: 初回読み込み時、書体の適用前も本文が判読でき、適用後に主要な要素の位置が
   大きく飛ばない(キャッシュを無効化して再読込して確認する)。
7. **狭い画面(SC-008)**: 画面幅375pxで4画面すべてを開き、横スクロールが発生しない。
   ブラウザ自動操作のスクリプトで各画面を幅375pxで開き、`scrollWidth` が `clientWidth` を
   超えないことを確認する方式でもよい。
8. **のっぺり解消(SC-010)**: 適用前後を比較し、「のっぺりしている」状態が解消されたと判断できる。

## 既知の非対応(このspecの範囲外)

- 暗い配色モード(ダークモード)。明るい配色のみを提供する(FR-015)
- 印刷用スタイル、アニメーション・モーションの体系的な設計
- デジタル庁デザインシステムのコンポーネント一式の移植(憲法の非目標)
- 機能・データモデル・APIスキーマの変更(FR-013)
- API 呼び出し失敗時の専用の表示(現状は0件と区別されない)。本フィーチャーでは現状の振る舞いを
  画面テストで固定するに留め、改善は別フィーチャーで扱う
