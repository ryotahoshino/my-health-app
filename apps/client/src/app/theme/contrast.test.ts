import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { theme } from "./index";

// テーマ差し替え前(MUI 既定テーマ)の主要6組のコントラスト比(T010、2026-09-19 実測)。
// 小数第3位以下を切り捨てて記録している(research.md #10)。
// 憲法 原則X「アクセシビリティの優先」により、適用後はいずれもこの値を下回ってはならない。
const BASELINE = {
  body: 16.1, // rgba(0, 0, 0, 0.87) / #fff = 16.1022
  secondary: 5.74, // rgba(0, 0, 0, 0.6) / #fff = 5.7418
  primaryButton: 4.6, // #fff / #1976d2 = 4.6019
  link: 4.6, // #1976d2 / #fff = 4.6019
  error: 4.97, // #d32f2f / #fff = 4.9793
  tableHeader: 16.1, // rgba(0, 0, 0, 0.87) / #fff = 16.1022
} as const;

// WCAG 2.x 達成基準 1.4.3 の通常サイズの文字の基準(AA)。
const AA_NORMAL_TEXT = 4.5;

// WCAG 2.x の相対輝度に基づくコントラスト比の算出(research.md #10)。
// 期待値は WCAG の定義から手計算できる既知の値を使う。
describe("contrastRatio", () => {
  it("黒と白は 21:1 になる", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 2);
  });

  it("同じ色同士は 1:1 になる", () => {
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 2);
  });

  it("前景と背景を入れ替えても同じ値になる", () => {
    expect(contrastRatio("#1976d2", "#ffffff")).toBeCloseTo(contrastRatio("#ffffff", "#1976d2"), 5);
  });

  it("3桁の色コードを6桁と同じ色として扱う", () => {
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(21, 2);
  });

  it("#767676 と白は AA の境界付近(約4.54)になる", () => {
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });

  it("半透明の前景は背景に合成してから算出する(rgba(0,0,0,0.6) は白の上で #666666 と同じ)", () => {
    expect(contrastRatio("rgba(0, 0, 0, 0.6)", "#ffffff")).toBeCloseTo(
      contrastRatio("#666666", "#ffffff"),
      2,
    );
  });

  it("解釈できない色の指定はエラーにする", () => {
    expect(() => contrastRatio("red", "#ffffff")).toThrow();
  });
});

describe("適用後のテーマのコントラスト(FR-018 / SC-013)", () => {
  const palette = theme.palette;
  const pairs: [string, string, string, number][] = [
    ["本文 / 背景", palette.text.primary, palette.background.default, BASELINE.body],
    ["補足 / 背景", palette.text.secondary, palette.background.default, BASELINE.secondary],
    [
      "主ボタンの文字 / 主色",
      palette.primary.contrastText,
      palette.primary.main,
      BASELINE.primaryButton,
    ],
    ["リンク(主色) / 背景", palette.primary.main, palette.background.default, BASELINE.link],
    ["エラー文字 / 背景", palette.error.main, palette.background.default, BASELINE.error],
    ["表の見出し / 面", palette.text.primary, palette.background.paper, BASELINE.tableHeader],
  ];

  it.each(pairs)(
    "%s は適用前の基準値以上かつ AA 以上",
    (_label, foreground, background, baseline) => {
      const ratio = contrastRatio(foreground, background);
      expect(ratio).toBeGreaterThanOrEqual(baseline);
      expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    },
  );
});
