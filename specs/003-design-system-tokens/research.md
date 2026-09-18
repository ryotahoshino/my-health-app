# Research: デザインシステム準拠のデザイントークン整備

**Date**: 2026-09-18 | **Feature**: [spec.md](./spec.md)

Technical Context の NEEDS CLARIFICATION を解消するための調査結果。

## 1. デザイントークンの一次情報と取得方法

- **Decision**: デジタル庁が公開する npm パッケージ `@digital-go-jp/design-tokens`(v2.0.1、MIT)を
  依存に追加し、`dist/tokens.js`(型定義 `dist/tokens.d.ts` 付き)から値を読み込んでテーマに写し取る。
  値を手作業で転記しない。
- **Rationale**: 公式が Tokens Studio for Figma → Style Dictionary 経由で生成した値をそのまま使えるため、
  転記ミスが起きず、原則X「踏襲する」を機械的に担保できる。JS/TS成果物があるため、
  CSS変数を介さずテーマ定義から型付きで参照できる。
- **Alternatives considered**:
  - 公開ドキュメント/Figmaデータから手で転記: 転記ミスと更新追従の手間が発生するため却下。
  - `dist/tokens.css`(CSS変数)を読み込む: 参照は容易だがテーマ定義側で値を計算・加工できず、
    型チェックも効かないため補助的手段に留める。

### 実測結果(T001、2026-09-19、v2.0.1)

- モジュール形式は **CommonJS**(`dist/tokens.js` は `module.exports = {...}`)。型定義は
  `export default tokens` のため、利用側は default import で参照する(Vite・vitest とも相互運用で解決できる)。
- 型定義上 `$value` は **`any`**(`DesignToken.$value?: any`)であり、型による保護が効かない。
  そのため tokens.ts で「期待する型への変換と検証」を行い、以降の層には型付きの値だけを渡す。
- 最上位のカテゴリは `Color` / `FontWeight` / `FontFamily` / `FontSize` / `LineHeight` / `BorderRadius` / `Elevation`。
  `Color` は `Primitive` / `Neutral`(`White` / `Black` / `SolidGray` / `OpacityGray`)/ `Semantic`(`Success` / `Error` / `Warning`)/ `Key`。

| カテゴリ | `$value` の実際の型 | 例 |
|---|---|---|
| Color(Primitive / Neutral / Key) | 16進の色コード文字列 | `Color.Primitive.Blue["500"]` → `"#4979f5"` |
| Color(Semantic) | 解決済みの色コード文字列(参照元は `original.$value` に残る) | `Color.Semantic.Success["1"]` → `"#259d63"`(元は `{Color.Primitive.Green.600}`) |
| FontSize | rem 付き文字列 | `FontSize["16"]` → `"1rem"`(14〜64 の15段階) |
| FontWeight | **数値ではなく文字列** | `FontWeight["400"]` → `"400"`(400 / 700 のみ) |
| LineHeight | 数値 | `LineHeight["150"]` → `1.5`(1〜1.75 の8段階) |
| BorderRadius | rem 付き文字列 | `BorderRadius["16"]` → `"1rem"`、`Full` → `"624.9375rem"` |
| Elevation | box-shadow の文字列 | `Elevation["1"]` → `"0 2px 8px 1px rgba(0,0,0,0.1), 0 1px 5px 0 rgba(0,0,0,0.3)"` |
| FontFamily | CSS のフォント指定文字列 | `FontFamily.Sans` → `"'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif"` |

- `FontFamily.Sans` は先頭が Noto Sans JP で、端末搭載書体への代替指定を含む。書体の読み込み中に
  代替書体で本文を表示する方針(FR-014 / research #3)と整合するため、そのまま利用する。

## 2. トークンのカテゴリと不足分の扱い

公式トークンに含まれるカテゴリ(実測):

| カテゴリ | 例 | 備考 |
|---|---|---|
| 色 | `--color-primitive-blue-500: #4979f5`、`--color-semantic-success-1`、`--color-neutral-white` | primitive と semantic の2層構造 |
| タイポグラフィ | `--font-size-16: 1rem`、`--font-weight-700`、`--line-height-150` | 個別プロパティのみ。テキストスタイルとしての合成物は含まれない |
| elevation | `--elevation-1` 〜 `--elevation-8` | 影の段階 |
| 角丸 | `--border-radius-4`、`--border-radius-16`、`--border-radius-full` | |
| 余白(spacing) | **存在しない** | |

- **Decision**: 余白トークンは本プロジェクトで定義する。基準単位 8px、段階は
  4 / 8 / 16 / 24 / 32 / 48 px の6段階とする(デジタル庁デザインシステムのレイアウト指針である
  「基準 8 CSS px」「3〜5段階程度のスケール」に沿わせ、実装で必要な最小限に留める)。
- **Rationale**: 公式トークンに余白が無いため踏襲対象が存在しない。指針(基準8px)にだけ従い、
  値は自前定義とする。UIライブラリ側の既定の余白単位も8pxのため、追加の変換が不要になる。
- **Alternatives considered**:
  - 4px基準の細かいスケール: 段階が増えて判断が揺れやすく、指針の「3〜5段階」から外れるため却下。
  - 余白を各コンポーネント任せにする: FR-007(一貫した尺度)に反するため却下。

- **Decision**: テキストスタイル(見出し/本文/補足)は、公式のタイポグラフィ個別トークンを
  組み合わせてテーマ側で合成する。命名はデジタル庁デザインシステムの体系(`Std-16N-175` =
  区分-サイズ-太さ-行高)に対応づけて管理する。
- **Rationale**: 公式CSSは個別プロパティのみを配布しており、合成済みテキストスタイルは
  ドキュメント側の定義。したがって合成は利用側の責務になる。
- **判明しているドキュメント側の規定**: 本文は 16 CSS px 以上・行高は少なくとも1.5倍、
  見出しは本文より行高を狭める、字間はサイズに応じて 0 / 0.01em / 0.02em。
  区分は Display(視覚的インパクト)、Standard(見出し・本文の中核)、Dense(情報密度優先)、
  Oneline(UI要素、行高100%)、Mono(コード)。

## 3. 書体(FR-014)の配信方法

- **Decision**: Noto Sans JP(SIL Open Font License 1.1)を自ホストで配信する。ウェイトは
  400(Normal)と700(Bold)に限定し、日本語・ラテンのサブセットのみを読み込む。
  `font-display: swap` により、読み込み完了前も代替書体で本文を判読できる状態を保つ。
- **Rationale**: 公式が推奨する書体であり原則Xの踏襲に必要。自ホストにすることで外部への
  リクエストが発生せず、PWAとして自己完結する。ウェイトとサブセットを絞ることで
  日本語書体の容量問題を実用範囲に抑えられる。
- **Alternatives considered**:
  - 外部CDN(Google Fonts)から読み込む: 導入は最も簡単だが、外部依存とオフライン時の欠落が生じるため却下。
  - 端末搭載書体で代替: 容量0だがOSごとに字面が変わり踏襲にならないため却下(spec の決定事項で確定済み)。
  - 等幅書体(Noto Sans Mono)の導入: 本アプリにコード表示は無いため今回は導入しない。
- **Risk / 対処**: service worker の事前キャッシュ対象に書体を全量含めると容量上限に触れる可能性がある。
  書体は事前キャッシュから除外し、実行時キャッシュに委ねる方針とする(タスク化して検証する)。

### 実装時の変更(T002〜T004、2026-09-19)

- **配信手段を変更**: 当初は「フォントファイルを `public/fonts/` に手で配置し、`@font-face` を自作する」計画だったが、
  日本語書体を自前でサブセット化するにはツール(pyftsubset 等)が必要になるため、
  **`@fontsource/noto-sans-jp`(v5.3.0、OFL-1.1)を依存に追加**し、その CSS を `src/app/theme/fonts.css` から読み込む方式にした。
  書体ファイルはビルド時にアプリと一緒に出力されるため、外部CDNへのリクエストは発生せず「自ホスト」の決定は維持される。
- **サブセットの選び方を変更**: 当初は「日本語・ラテンのサブセットのみ」としていたが、fontsource のサブセット別 CSS
  (`japanese-400.css`)は**約1MBの単一ファイルで unicode-range による分割が無い**ことを確認した。
  最初に日本語を1文字描画した時点で全体をダウンロードしてしまうため採らない。代わりに `400.css` / `700.css` を使う。
  こちらは日本語が unicode-range で約120個(1個あたり約10〜45KB)に分割されており、ブラウザは画面で実際に使う文字を
  含む断片だけを取得する。キリル文字等の `@font-face` 宣言も含まれるが、該当文字を使わない限り取得されないため実行時のコストはない。
- **ライセンス**: OFL の全文を `apps/client/public/licenses/noto-sans-jp-OFL.txt` に同梱し、配布物に含める(#7)。
- **検証結果(T004)**: 一時的に書体を読み込んだ状態でビルドし、書体ファイル496個が出力される一方、
  service worker の事前キャッシュ一覧に含まれる woff/woff2 は0件、実行時キャッシュ `fonts`(CacheFirst)が
  組み込まれていることを確認した。`globIgnores` は既定の対象パターンが将来広げられても書体を事前キャッシュしないための明示的な歯止めである。

## 4. トークン以外の生値を禁止する仕組み(FR-003 / SC-005)

- **Decision**: Lint ルールで、クライアントのコンポーネント内における色コード(`#rgb`/`#rrggbb` 形式)と
  `px` 付き寸法リテラル、およびスタイル定義の寸法系プロパティへの数値リテラル(`maxWidth: 640` など。
  実コードの生値はこの形だった)の直接記述を禁止する。既存のルート ESLint 設定に規則を追加し、
  CI の lint ステップで検出する。テーマ定義ファイル自身と、テスト・ストーリー内の
  検証用の値は対象から除外する。
- **運用(2026-09-19 改訂)**: ルールは最初から **error** で導入し、違反が解消されるまで
  同じフェーズ内でリファクタする(warn で導入して後から引き上げる2段階方式は採らない)。
  既存の warn レベルのルール(`react-refresh/only-export-components`)も error に引き上げる。
  憲法 v1.2.0 の技術スタック「静的解析」に従う。
- **Rationale**: SC-005 を `[自動]` として検証できる手段が必要。既存CIに lint が組み込まれているため、
  新しい仕組みを追加せずに済む。
- **Alternatives considered**:
  - テストコードで grep する: 実装は容易だが除外指定の管理が煩雑で、エディタ上で即時に気づけないため却下。
  - レビューでの目視のみ: 「後で対応する」を認めない原則Iの姿勢と整合しないため却下。

## 5. 視覚的な回帰検証の方針

- **Decision**: スクリーンショット比較による視覚回帰検証サービスは導入しない。
  既存の Storybook のアクセシビリティ検査(コントラスト比を含む)を CI で維持し、
  見た目の最終確認は開発者本人の目視(`[手動]`)で行う。
- **Rationale**: 過去に視覚回帰SaaSの導入を検討したが、個人利用のアカウントと業務のアカウントが
  混ざるリスクを理由に見送る判断をしている。その判断を維持する。
- **Alternatives considered**: 画像比較をローカルで完結させる方式もあるが、
  個人利用・単独開発の規模では維持コストが便益を上回るため却下。

## 6. 画面幅375pxでの検証(FR-011 / SC-008)

- **Decision**: 実サーバー+クライアントを起動し、ブラウザ自動操作で各画面を幅375pxで開いて
  横スクロールが発生しないことを確認する手順を quickstart に記載する。
- **Rationale**: 既存フェーズでも同じ方式(ブラウザ自動操作による通し確認)で受け入れ確認を行っており、
  追加の依存を増やさずに済む。

## 7. ライセンスと帰属表示(FR-017)

- **Decision**: 以下を満たす。
  - トークンパッケージ(MIT): 依存として導入し、ライセンス表記を保持する。
  - Noto Sans JP(SIL OFL 1.1): 自ホストするフォントファイルと同梱でライセンス全文・著作権表示を配置する。
  - 参照元の明示: リポジトリの README にデジタル庁デザインシステムを参照元として明記する。
- **Rationale**: それぞれのライセンスが要求する表示義務を満たすため。
- **未確認事項**: デジタル庁デザインシステムのドキュメント本体およびデザインデータ(Figma)の
  利用条件は、実装前に一次情報で最終確認する。トークン(MIT)とフォント(OFL)の条件とは別に
  定められている可能性があるため、確認結果に応じて README の表記を調整する。

## 8. クライアントのAPI依存の注入(US5 / FR-019〜FR-021)

**現状(調査結果)**: 4画面(`WeightPage` / `TrainingPage` / `StepsPage` / `FoodsPage`)すべてが
`apps/client/src/app/queryClient.ts` のモジュールレベルのシングルトン `graphqlClient` を直接 import し、
モジュール読み込み時に `getSdk(graphqlClient)` を生成している。画面の中にクエリ・ミューテーション・
キャッシュ無効化と表示が混在しており、フェイクを差し込めないため画面のテストは0本。

- **Decision**:
  - 依存の型は、GraphQL Code Generator が生成する `getSdk` の戻り値の型(`ApiClient`)とする。
    新たなインターフェースを手書きせず、スキーマ由来の型を一次ソースに保つ(原則IV)。
  - 実体(GraphQLClient・SDK・QueryClient)はアプリの最上位(composition root)で生成し、
    React の Provider(`ApiProvider`)と `QueryClientProvider` で注入する。利用側は `useApi()` で受け取る。
  - データの取得・更新はfeatureごとのフック(例: `useWeightRecords`)に集約し、クエリキーと
    キャッシュ無効化もフック側に置く。画面はフックと表示部品を組み合わせるだけにする。
  - テスト用に、未指定のメソッドは呼ばれた時点で失敗する `createFakeApiClient(上書き)` を用意する
    (意図しないAPI呼び出しをテストで検出するため)。
  - 画面のテストは既存の方針どおり Storybook Interaction Test で書く(001 research #6 で
    React Testing Library を追加しない判断をしているため)。ストーリーごとに新しい QueryClient
    (再試行なし)とフェイクの ApiClient を注入するデコレーターを用意する。
  - 画面・表示部品からの `graphql-request` および API クライアント生成関数の直接 import は
    Lint(`no-restricted-imports`、error)で禁止し、SC-014 を自動で検出する。
- **Rationale**: 原則V(v1.2.0)の「依存の注入」「役割の分離」「フェイク注入による検証」を満たす。
  Provider による注入は TanStack Query 自体と同じ流儀で、画面ごとに依存を配線する必要がない。
- **Alternatives considered**:
  - モジュールのモック(`vi.mock`)で差し替える: テストが import パスに結合し、役割の分離も進まないため却下。
  - 画面の props で SDK を受け渡す: App が各画面の依存を知る必要があり、深い受け渡しになるため却下。
  - Mock Service Worker でネットワーク層をモックする: 依存が増え、テストの粒度も重くなるため今回は見送り。

## 9. サーバーの起動処理の分離(FR-022)

**現状(調査結果)**: リポジトリと当日の日付は GraphQL の context 経由で注入済みで、リゾルバの
テストはフェイク(インメモリDB)を注入して行えている。ただし DB 接続の生成・シード・context の組み立て・
待ち受けが `apps/server/src/index.ts` に直書きされ、当日の日付もシステムクロックを直接呼んでいるため、
HTTP 層(GraphQL Yoga の context 組み立てを含む)を通したテストが書けない。

- **Decision**: `apps/server/src/app.ts` に `createApp({ db, today })` を切り出し、
  リポジトリの生成と context の組み立てを行って GraphQL Yoga のインスタンスを返す。
  `index.ts` は実DBの接続・シード・`createApp` の呼び出し・待ち受けだけを行う薄い起点にする。
  テストでは `createConnection(":memory:")` と固定の日付を注入し、Yoga の `fetch` で
  HTTP 経由の記録の作成・取得を検証する。
- **Rationale**: 原則V の composition root を明示し、context の組み立て(配線の誤り)まで
  テストで検出できるようにする。スキーマ・リゾルバ・リポジトリの実装は変更しない(FR-013)。
- **Alternatives considered**: 実際にポートを開いて HTTP クライアントから叩く方式は、
  ポート競合と起動待ちが発生するため却下(Yoga の `fetch` で同等の経路を通せる)。

## 10. アクセシビリティ(カラーコントラスト)の基準値(FR-018 / SC-013)

- **Decision**: テーマを差し替える前に、現行テーマ(MUI 既定)における主要な文字色・背景色の
  組み合わせ(本文/背景、補足/背景、主ボタンの文字/主色、リンク/背景、エラー文字/背景、
  表の見出し/背景)のコントラスト比を WCAG の相対輝度の式で算出し、基準値として記録する。
  新テーマの同じ組み合わせが基準値以上かつ WCAG AA 以上であることを、テーマの単体テストで
  自動検証する。公式トークンで満たせない場合は別の公式トークンを選び、それでも満たせない場合は
  従来の値を維持して逸脱をここに追記する(憲法 原則X「アクセシビリティの優先」)。
- **Rationale**: axe の検査は「AA を満たすか」の合否しか見ないため、「現状より劣化していないか」は
  別途計測しないと保証できない。数式での算出は描画を伴わず決定的に検証できる。
- **Alternatives considered**: 画面描画後にブラウザで計測する方式は、描画環境で値がぶれうるうえ
  重いため却下。

## 出典

- [デザイントークン(GitHub / npm `@digital-go-jp/design-tokens`)](https://github.com/digital-go-jp/design-tokens)
- [タイポグラフィ(概要)](https://design.digital.go.jp/dads/foundations/typography/)
- [カラー(概要)](https://design.digital.go.jp/dads/foundations/color/)
- [レイアウト(概要)](https://design.digital.go.jp/dads/foundations/layout/)
- [余白(概要)](https://design.digital.go.jp/foundations/spacing/)
