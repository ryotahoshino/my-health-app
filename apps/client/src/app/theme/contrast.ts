// WCAG 2.x のコントラスト比を算出する(specs/003-design-system-tokens research.md #10)。
// axe の検査は「AA を満たすか」の合否しか見ないため、「適用前の水準を下回っていないか」
// (憲法 原則X「アクセシビリティの優先」/ FR-018)を確かめるには比の値そのものが必要になる。

type Rgba = {
  r: number;
  g: number;
  b: number;
  a: number;
};

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB_PATTERN =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d*(?:\.\d+)?)\s*)?\)$/i;

const parseHex = (color: string): Rgba | undefined => {
  const match = HEX_PATTERN.exec(color);
  if (!match || match[1] === undefined) {
    return undefined;
  }
  let digits = match[1];
  if (digits.length === 3) {
    digits = digits
      .split("")
      .map((digit) => digit + digit)
      .join("");
  }
  return {
    r: Number.parseInt(digits.slice(0, 2), 16),
    g: Number.parseInt(digits.slice(2, 4), 16),
    b: Number.parseInt(digits.slice(4, 6), 16),
    a: 1,
  };
};

const parseRgb = (color: string): Rgba | undefined => {
  const match = RGB_PATTERN.exec(color);
  if (!match) {
    return undefined;
  }
  let alpha = 1;
  if (match[4] !== undefined) {
    alpha = Number(match[4]);
  }
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: alpha };
};

const parseColor = (color: string): Rgba => {
  const trimmed = color.trim();
  const fromHex = parseHex(trimmed);
  if (fromHex) {
    return fromHex;
  }
  const fromRgb = parseRgb(trimmed);
  if (fromRgb) {
    return fromRgb;
  }
  throw new Error(`コントラスト比を算出できない色の指定です: ${color}`);
};

// 半透明の前景は、画面上で実際に見える色(背景に合成した色)で比を求める。
const compositeOver = (foreground: Rgba, background: Rgba): Rgba => {
  if (background.a !== 1) {
    throw new Error("背景色は不透明である必要があります");
  }
  if (foreground.a === 1) {
    return foreground;
  }
  const blend = (front: number, back: number): number =>
    Math.round(front * foreground.a + back * (1 - foreground.a));
  return {
    r: blend(foreground.r, background.r),
    g: blend(foreground.g, background.g),
    b: blend(foreground.b, background.b),
    a: 1,
  };
};

// sRGB の各チャンネルを線形化する。しきい値は WCAG 2.2 で訂正された 0.04045 を用いる
// (2.1 の 0.03928 との差は 8bit の色では結果に影響しない)。
const linearize = (channel: number): number => {
  const normalized = channel / 255;
  if (normalized <= 0.04045) {
    return normalized / 12.92;
  }
  return ((normalized + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (color: Rgba): number =>
  0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b);

// 前景と背景の順序によらず、明るい方を分子にとった比(1〜21)を返す。
export const contrastRatio = (foreground: string, background: string): number => {
  const backgroundColor = parseColor(background);
  const foregroundColor = compositeOver(parseColor(foreground), backgroundColor);
  const foregroundLuminance = relativeLuminance(foregroundColor);
  const backgroundLuminance = relativeLuminance(backgroundColor);

  let lighter = backgroundLuminance;
  let darker = foregroundLuminance;
  if (foregroundLuminance > backgroundLuminance) {
    lighter = foregroundLuminance;
    darker = backgroundLuminance;
  }
  return (lighter + 0.05) / (darker + 0.05);
};
