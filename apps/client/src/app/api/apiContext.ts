import { createContext, useContext } from "react";
import { resolveApiClient, type ApiClient } from "./apiClient";

// Provider が無い状態を undefined で表し、useApi() で明示的なエラーに変える。
export const ApiContext = createContext<ApiClient | undefined>(undefined);

// データフックはこのフックだけで ApiClient を受け取る(contracts/api-injection.md 規則3)。
export const useApi = (): ApiClient => resolveApiClient(useContext(ApiContext));
