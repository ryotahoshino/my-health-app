import { GraphQLClient } from "graphql-request";
import { getSdk, type Sdk } from "../../graphql/generated/sdk";

// ApiClient は生成SDKの戻り値の型そのものを使う。手書きのインターフェースを別に置くと
// スキーマ変更との差分を型チェックで検知できなくなる(憲法 原則IV / contracts/api-injection.md「型」)。
export type ApiClient = Sdk;

// 実体の生成は composition root(app/App.tsx)だけが呼ぶ。モジュールレベルで
// 生成したシングルトンを置かないため、import しただけでは通信先が決まらない(規則2)。
export const createApiClient = (endpoint: string): ApiClient => getSdk(new GraphQLClient(endpoint));

// Provider の外で使われた場合に、undefined をそのまま流さずここで止める。
// 注入忘れは「実際に API を呼ぶまで気づけない」不具合になりやすいため(規則3)。
export const resolveApiClient = (client: ApiClient | undefined): ApiClient => {
  if (!client) {
    throw new Error(
      "ApiClient が注入されていません。ApiProvider の内側で useApi() を呼び出してください",
    );
  }
  return client;
};
