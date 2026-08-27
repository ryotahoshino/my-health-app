export type TrainingIntensity = "LOW" | "MEDIUM" | "HIGH";

export interface SessionCalorieInput {
  intensity: TrainingIntensity;
  durationMinutes: number;
  weightKg: number | null;
}

export interface AssumedConstant {
  label: string;
  value: number;
  unit: string;
}

export interface SessionCalorieEstimate {
  calories: number | null;
  formula: string;
  assumedConstants: AssumedConstant[];
  source: string;
}

// research.md #5: セッション全体の強度区分ごとのMETs(種目マスタの種目別METsとは独立)。
const INTENSITY_METS: Record<TrainingIntensity, number> = {
  LOW: 3.0,
  MEDIUM: 5.0,
  HIGH: 8.0,
};

const INTENSITY_LABELS: Record<TrainingIntensity, string> = {
  LOW: "低強度",
  MEDIUM: "中強度",
  HIGH: "高強度",
};

const FORMULA = "消費カロリー(kcal) = METs × 体重(kg) × 実施時間(h)";
const METS_SOURCE = "国立健康・栄養研究所「改訂版 身体活動のメッツ(METs)表」";

export interface WeightRecordLike {
  date: string;
  weightKg: number;
}

// 算出対象日以前で最も新しい体重記録を選ぶ(未来の体重は使わない、data-model.md)。
// weightRecords は日付昇順(ASC)でソート済みであることを前提とする
// (WeightRepository.list()の並び順、ISO形式の日付は文字列比較で時系列順になる)。
export const findWeightAsOf = (
  weightRecords: WeightRecordLike[],
  asOfDate: string,
): number | null => {
  let applicable: number | null = null;
  for (const record of weightRecords) {
    if (record.date <= asOfDate) {
      applicable = record.weightKg;
    } else {
      break;
    }
  }
  return applicable;
};

// 純粋関数として実装し、外部I/O(体重の取得など)は呼び出し側(GraphQLリゾルバ)に
// 委ねる(原則V)。体重が無い場合はcalories=nullとし、算出不可を明示する(FR-011)。
export const calculateSessionCalorie = (input: SessionCalorieInput): SessionCalorieEstimate => {
  const mets = INTENSITY_METS[input.intensity];
  const assumedConstants: AssumedConstant[] = [
    { label: `${INTENSITY_LABELS[input.intensity]}のMETs`, value: mets, unit: "METs" },
  ];

  if (input.weightKg === null) {
    return {
      calories: null,
      formula: FORMULA,
      assumedConstants,
      source: METS_SOURCE,
    };
  }

  const hours = input.durationMinutes / 60;
  const calories = mets * input.weightKg * hours;

  return {
    calories,
    formula: FORMULA,
    assumedConstants,
    source: METS_SOURCE,
  };
};
