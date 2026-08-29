import type { SessionCalorieEstimate } from "./sessionCalorie.js";

export type StepCalorieInput = {
  steps: number;
  weightKg: number | null;
};

// research.md #5: 歩行のMETsとケイデンス(歩/分)。
const WALKING_METS = 3.0;
const CADENCE_STEPS_PER_MINUTE = 100;

const FORMULA = "消費カロリー(kcal) = METs × 体重(kg) × 実施時間(h)";
const METS_SOURCE = "国立健康・栄養研究所「改訂版 身体活動のメッツ(METs)表」";

// 計算式・定数・出典は歩数によらず常に同じ値なので、期間集計(複数日分を
// 合算した見積もり)の表示にも使い回せるようexportする(periodAggregate対応)。
export const buildStepCalorieEstimate = (calories: number | null): SessionCalorieEstimate => ({
  calories,
  formula: FORMULA,
  assumedConstants: [
    { label: "歩行のMETs", value: WALKING_METS, unit: "METs" },
    { label: "ケイデンス", value: CADENCE_STEPS_PER_MINUTE, unit: "歩/分" },
  ],
  source: METS_SOURCE,
});

// 純粋関数として実装し、外部I/O(体重の取得など)は呼び出し側(GraphQLリゾルバ)に
// 委ねる(原則V)。体重が無い場合はcalories=nullとし、算出不可を明示する(FR-011)。
// 型はsessionCalorie.tsのSessionCalorieEstimateと同じ形なので再利用する。
export const calculateStepCalorie = (input: StepCalorieInput): SessionCalorieEstimate => {
  let calories: number | null;
  if (input.weightKg === null) {
    calories = null;
  } else {
    // 実施時間(h) = 歩数 ÷ ケイデンス(歩/分) ÷ 60分/h
    const hours = input.steps / CADENCE_STEPS_PER_MINUTE / 60;
    calories = WALKING_METS * input.weightKg * hours;
  }

  return buildStepCalorieEstimate(calories);
};
