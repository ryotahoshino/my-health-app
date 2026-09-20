import { QueryClient } from "@tanstack/react-query";

// import しただけで実体ができるシングルトンは置かない。生成は composition root
// (App.tsx)が1度だけ行い、Provider で注入する(contracts/api-injection.md 規則2)。
export const createQueryClient = (): QueryClient => new QueryClient();

// GraphQL の通信先。ビルド時の環境変数で差し替えられるようにしておく。
export const graphqlEndpoint =
  import.meta.env.VITE_GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";
