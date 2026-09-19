import { describe, expect, it } from "vitest";
import dads from "@digital-go-jp/design-tokens";
import { createAppTheme, designTokens, spacingScale, theme } from "./index";

// テーマの fontSize は "1rem" のような文字列でも数値(px)でもありうるため、px に揃えて比較する。
// rem はブラウザ既定のルート文字サイズ(16px)を前提に換算する。
const toPx = (value: string | number | undefined): number => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.endsWith("rem")) {
    return Number.parseFloat(value) * 16;
  }
  if (typeof value === "string" && value.endsWith("px")) {
    return Number.parseFloat(value);
  }
  throw new Error(`px に換算できない値です: ${String(value)}`);
};

describe("本文のテキストスタイル(INV-2 / FR-012)", () => {
  it("本文(body1)は16px以上", () => {
    expect(toPx(theme.typography.body1.fontSize)).toBeGreaterThanOrEqual(16);
  });

  it("本文(body1)の行高は1.5以上", () => {
    expect(Number(theme.typography.body1.lineHeight)).toBeGreaterThanOrEqual(1.5);
  });
});

describe("見出し・本文・補足の区別(FR-004)", () => {
  it("画面見出し(h1) > 節見出し(h2) > 本文(body1) > 補足(body2) の順に文字が大きい", () => {
    const h1 = toPx(theme.typography.h1.fontSize);
    const h2 = toPx(theme.typography.h2.fontSize);
    const body1 = toPx(theme.typography.body1.fontSize);
    const body2 = toPx(theme.typography.body2.fontSize);
    expect(h1).toBeGreaterThan(h2);
    expect(h2).toBeGreaterThan(body1);
    expect(body1).toBeGreaterThan(body2);
  });

  it("見出しは太字、本文と補足は標準の太さ", () => {
    expect(Number(theme.typography.h1.fontWeight)).toBe(700);
    expect(Number(theme.typography.h2.fontWeight)).toBe(700);
    expect(Number(theme.typography.body1.fontWeight)).toBe(400);
    expect(Number(theme.typography.body2.fontWeight)).toBe(400);
  });
});

describe("余白スケール(INV-3 / FR-007)", () => {
  it("余白は 4 / 8 / 16 / 24 / 32 / 48 px の6段階", () => {
    expect(spacingScale).toEqual([4, 8, 16, 24, 32, 48]);
  });

  it("6段階のそれぞれをテーマの spacing で表せる(基準8px)", () => {
    const factors = [0.5, 1, 2, 3, 4, 6];
    const actual = factors.map((factor) => theme.spacing(factor));
    expect(actual).toEqual(spacingScale.map((px) => `${px}px`));
  });
});

describe("公式トークンとの一致(INV-4)", () => {
  it("本文色は公式の SolidGray 900", () => {
    expect(theme.palette.text.primary).toBe(dads.Color.Neutral.SolidGray["900"].$value);
  });

  it("補足の文字色は公式の SolidGray 700", () => {
    expect(theme.palette.text.secondary).toBe(dads.Color.Neutral.SolidGray["700"].$value);
  });

  it("主色は公式の Key 900、主色上の文字は公式の White", () => {
    expect(theme.palette.primary.main).toBe(dads.Color.Key["900"].$value);
    expect(theme.palette.primary.contrastText).toBe(dads.Color.Neutral.White.$value);
  });

  it("エラー色は公式の Semantic Error 2", () => {
    expect(theme.palette.error.main).toBe(dads.Color.Semantic.Error["2"].$value);
  });

  it("背景と面の色は公式の White", () => {
    expect(theme.palette.background.default).toBe(dads.Color.Neutral.White.$value);
    expect(theme.palette.background.paper).toBe(dads.Color.Neutral.White.$value);
  });

  it("書体は公式の FontFamily Sans", () => {
    expect(theme.typography.fontFamily).toBe(dads.FontFamily.Sans.$value);
  });

  it("影は公式の Elevation 1〜8 を使う", () => {
    expect(theme.shadows[1]).toBe(dads.Elevation["1"].$value);
    expect(theme.shadows[8]).toBe(dads.Elevation["8"].$value);
  });
});

describe("トークンの差し替えがテーマ全体に反映される(SC-004)", () => {
  it("主色を差し替えると palette.primary.main に反映される", () => {
    const replaced = createAppTheme({
      ...designTokens,
      color: { ...designTokens.color, primary: "#123456" },
    });
    expect(replaced.palette.primary.main).toBe("#123456");
  });

  it("本文の文字サイズを差し替えると body1 に反映される", () => {
    const replaced = createAppTheme({
      ...designTokens,
      typography: {
        ...designTokens.typography,
        body: { ...designTokens.typography.body, fontSize: "1.125rem" },
      },
    });
    expect(replaced.typography.body1.fontSize).toBe("1.125rem");
  });

  it("レイアウト幅を差し替えるとテーマの layout に反映される", () => {
    const replaced = createAppTheme({
      ...designTokens,
      layout: { ...designTokens.layout, form: 400 },
    });
    expect(replaced.layout.form).toBe(400);
  });
});
