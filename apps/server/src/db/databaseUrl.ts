// 接続情報の読み取りと検証。接続そのものは行わない純粋関数にして、
// 起動時に設定ミスを即座に検知できるようにする(FR-013 / 原則V・VIII)。

const ENV_NAME = "DATABASE_URL";

const POSTGRES_PROTOCOLS = ["postgres:", "postgresql:"];

/**
 * 環境変数から接続文字列を取り出す。未設定・不正な場合は、何を設定すべきかが
 * 分かるメッセージで例外を投げる。
 */
export const readDatabaseUrl = (env: Record<string, string | undefined>): string => {
  const value = env[ENV_NAME];
  if (!value || value.trim() === "") {
    throw new Error(
      `環境変数 ${ENV_NAME} が設定されていません。apps/server/.env.local に Postgres の接続文字列を設定してください`,
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `環境変数 ${ENV_NAME} の値を接続文字列として解釈できません。postgresql://ユーザー:パスワード@ホスト/データベース の形式で設定してください`,
    );
  }

  if (!POSTGRES_PROTOCOLS.includes(parsed.protocol)) {
    throw new Error(
      `環境変数 ${ENV_NAME} が postgres の接続文字列ではありません(指定されたスキーム: ${parsed.protocol})`,
    );
  }

  return value;
};
