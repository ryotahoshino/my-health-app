import type { ReactNode } from "react";
import { CircularProgress, Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export type QueryStateProps = {
  isLoading: boolean;
  isEmpty: boolean;
  emptyState: ReactNode;
  children: ReactNode;
};

// 読み込み中も進捗の表示と本文のテキストスタイル・トークンの余白で描画し、
// 1行だけの平坦な表示にしない(US1 受け入れシナリオ3)。
const LoadingRoot = styled(Stack)(({ theme }) => ({
  alignItems: "center",
  paddingBlock: theme.spacing(4),
}));

// 各featureページ(体重・トレーニング・歩数・食材)で個別に重複していた
// 「読み込み中→0件→本体表示」の3分岐を1箇所に集約する(FR-023)。
export const QueryState = ({ isLoading, isEmpty, emptyState, children }: QueryStateProps) => {
  if (isLoading) {
    return (
      // role="status" で読み込み中であることを支援技術にも伝える(憲法 原則I)。
      // 進捗の輪は装飾で、状態は文字で伝える。
      <LoadingRoot spacing={2} role="status">
        <CircularProgress aria-hidden />
        <Typography variant="body1">読み込み中...</Typography>
      </LoadingRoot>
    );
  }
  if (isEmpty) {
    return <>{emptyState}</>;
  }
  return <>{children}</>;
};
