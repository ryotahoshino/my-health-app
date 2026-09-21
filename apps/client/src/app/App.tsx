import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { BrowserRouter } from "react-router";
import { createQueryClient, graphqlEndpoint } from "./queryClient";
import { ApiProvider, createApiClient } from "./api";
import { AppRoutes } from "./AppRoutes";
import { theme } from "./theme";

// composition root: 実体(ApiClient・QueryClient)を生成し、Provider で注入する
// 唯一の場所(contracts/api-injection.md)。useState の遅延初期化にしているのは、
// 再描画のたびに作り直してキャッシュや通信設定を失わないようにするため。
export const App = () => {
  const [queryClient] = useState(createQueryClient);
  const [apiClient] = useState(() => createApiClient(graphqlEndpoint));

  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={apiClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ThemeProvider>
      </ApiProvider>
    </QueryClientProvider>
  );
};
