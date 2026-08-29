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

const getMonthEndMs = (ms: number): number => {
  const d = new Date(ms);
  // 翌月の0日目 = 当月の末日(月ごとの日数差を自前で計算しなくて済む)。
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0);
};

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

const buildWeeklyRanges = (earliestDate: string, today: string): BucketRange[] => {
  const todayMs = parseDateToUtcMs(today);
  const currentWeekStartMs = getWeekStartMs(todayMs);
  const firstWeekStartMs = getWeekStartMs(parseDateToUtcMs(earliestDate));

  const ranges: BucketRange[] = [];
  for (
    let weekStartMs = firstWeekStartMs;
    weekStartMs <= currentWeekStartMs;
    weekStartMs = addDays(weekStartMs, 7)
  ) {
    let weekEndMs: number;
    // 今週(まだ終わっていない週)は当日までの経過分のみを対象とする(FR-016)。
    if (weekStartMs === currentWeekStartMs) {
      weekEndMs = todayMs;
    } else {
      weekEndMs = addDays(weekStartMs, 6);
    }

    const startDate = formatUtcMsToDate(weekStartMs);
    ranges.push({ start: startDate, end: formatUtcMsToDate(weekEndMs), label: `${startDate}週` });
  }
  return ranges;
};

const buildMonthlyRanges = (earliestDate: string, today: string): BucketRange[] => {
  const todayMs = parseDateToUtcMs(today);
  const currentMonthStartMs = getMonthStartMs(todayMs);
  const firstMonthStartMs = getMonthStartMs(parseDateToUtcMs(earliestDate));

  const ranges: BucketRange[] = [];
  let monthStartMs = firstMonthStartMs;
  while (monthStartMs <= currentMonthStartMs) {
    let monthEndMs: number;
    // 今月(まだ終わっていない月)は当日までの経過分のみを対象とする(FR-016)。
    if (monthStartMs === currentMonthStartMs) {
      monthEndMs = todayMs;
    } else {
      monthEndMs = getMonthEndMs(monthStartMs);
    }

    const monthStartDate = new Date(monthStartMs);
    const label = `${monthStartDate.getUTCFullYear()}年${monthStartDate.getUTCMonth() + 1}月`;
    ranges.push({
      start: formatUtcMsToDate(monthStartMs),
      end: formatUtcMsToDate(monthEndMs),
      label,
    });

    monthStartMs = Date.UTC(monthStartDate.getUTCFullYear(), monthStartDate.getUTCMonth() + 1, 1);
  }
  return ranges;
};

// 記録データを日次・週次・月次のプリセットで集計する(FR-016)。記録がある
// 最古の日から当日までの履歴全体をバケット化して返す(任意の期間範囲指定は
// 対象外)。記録がない日は0ではなく欠測(hasData: false)として区別する
// (Edge Cases)。
export const calculatePeriodAggregate = (input: PeriodAggregateInput): PeriodAggregatePoint[] => {
  const { period, points, today, combine } = input;

  if (points.length === 0) {
    return [];
  }

  const pointsByDate = new Map(points.map((point) => [point.date, point]));

  let earliestDate = points[0]!.date;
  for (const point of points) {
    if (point.date < earliestDate) {
      earliestDate = point.date;
    }
  }

  let bucketRanges: BucketRange[];
  if (period === "DAILY") {
    bucketRanges = buildDailyRanges(earliestDate, today);
  } else if (period === "WEEKLY") {
    bucketRanges = buildWeeklyRanges(earliestDate, today);
  } else {
    bucketRanges = buildMonthlyRanges(earliestDate, today);
  }

  return bucketRanges.map(({ start, end, label }) => {
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
