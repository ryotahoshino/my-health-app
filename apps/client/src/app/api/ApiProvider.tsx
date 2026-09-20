import type { ReactNode } from "react";
import { ApiContext } from "./apiContext";
import type { ApiClient } from "./apiClient";

export type ApiProviderProps = {
  client: ApiClient;
  children: ReactNode;
};

// 実体は受け取るだけで生成しない。テストやストーリーはフェイクを渡す。
export const ApiProvider = ({ client, children }: ApiProviderProps) => {
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
};
