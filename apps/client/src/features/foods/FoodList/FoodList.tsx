import { Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";

export type FoodItem = {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinG: number;
  fatG: number;
  carbG: number;
};

export type FoodListProps = {
  foods: FoodItem[];
};

// 食材名を行見出し(th scope="row")、カロリー・PFCを列見出し(th scope="col")
// として表構造で対応付け、スクリーンリーダーでも名称と値の対応が正しく
// 伝わるようにする(FR-015、Acceptance Scenario #2、憲法 原則I)。
export const FoodList = ({ foods }: FoodListProps) => {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell component="th" scope="col">
            食材名
          </TableCell>
          <TableCell component="th" scope="col">
            カロリー(kcal/100g)
          </TableCell>
          <TableCell component="th" scope="col">
            タンパク質(g)
          </TableCell>
          <TableCell component="th" scope="col">
            脂質(g)
          </TableCell>
          <TableCell component="th" scope="col">
            炭水化物(g)
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {foods.map((food) => (
          <TableRow key={food.id}>
            <TableCell component="th" scope="row">
              {food.name}
            </TableCell>
            <TableCell>{food.caloriesPer100g}</TableCell>
            <TableCell>{food.proteinG}</TableCell>
            <TableCell>{food.fatG}</TableCell>
            <TableCell>{food.carbG}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
