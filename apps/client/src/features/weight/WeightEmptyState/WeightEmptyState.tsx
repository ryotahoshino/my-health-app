import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

const Root = styled(Stack)(({ theme }) => ({
  alignItems: "center",
  textAlign: "center",
  padding: theme.spacing(4),
}));

// 記録が0件の画面は、記録がないことを分かりやすく示し、記録の作成へ
// 導く表示をする(FR-023)。フォームは同じページ上部に常に表示されるため、
// ここではフォームへの案内テキストのみで足りる(WeightPage参照)。
export const WeightEmptyState = () => (
  <Root spacing={1}>
    <Typography variant="body1">体重の記録はまだありません</Typography>
    <Typography variant="body2" color="text.secondary">
      上のフォームから最初の記録を追加しましょう
    </Typography>
  </Root>
);
