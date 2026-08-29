import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export interface EmptyStateProps {
  message: string;
  // 記録の作成へ導く説明文(FR-023)。参照専用画面(食材一覧など)のように
  // 作成導線が存在しない場合は省略できる。
  description?: string;
}

const Root = styled(Stack)(({ theme }) => ({
  alignItems: "center",
  textAlign: "center",
  padding: theme.spacing(4),
}));

// 記録が0件の画面は、記録がないことを分かりやすく示し、記録の作成へ
// 導く表示をする(FR-023)。各ページの個別実装(WeightEmptyState等)を
// 置き換える共通コンポーネント。
export const EmptyState = ({ message, description }: EmptyStateProps) => {
  let descriptionText;
  if (description) {
    descriptionText = (
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    );
  } else {
    descriptionText = null;
  }

  return (
    <Root spacing={1}>
      <Typography variant="body1">{message}</Typography>
      {descriptionText}
    </Root>
  );
};
