import { describe, expect, it } from "vitest";
import { calculatePeriodAggregate } from "./periodAggregate.js";

const mean = (values: number[]): number => values.reduce((sum, v) => sum + v, 0) / values.length;
const sum = (values: number[]): number => values.reduce((total, v) => total + v, 0);

describe("calculatePeriodAggregate", () => {
  it("記録が0件の場合は空配列を返す", () => {
    const result = calculatePeriodAggregate({
      period: "DAILY",
      points: [],
      today: "2026-08-03",
      combine: mean,
    });

    expect(result).toEqual([]);
  });

  describe("DAILY(日次)", () => {
    it("最古の記録日から当日まで、1日1バケットで欠測日をhasData=falseで区別する", () => {
      const result = calculatePeriodAggregate({
        period: "DAILY",
        points: [
          { date: "2026-08-01", value: 70 },
          { date: "2026-08-03", value: 69 },
        ],
        today: "2026-08-03",
        combine: mean,
      });

      expect(result).toEqual([
        {
          periodLabel: "2026-08-01",
          startDate: "2026-08-01",
          endDate: "2026-08-01",
          hasData: true,
          value: 70,
        },
        {
          periodLabel: "2026-08-02",
          startDate: "2026-08-02",
          endDate: "2026-08-02",
          hasData: false,
          value: null,
        },
        {
          periodLabel: "2026-08-03",
          startDate: "2026-08-03",
          endDate: "2026-08-03",
          hasData: true,
          value: 69,
        },
      ]);
    });
  });

  describe("WEEKLY(週次、月曜始まり)", () => {
    it("完了済みの週は月曜〜日曜、当日を含む週は当日までの経過分のみを集計する", () => {
      // 2026-08-03(月)が第1週の開始。2026-08-19(水)が「今日」で第3週の途中。
      const result = calculatePeriodAggregate({
        period: "WEEKLY",
        points: [
          { date: "2026-08-03", value: 70 }, // 第1週(08-03〜08-09)
          { date: "2026-08-17", value: 69.5 }, // 第3週(08-17〜、当日08-19までの経過分)
        ],
        today: "2026-08-19",
        combine: mean,
      });

      expect(result).toEqual([
        {
          periodLabel: "2026-08-03週",
          startDate: "2026-08-03",
          endDate: "2026-08-09",
          hasData: true,
          value: 70,
        },
        {
          periodLabel: "2026-08-10週",
          startDate: "2026-08-10",
          endDate: "2026-08-16",
          hasData: false,
          value: null,
        },
        {
          // 今週(まだ終わっていない週)はendDateが日曜(08-23)ではなく当日(08-19)になる
          periodLabel: "2026-08-17週",
          startDate: "2026-08-17",
          endDate: "2026-08-19",
          hasData: true,
          value: 69.5,
        },
      ]);
    });

    it("同一週内の複数記録はcombine関数で集約する(例: 平均)", () => {
      const result = calculatePeriodAggregate({
        period: "WEEKLY",
        points: [
          { date: "2026-08-03", value: 70 },
          { date: "2026-08-05", value: 72 },
        ],
        today: "2026-08-09",
        combine: mean,
      });

      expect(result).toEqual([
        {
          periodLabel: "2026-08-03週",
          startDate: "2026-08-03",
          endDate: "2026-08-09",
          hasData: true,
          value: 71,
        },
      ]);
    });

    it("combine関数にsumを渡すと合計値になる(消費カロリーの週合計などを想定)", () => {
      const result = calculatePeriodAggregate({
        period: "WEEKLY",
        points: [
          { date: "2026-08-03", value: 300 },
          { date: "2026-08-04", value: 250 },
        ],
        today: "2026-08-09",
        combine: sum,
      });

      expect(result[0]?.value).toBe(550);
    });
  });

  describe("MONTHLY(月次)", () => {
    it("完了済みの月は月初〜月末、当月は当日までの経過分のみを集計し、月ごとの日数差も正しく扱う", () => {
      // 2026年1月(31日) → 2月(28日、2026年は平年) をまたぐ。
      const result = calculatePeriodAggregate({
        period: "MONTHLY",
        points: [
          { date: "2026-01-15", value: 70 },
          { date: "2026-02-10", value: 69 },
        ],
        today: "2026-02-20",
        combine: mean,
      });

      expect(result).toEqual([
        {
          periodLabel: "2026年1月",
          startDate: "2026-01-01",
          endDate: "2026-01-31",
          hasData: true,
          value: 70,
        },
        {
          periodLabel: "2026年2月",
          startDate: "2026-02-01",
          endDate: "2026-02-20",
          hasData: true,
          value: 69,
        },
      ]);
    });
  });

  it("記録は存在するが値がnull(算出不可)の場合、hasDataはtrueのままvalueはnullになる", () => {
    // 体重未記録でトレーニング分の消費カロリーが算出不可(null)のケースなどを想定。
    const result = calculatePeriodAggregate({
      period: "DAILY",
      points: [{ date: "2026-08-01", value: null }],
      today: "2026-08-01",
      combine: mean,
    });

    expect(result).toEqual([
      {
        periodLabel: "2026-08-01",
        startDate: "2026-08-01",
        endDate: "2026-08-01",
        hasData: true,
        value: null,
      },
    ]);
  });

  it("値がnullの記録と数値の記録が同じバケットに混在する場合、null以外の値だけをcombineする", () => {
    const result = calculatePeriodAggregate({
      period: "WEEKLY",
      points: [
        { date: "2026-08-03", value: null },
        { date: "2026-08-04", value: 300 },
      ],
      today: "2026-08-09",
      combine: sum,
    });

    expect(result).toEqual([
      {
        periodLabel: "2026-08-03週",
        startDate: "2026-08-03",
        endDate: "2026-08-09",
        hasData: true,
        value: 300,
      },
    ]);
  });
});
