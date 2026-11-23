import { describe, expect, it } from "vitest";
// T011 で実装する(このテストは実装が無い間は失敗する)。
// 契約: contracts/database-access.md 規則6(接続情報の読み取りは入口のみ)
import { readDatabaseUrl } from "./databaseUrl.js";

// 接続そのものは行わず、環境変数の読み取りと検証だけを純粋関数として切り出す(原則V)。
describe("readDatabaseUrl", () => {
  it("接続文字列が設定されていればそのまま返す", () => {
    const url = "postgresql://user:password@host/dbname?sslmode=require";

    expect(readDatabaseUrl({ DATABASE_URL: url })).toBe(url);
  });

  it("未設定なら環境変数名を含むエラーになる", () => {
    expect(() => readDatabaseUrl({})).toThrow(/DATABASE_URL/);
  });

  it("空文字・空白だけなら環境変数名を含むエラーになる", () => {
    expect(() => readDatabaseUrl({ DATABASE_URL: "" })).toThrow(/DATABASE_URL/);
    expect(() => readDatabaseUrl({ DATABASE_URL: "   " })).toThrow(/DATABASE_URL/);
  });

  // 設定ミス(別のDBの接続文字列を貼る等)を起動時に気づけるようにする。
  it("postgres 以外のスキームなら理由の分かるエラーになる", () => {
    expect(() => readDatabaseUrl({ DATABASE_URL: "mysql://user@host/db" })).toThrow(/postgres/i);
  });

  it("URL として解釈できない値なら理由の分かるエラーになる", () => {
    expect(() => readDatabaseUrl({ DATABASE_URL: "これは接続文字列ではありません" })).toThrow(
      /DATABASE_URL/,
    );
  });
});
