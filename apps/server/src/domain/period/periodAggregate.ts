export type AggregationPeriod = "DAILY" | "WEEKLY" | "MONTHLY";

export interface PeriodDataPoint {
  date: string; // YYYY-MM-DD
  // 記録は存在するが値を算出できない場合(例: 体重未記録で消費カロリーが
  // 算出不可)はnullを渡す。dateがpointsに含まれること自体が「その日に
  // 記録がある」ことを表す(hasDataの判定に使う)。
  value: number | null;
}

export interface PeriodAggregatePoint {
  periodLabel: string;
  startDate: string;
  endDate: string;
  hasData: boolean;
  value: number | null;
}

export interface PeriodAggregateInput {
  period: AggregationPeriod;
  points: PeriodDataPoint[];
  // 現在時刻の取得はI/O相当のためこの純粋関数の外(呼び出し元のスキーマ層)
  // で行い、文字列として注入する(憲法 原則V)。
  today: string;
  // バケット内の複数値をどう1つにまとめるか(平均・合計など)を呼び出し側が
  // 指定する。体重は平均、消費カロリーは合計、のように用途ごとに異なるため。
  combine: (values: number[]) => number;
}

// combineの代表例。呼び出し側での重複定義を避けるためここからexportする。
export const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

export const mean = (values: number[]): number => sum(values) / values.length;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseDateToUtcMs = (date: string): number => {
  const parts = date.split("-").map(Number);
  const year = parts[0]!;
  const month = parts[1]!;
  const day = parts[2]!;
  return Date.UTC(year, month - 1, day);
};

const formatUtcMsToDate = (ms: number): string => {
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (ms: number, days: number): number => ms + days * MS_PER_DAY;

const enumerateDates = (startDate: string, endDate: string): string[] => {
  const startMs = parseDateToUtcMs(startDate);
  const endMs = parseDateToUtcMs(endDate);
  const dates: string[] = [];
  for (let ms = startMs; ms <= endMs; ms = addDays(ms, 1)) {
    dates.push(formatUtcMsToDate(ms));
  }
  return dates;
};

// 週は月曜始まり(FR-016)。getUTCDay()はSun=0..Sat=6なので、月曜からの
// 経過日数は (day + 6) % 7 で求まる(Mon=0, Tue=1, ..., Sun=6)。
const getWeekStartMs = (ms: number): number => {
  const day = new Date(ms).getUTCDay();
  const offsetFromMonday = (day + 6) % 7;
  return addDays(ms, -offsetFromMonday);
};

const getMonthStartMs = (ms: number): number => {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
};

const getNextMonthStartMs = (monthStartMs: number): number => {
  const d = new Date(monthStartMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
};

// 当月の末日 = 翌月初日の前日。getNextMonthStartMsと同じ「翌月へ繰り上げる」
// 計算を重複させない。
const getMonthEndMs = (monthStartMs: number): number =>
  addDays(getNextMonthStartMs(monthStartMs), -1);

interface BucketRange {
  start: string;
  end: string;
  label: string;
}

const buildDailyRanges = (earliestDate: string, today: string): BucketRange[] => {
  return enumerateDates(earliestDate, today).map((date) => ({
    start: date,
    end: date,
    label: date,
  }));
};

// 週次・月次はどちらも「区切りの開始日を求め、区切りの単位で当日まで前進
// させながら、未完了(今週・今月)の区切りだけ終了日を当日に差し替える」
// という同じ形をしている(FR-016)ため、区切りの単位ごとの差分だけを
// パラメータ化して1つの実装にまとめる。
interface PeriodStepper {
  getPeriodStartMs: (ms: number) => number;
  getPeriodEndMs: (periodStartMs: number) => number;
  nextPeriodStartMs: (periodStartMs: number) => number;
  formatLabel: (periodStartMs: number) => string;
}

const buildSteppedRanges = (
  earliestDate: string,
  today: string,
  stepper: PeriodStepper,
): BucketRange[] => {
  const todayMs = parseDateToUtcMs(today);
  const currentPeriodStartMs = stepper.getPeriodStartMs(todayMs);
  const firstPeriodStartMs = stepper.getPeriodStartMs(parseDateToUtcMs(earliestDate));

  const ranges: BucketRange[] = [];
  for (
    let periodStartMs = firstPeriodStartMs;
    periodStartMs <= currentPeriodStartMs;
    periodStartMs = stepper.nextPeriodStartMs(periodStartMs)
  ) {
    let periodEndMs: number;
    // 今週・今月(まだ終わっていない区切り)は当日までの経過分のみを対象とする(FR-016)。
    if (periodStartMs === currentPeriodStartMs) {
      periodEndMs = todayMs;
    } else {
      periodEndMs = stepper.getPeriodEndMs(periodStartMs);
    }

    ranges.push({
      start: formatUtcMsToDate(periodStartMs),
      end: formatUtcMsToDate(periodEndMs),
      label: stepper.formatLabel(periodStartMs),
    });
  }
  return ranges;
};

const buildWeeklyRanges = (earliestDate: string, today: string): BucketRange[] =>
  buildSteppedRanges(earliestDate, today, {
    getPeriodStartMs: getWeekStartMs,
    getPeriodEndMs: (weekStartMs) => addDays(weekStartMs, 6),
    nextPeriodStartMs: (weekStartMs) => addDays(weekStartMs, 7),
    formatLabel: (weekStartMs) => `${formatUtcMsToDate(weekStartMs)}週`,
  });

const buildMonthlyRanges = (earliestDate: string, today: string): BucketRange[] =>
  buildSteppedRanges(earliestDate, today, {
    getPeriodStartMs: getMonthStartMs,
    getPeriodEndMs: getMonthEndMs,
    nextPeriodStartMs: getNextMonthStartMs,
    formatLabel: (monthStartMs) => {
      const d = new Date(monthStartMs);
      return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月`;
    },
  });

// 記録がある最古の日から当日までの履歴全体を、指定されたpresetの区切りに
// 分割する(任意の期間範囲指定は対象外、FR-016)。
export const buildBucketRanges = (
  period: AggregationPeriod,
  earliestDate: string,
  today: string,
): BucketRange[] => {
  if (period === "DAILY") {
    return buildDailyRanges(earliestDate, today);
  }
  if (period === "WEEKLY") {
    return buildWeeklyRanges(earliestDate, today);
  }
  return buildMonthlyRanges(earliestDate, today);
};

// 指定済みのバケット区切りに沿ってpointsを集計する。複数の系列(例:
// トレーニング分・歩数分)を同じ区切りで集計したい場合、buildBucketRangesを
// 1回だけ呼び出し、その結果をこの関数に複数回渡すことで区切り計算の
// 重複を避けられる(呼び出し元: apps/server/src/schema/steps.ts)。
// 記録がない日は0ではなく欠測(hasData: false)として区別する(Edge Cases)。
export const aggregatePointsOverRanges = (
  points: PeriodDataPoint[],
  ranges: BucketRange[],
  combine: (values: number[]) => number,
): PeriodAggregatePoint[] => {
  const pointsByDate = new Map(points.map((point) => [point.date, point]));

  return ranges.map(({ start, end, label }) => {
    const recordedValues: number[] = [];
    let hasData = false;

    for (const date of enumerateDates(start, end)) {
      const point = pointsByDate.get(date);
      if (point) {
        hasData = true;
        if (point.value !== null) {
          recordedValues.push(point.value);
        }
      }
    }

    let value: number | null;
    if (recordedValues.length === 0) {
      value = null;
    } else {
      value = combine(recordedValues);
    }

    return { periodLabel: label, startDate: start, endDate: end, hasData, value };
  });
};

// 記録データを日次・週次・月次のプリセットで集計する(FR-016)。
export const calculatePeriodAggregate = (input: PeriodAggregateInput): PeriodAggregatePoint[] => {
  const { period, points, today, combine } = input;

  if (points.length === 0) {
    return [];
  }

  let earliestDate = points[0]!.date;
  for (const point of points) {
    if (point.date < earliestDate) {
      earliestDate = point.date;
    }
  }

  const ranges = buildBucketRanges(period, earliestDate, today);
  return aggregatePointsOverRanges(points, ranges, combine);
};
