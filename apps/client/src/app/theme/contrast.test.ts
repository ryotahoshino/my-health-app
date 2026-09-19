import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

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
