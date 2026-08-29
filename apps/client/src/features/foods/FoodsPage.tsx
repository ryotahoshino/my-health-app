import { useQuery } from "@tanstack/react-query";
import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { graphqlClient } from "../../app/queryClient";
import { getSdk } from "../../graphql/generated/sdk";
import { FoodList } from "./FoodList";
import { EmptyState } from "../../components/EmptyState";

const sdk = getSdk(graphqlClient);
const foodItemsQueryKey = ["foodItems"];

const Root = styled(Stack)({
  maxWidth: 640,
});

// 参照専用の一覧のため、記録・編集用のフォームやミューテーションは持たない(FR-015)。
export const FoodsPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: foodItemsQueryKey,
    queryFn: () => sdk.FoodItems(),
  });

  const foods = data?.foodItems ?? [];

  let content;
  if (isLoading) {
    content = <Typography>読み込み中...</Typography>;
  } else if (foods.length === 0) {
    // 参照専用データのため作成導線は無く、メッセージのみ表示する。
    content = <EmptyState message="食材データがありません" />;
  } else {
    content = <FoodList foods={foods} />;
  }

  return (
    <Root spacing={4}>
      <Typography variant="h5" component="h1">
        食材一覧
      </Typography>
      {content}
    </Root>
  );
};
