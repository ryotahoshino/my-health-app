import { Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";

export type WeightTrendAggregatePoint = {
  periodLabel: string;
  hasData: boolean;
  value: number | null;
};

export type WeightTrendAggregateProps = {
  points: WeightTrendAggregatePoint[];
};

// 週次・月次などの期間集計結果を表で表示する。記録が無い期間は0ではなく
// 「欠測」として区別し、誤解を招く表現を避ける(Edge Cases、FR-016)。
export const WeightTrendAggregate = ({ points }: WeightTrendAggregateProps) => {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell component="th" scope="col">
            期間
          </TableCell>
          <TableCell component="th" scope="col">
            体重(kg)平均
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {points.map((point) => {
          let valueCell;
          if (point.hasData && point.value !== null) {
            valueCell = `${point.value.toFixed(1)}kg`;
          } else {
            valueCell = "欠測";
          }

          return (
            <TableRow key={point.periodLabel}>
              <TableCell component="th" scope="row">
                {point.periodLabel}
              </TableCell>
              <TableCell>{valueCell}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
