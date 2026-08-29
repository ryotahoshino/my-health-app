import type { MouseEvent } from "react";
import { ToggleButton, ToggleButtonGroup, type ToggleButtonGroupProps } from "@mui/material";
// GraphQLスキーマ(AggregationPeriod enum)を型の一次ソースとする(憲法 原則IV)。
// ここで独自にリテラル型を再宣言すると、スキーマ変更(例: プリセット追加)を
// 型チェックで検知できなくなる。
import type { AggregationPeriod } from "../../graphql/generated/sdk";

export type { AggregationPeriod };

export type PeriodSelectorProps = {
  value: AggregationPeriod;
  onChange: (value: AggregationPeriod) => void;
  // 利用箇所ごとの見た目調整のため、内部要素へpropsを渡せるようにする
  // (共通UIコンポーネントの規約、plan.md参照)。
  slotProps?: {
    toggleButtonGroup?: Partial<ToggleButtonGroupProps>;
  };
};

const PERIOD_OPTIONS: { value: AggregationPeriod; label: string }[] = [
  { value: "DAILY", label: "日次" },
  { value: "WEEKLY", label: "週次" },
  { value: "MONTHLY", label: "月次" },
];

// 記録データを日次・週次・月次のプリセットで切り替える共通UI(FR-016)。
// exclusive指定でも、選択中のボタンの再クリックでnewValueがnullになりうる
// ため、必ずいずれか1つが選択された状態を保つよう無視する。
export const PeriodSelector = ({ value, onChange, slotProps }: PeriodSelectorProps) => {
  const handleChange = (_event: MouseEvent<HTMLElement>, newValue: AggregationPeriod | null) => {
    if (newValue !== null) {
      onChange(newValue);
    }
  };

  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={handleChange}
      aria-label="集計期間"
      {...slotProps?.toggleButtonGroup}
    >
      {PERIOD_OPTIONS.map((option) => (
        <ToggleButton key={option.value} value={option.value}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
};
