import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useFoodItems } from "../hooks";
import { FoodList } from "../FoodList";
import { EmptyState } from "../../../components/EmptyState";
import { QueryState } from "../../../components/QueryState";

const Root = styled(Stack)(({ theme }) => ({
  maxWidth: theme.layout.contentWide,
}));

// 参照専用の一覧のため、記録・編集用のフォームやミューテーションは持たない(FR-015)。
export const FoodsPage = () => {
  const { data, isLoading } = useFoodItems();

  const foods = data?.foodItems ?? [];

  return (
    <Root spacing={4}>
      <Typography variant="h5" component="h1">
        食材一覧
      </Typography>
      <QueryState
        isLoading={isLoading}
        isEmpty={foods.length === 0}
        // 参照専用データのため作成導線は無く、メッセージのみ表示する。
        emptyState={<EmptyState message="食材データがありません" />}
      >
        <FoodList foods={foods} />
      </QueryState>
    </Root>
  );
};
