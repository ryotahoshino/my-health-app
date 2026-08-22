import { useState } from "react";
import {
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { LineChart } from "@mui/x-charts/LineChart";

export interface WeightTrendRecord {
  id?: string;
  date: string;
  weightKg: number;
}

export interface WeightTrendProps {
  records: WeightTrendRecord[];
  onDelete?: (record: WeightTrendRecord) => void;
}

const Root = styled(Stack)({
  gap: 16,
});

// グラフの内容は同じデータを表形式でも取得でき、推移の要約もテキストで
// 読める(FR-004、原則I: グラフの非視覚的代替)。
export const WeightTrend = ({ records, onDelete }: WeightTrendProps) => {
  const [view, setView] = useState<"chart" | "table">("chart");

  const first = records.at(0);
  const latest = records.at(-1);
  const diff = first && latest ? latest.weightKg - first.weightKg : undefined;
  const diffText =
    diff === undefined ? "" : `(${first?.date}比 ${diff >= 0 ? "+" : ""}${diff.toFixed(1)}kg)`;

  return (
    <Root>
      <Typography variant="body2">
        {records.length === 0
          ? "体重の記録がまだありません"
          : `直近の体重: ${latest?.weightKg}kg${diffText}`}
      </Typography>
      {records.length > 0 && (
        <Button
          variant="outlined"
          onClick={() => setView((current) => (current === "chart" ? "table" : "chart"))}
        >
          {view === "chart" ? "表で見る" : "グラフで見る"}
        </Button>
      )}
      {view === "chart" ? (
        <LineChart
          height={300}
          xAxis={[{ data: records.map((record) => record.date), scaleType: "band" }]}
          series={[{ data: records.map((record) => record.weightKg), label: "体重(kg)" }]}
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>日付</TableCell>
              <TableCell>体重(kg)</TableCell>
              {onDelete && <TableCell>操作</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.date}>
                <TableCell>{record.date}</TableCell>
                <TableCell>{record.weightKg}</TableCell>
                {onDelete && (
                  <TableCell>
                    <Button size="small" onClick={() => onDelete(record)}>
                      削除
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Root>
  );
};
