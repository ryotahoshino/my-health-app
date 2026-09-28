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
import { styled, useTheme } from "@mui/material/styles";
import { LineChart } from "@mui/x-charts/LineChart";
import { Section } from "../../../components/Section";

export type WeightTrendRecord = {
  id?: string;
  date: string;
  weightKg: number;
};

export type WeightTrendProps = {
  records: WeightTrendRecord[];
  onDelete?: (record: WeightTrendRecord) => void;
};

const Root = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(2),
}));

// 推移の要約は本文として読めるようにし、太さで結論だと分かるようにする
// (グラフの非視覚的代替、原則I / FR-004)。
const Summary = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.button.fontWeight,
}));

// 表示の切り替えは操作として独立させ、内容と混ざらないようにする。
const ToggleAction = styled("div")({
  alignSelf: "flex-start",
});

// グラフの内容は同じデータを表形式でも取得でき、推移の要約もテキストで
// 読める(FR-004、原則I: グラフの非視覚的代替)。
export const WeightTrend = ({ records, onDelete }: WeightTrendProps) => {
  const theme = useTheme();
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
        height={theme.layout.chartHeight}
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
    // 要約・切替操作・グラフ(または表)を1つの面にまとめ、見出しを付ける
    // (FR-004 / FR-010。表形式とテキスト要約による非視覚的代替は維持する)。
    <Section title="体重の推移">
      <Root>
        <Summary variant="body1">{summaryText}</Summary>
        {records.length > 0 && (
          <ToggleAction>
            <Button variant="outlined" onClick={handleToggleView}>
              {toggleLabel}
            </Button>
          </ToggleAction>
        )}
        {content}
      </Root>
    </Section>
  );
};
