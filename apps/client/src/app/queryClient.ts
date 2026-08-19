import { QueryClient } from "@tanstack/react-query";
import { GraphQLClient } from "graphql-request";

export const queryClient = new QueryClient();

const endpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";
export const graphqlClient = new GraphQLClient(endpoint);
