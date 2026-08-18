# Research: 体重・トレーニング記録と消費カロリーの可視化

**Input**: [spec.md](./spec.md) の Technical Context 由来の未確定事項、および憲法([constitution.md](../../.specify/memory/constitution.md))の技術スタック制約

このドキュメントは、リポジトリが未着手(package.json も src/ も存在しない)状態からアプリ全体のアーキテクチャを立ち上げるにあたって決定した技術的事項をまとめる。

## 1. モノレポ構成とパッケージ管理

- **Decision**: Yarn Berry(4系、Corepack管理)のworkspacesを用いたモノレポとし、`apps/client`(React + Vite)と `apps/server`(Node + GraphQL Yoga + Pothos)の2ワークスペースに分割する。`nodeLinker: node-modules`を明示し、`better-sqlite3`のようなネイティブモジュールやStorybook/Playwrightとの互換性を優先する(既定のPlug'n'Playは避ける)。パッケージマネージャーのバージョンは`package.json`の`packageManager`フィールドで固定し、Node 22に同梱されるCorepack経由で解決する。
- **Rationale**: 実装着手時にnpm workspacesから開始したが、依存関係のセキュリティ(lockfileの整合性チェック、lifecycleスクリプトの扱いなど)を理由にYarnへ切り替えた。フロントエンドとサーバーは実行環境・ビルド設定が異なるため、モノレポでも単一パッケージには同居させない方針は変わらない。
- **既知の注意点**: `better-sqlite3`は同梱のプリビルドバイナリ(`prebuilds/`配下)をそのまま使う設計だが、Yarnは`binding.gyp`の存在だけで「要ビルド」と機械的に判定し、node-gyp経由の再ビルド(Python等の追加ツールが必要)を試みてしまう。ルートの`package.json`に`dependenciesMeta.better-sqlite3.built: false`を設定してこれを無効化している。
- **Alternatives considered**:
  - npm workspaces: 標準機能で完結し当初採用していたが、ユーザーの意向でYarnへ移行。
  - 単一パッケージ(client/server混在): Vite と Node サーバーのビルド設定が衝突しやすく却下。
  - pnpm workspaces: 機能的には優れるが、個人開発でここまでの規模には過剰。
  - Yarn Plug'n'Play(既定のnodeLinker): 依存解決は厳密・高速だが、ネイティブモジュールやPlaywright/Storybookとの相性問題が知られており、互換性を優先してnode-modulesリンカーを選択。

## 2. 永続化の初期実装

- **Decision**: SQLite(`better-sqlite3`)をサーバー内に埋め込み、リポジトリインターフェース(例: `WeightRepository`, `TrainingSessionRepository`, `StepRecordRepository`)の背後に置く。スキーマ作成は起動時に実行する冪等な `CREATE TABLE IF NOT EXISTS` 文で行い、ORM・マイグレーションフレームワークは導入しない。
- **Rationale**: 単一ユーザー・単一環境という前提(憲法・spec の決定済み方針)に対し、ファイル1つで完結し追加インフラ不要な SQLite が最も簡潔。週次・月次集計(FR-016)には日付範囲によるクエリが必要になるため、JSONファイルより SQL のほうが素直に書ける。憲法の原則VI(データ層は差し替え可能にする)を満たすため、GraphQL リゾルバは具体的な SQLite 実装ではなくリポジトリインターフェースにのみ依存させる。
- **Alternatives considered**:
  - JSONファイル直書き: 依存が増えないが、期間集計のたびに全件読み込み・フィルタするコードをドメイン層に書く必要があり、原則V(外部I/Oは端に寄せる)を保ちながら書くと結局リポジトリ層で同等の複雑さになる。将来サーバー同期に差し替える際の移行コストも SQLite と大差ない。
  - Prisma + SQLite: スキーマ管理・マイグレーションが強力だが、6エンティティ程度の規模には過剰で、コード生成ステップが増える。

## 3. GraphQLスキーマとクライアント型生成の連携

- **Decision**: サーバー(Pothos)で構築した `GraphQLSchema` を、ビルド前スクリプトで `printSchema()` により `apps/server/schema.graphql`(SDL)として書き出す。クライアントの GraphQL Code Generator はこの静的SDLファイルを入力とし、サーバー起動なしに型・フック・ドキュメントを生成する。
- **Rationale**: 憲法原則IV「スキーマの一次ソースを一つにする」を満たしつつ、codegen 実行のためだけにサーバープロセスを起動する必要をなくし、CI・ローカルの両方で再現性を確保する。SDLファイルはあくまで Pothos の一次定義から機械的に導出される副産物であり、手で編集しない(`.gitignore` 対象または生成物として明示)。
- **Alternatives considered**:
  - ライブサーバーへの introspection: 開発時にサーバー常時起動が前提になり手順が煩雑。
  - GraphQL SDL を手書きして一次ソースにする: 憲法原則IVに反する(SDLとcode-firstの二重管理)ため却下。

## 4. バリデーションの共有

- **Decision**: サーバー側は Pothos の `@pothos/plugin-zod` を用いて入力型に Zod スキーマを直接紐づける。クライアント側は同じ制約(範囲・必須・書式)を表現する Zod スキーマを `apps/client` 内に個別定義し、react-hook-form の `zodResolver` に接続する。将来的に制約が乖離しないよう、range/required 等の定数(体重範囲・実施時間範囲等、Assumptions節の値)は `apps/client` と `apps/server` の双方から参照できる位置には置かず、まずは各層で明示的に重複定義し、値のズレをテスト(契約テスト)で検知する。
- **Rationale**: モノレポではあるが、client と server は独立してデプロイされうる想定(憲法原則VI)のため、実行時の共有パッケージ依存を増やすより、テストで整合性を担保する方がシンプル。
- **Alternatives considered**:
  - `packages/shared` に Zod スキーマを切り出し両者から import: DRY にはなるが、現時点でエンティティ6種・制約値数個の規模では過剰設計(YAGNI)。制約が増えてきた段階で切り出しを検討する。

## 5. 消費カロリー算出式と定数(METs方式)

- **Decision**:
  - 基本式: `消費カロリー(kcal) = METs × 体重(kg) × 実施時間(h)`
  - トレーニングセッションの強度区分ごとの METs: 低強度 = 3.0、中強度 = 5.0、高強度 = 8.0(仮の初期値。種目マスタの種目別METsとは独立して、セッション全体の目安として使用)
  - 歩行: METs = 3.0、ケイデンス = 100歩/分(実施時間 = 歩数 ÷ ケイデンス ÷ 60)
  - 出典: 国立健康・栄養研究所「改訂版 身体活動のメッツ(METs)表」を一次情報源として画面に明記する。
- **Rationale**: spec の FR-008・FR-009・FR-013、および憲法原則VII(算出値は計算式と仮定した定数を画面上で確認できるようにする)を満たすには、実装時に使う具体的な式・定数・出典が必要。計算式はMETs方式の標準形であり、追加の体重補正係数(×1.05等)を持ち込むと「仮定した定数」が増え説明責任も増えるため、最も単純な式を採用する。
- **Alternatives considered**:
  - 種目マスタの種目別METs値をセッション全体の消費カロリー計算にも用いる: 種目ごとに実施時間比率を按分する必要が生じ複雑化するため、v1ではセッション単位の強度区分による簡易計算とし、種目別METsは種目選択時の参考表示・将来拡張用の保持に留める(spec の Key Entities どおり)。
  - 補正係数(例: ×1.05)を追加: 精度は上がるが「仮定した定数」が増え、原則VIIの趣旨(仮定を明示し利用者に判断を委ねる)に対してかえって不透明になるため見送り。

## 6. テスト戦略

- **Decision**: ドメインロジック(消費カロリー算出、総ボリューム算出、期間集計)は純粋関数として実装し vitest で単体テストする。GraphQLリゾルバ・リポジトリはリポジトリ実装をインメモリ版に差し替えて vitest で統合テストする(原則V: 依存を注入して検証)。UIコンポーネントの受け入れ条件(`[自動]`)は Storybook Interaction Test + a11y アドオンで検証し、キーボード操作やスクリーンリーダー確認など `[手動]` はブラウザでの手動確認とする。
- **Rationale**: 憲法原則III(テスト先行)・原則V に合致し、Storybook の a11y アドオンにより原則I(アクセシビリティ)の自動チェックも同じ枠組みで回せる。
- **Alternatives considered**: React Testing Library を別途追加する案もあったが、Storybook Interaction Test が内部的に testing-library ベースのクエリ・アサーションを提供するため、追加依存としては導入せず様子を見る。

## 7. PWA対応の扱い

- **Decision**: 本機能では `vite-plugin-pwa` を用いた最小限のインストーラビリティ(manifest・基本的な service worker 登録)のみを整備し、オフラインでのデータ編集・同期は範囲外とする。
- **Rationale**: 憲法の技術スタックに「PWA対応」が明記されているため土台は本機能(アプリ全体のアーキテクチャを確立する回)で用意するが、spec のスコープ外(端末間データ同期は別spec)と矛盾しないよう、オフライン書き込みなどの高度な機能には踏み込まない。
- **Alternatives considered**: PWA対応を丸ごと別specに切り出す案もあったが、Vite プロジェクトの初期セットアップ時に土台を用意する方が手戻りが少ないため本specに含めた。

## 未解決事項

なし(Technical Context の NEEDS CLARIFICATION はすべて上記で解消)。
