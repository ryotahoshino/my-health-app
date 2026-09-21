import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Decorator } from "@storybook/react-vite";
import { ApiProvider, type ApiClient } from "../app/api";

// ストーリー用のデコレーター。ストーリーごとに新しい QueryClient を作り、
// キャッシュを共有しない。再試行を無効にするのは、取得失敗の検証で
// 既定の指数バックオフ(3回再試行)を待たずに結果を確かめるため。
export const withApiProviders = (client: ApiClient): Decorator => {
  const Wrapper: Decorator = (Story) => {
    // 再描画のたびに作り直すとキャッシュが消えてしまうため、初回だけ生成する。
    const [queryClient] = useState(
      () =>
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        }),
    );

    return (
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={client}>
          <Story />
        </ApiProvider>
      </QueryClientProvider>
    );
  };
  return Wrapper;
};
