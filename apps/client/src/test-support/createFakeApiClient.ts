import type { ApiClient } from "../app/api";

// テスト・ストーリー用の ApiClient。指定したメソッドだけを差し替え、それ以外は
// 呼ばれた時点でエラーにする。undefined を返して黙って通すと、画面が意図しない API を
// 呼んでいることに気づけないため(contracts/api-injection.md「フェイク」)。
export const createFakeApiClient = (overrides: Partial<ApiClient> = {}): ApiClient => {
  return new Proxy(overrides, {
    get: (target, property) => {
      const method = target[property as keyof ApiClient];
      if (method) {
        return method;
      }
      return () => {
        throw new Error(
          `フェイクの ApiClient に ${String(property)} は用意されていません。ストーリーで上書きしてください`,
        );
      };
    },
  }) as ApiClient;
};
