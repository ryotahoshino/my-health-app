import type { ReactNode } from "react";
import { Typography } from "@mui/material";

export interface QueryStateProps {
  isLoading: boolean;
  isEmpty: boolean;
  emptyState: ReactNode;
  children: ReactNode;
}

// 各featureページ(体重・トレーニング・歩数・食材)で個別に重複していた
// 「読み込み中→0件→本体表示」の3分岐を1箇所に集約する(FR-023)。
export const QueryState = ({ isLoading, isEmpty, emptyState, children }: QueryStateProps) => {
  if (isLoading) {
    return <Typography>読み込み中...</Typography>;
  }
  if (isEmpty) {
    return <>{emptyState}</>;
  }
  return <>{children}</>;
};
