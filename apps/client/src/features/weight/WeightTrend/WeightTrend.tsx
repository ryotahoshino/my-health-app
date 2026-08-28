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

  let diff: number | undefined;
  if (first && latest) {
    diff = latest.weightKg - first.weightKg;
  } else {
    diff = undefined;
  }

  let diffText: string;
  if (diff === undefined) {
    diffText = "";
  } else {
    let sign: string;
    if (diff >= 0) {
      sign = "+";
    } else {
      sign = "";
    }
    diffText = `(${first?.date}比 ${sign}${diff.toFixed(1)}kg)`;
  }

  let summaryText: string;
  if (records.length === 0) {
    summaryText = "体重の記録がまだありません";
  } else {
    summaryText = `直近の体重: ${latest?.weightKg}kg${diffText}`;
  }

  const handleToggleView = () => {
    if (view === "chart") {
      setView("table");
    } else {
      setView("chart");
    }
  };

  let toggleLabel: string;
  if (view === "chart") {
    toggleLabel = "表で見る";
  } else {
    toggleLabel = "グラフで見る";
  }

  let content;
  if (view === "chart") {
    content = (
      <LineChart
        height={300}
        xAxis={[{ data: records.map((record) => record.date), scaleType: "band" }]}
        series={[{ data: records.map((record) => record.weightKg), label: "体重(kg)" }]}
      />
    );
  } else {
    content = (
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
    );
  }

  return (
    <Root>
      <Typography variant="body2">{summaryText}</Typography>
      {records.length > 0 && (
        <Button variant="outlined" onClick={handleToggleView}>
          {toggleLabel}
        </Button>
      )}
      {content}
    </Root>
  );
};
