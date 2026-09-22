import dads from "@digital-go-jp/design-tokens";

// デザイントークンの一次ソースは公式パッケージ @digital-go-jp/design-tokens(憲法 原則X / INV-4)。
// ここでは公式の値を「参照して写し取る」だけで、値そのものは書き換えない。
// 例外は公式トークンに存在しない余白とレイアウト寸法のみで、これらは本プロジェクトで定義する
// (specs/003-design-system-tokens research.md #2)。
//
// 公式パッケージの $value は型定義上 any のため(research.md #1)、この層で期待する型に
// 変換・検証し、以降の層(textStyles.ts / theme.ts)には型付きの値だけを渡す。

type RawToken = {
  $value?: unknown;
};

// rem 表記を px の数値に換算する際の前提(ブラウザ既定のルート文字サイズ)。
const ROOT_FONT_SIZE_PX = 16;

const readString = (token: RawToken, name: string): string => {
  if (typeof token.$value !== "string") {
    throw new Error(`デザイントークン ${name} の値が文字列ではありません`);
  }
  return token.$value;
};

// FontWeight は "400" のように文字列で、LineHeight は数値で提供されている(research.md #1)。
const readNumber = (token: RawToken, name: string): number => {
  const value = token.$value;
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  throw new Error(`デザイントークン ${name} の値が数値として解釈できません`);
};

const readRemAsPx = (token: RawToken, name: string): number => {
  const value = readString(token, name);
  if (!value.endsWith("rem")) {
    throw new Error(`デザイントークン ${name} の値が rem 表記ではありません`);
  }
  return Number.parseFloat(value) * ROOT_FONT_SIZE_PX;
};

// 配色(役割名 → 公式トークン)。
// 選定は「適用前(MUI既定)のコントラスト比を下回らない」を優先して行った(憲法 原則X
// 「アクセシビリティの優先」/ FR-018)。research.md #10 に基準値と選定の経緯を記録している。
export type ColorTokens = {
  textPrimary: string;
  textSecondary: string;
  background: string;
  surface: string;
  surfaceHover: string;
  divider: string;
  primary: string;
  onPrimary: string;
  error: string;
};

export const colorTokens: ColorTokens = {
  // SolidGray 800(#333, 12.63:1)は基準値16.10を下回るため、900(17.40:1)を選んだ。
  textPrimary: readString(dads.Color.Neutral.SolidGray["900"], "Color.Neutral.SolidGray.900"),
  textSecondary: readString(dads.Color.Neutral.SolidGray["700"], "Color.Neutral.SolidGray.700"),
  background: readString(dads.Color.Neutral.White, "Color.Neutral.White"),
  surface: readString(dads.Color.Neutral.White, "Color.Neutral.White"),
  // 面に対するポインタ操作時の背景。最も淡い灰色で、文字色とのコントラストをほぼ変えない。
  surfaceHover: readString(dads.Color.Neutral.SolidGray["50"], "Color.Neutral.SolidGray.50"),
  divider: readString(dads.Color.Neutral.SolidGray["200"], "Color.Neutral.SolidGray.200"),
  primary: readString(dads.Color.Key["900"], "Color.Key.900"),
  onPrimary: readString(dads.Color.Neutral.White, "Color.Neutral.White"),
  // Semantic Error 1(#ec0000, 4.60:1)は基準値4.97を下回るため、2(5.79:1)を選んだ。
  error: readString(dads.Color.Semantic.Error["2"], "Color.Semantic.Error.2"),
};

// タイポグラフィの個別トークン(テキストスタイルとしての合成は textStyles.ts で行う)。
export const fontTokens = {
  family: readString(dads.FontFamily.Sans, "FontFamily.Sans"),
  size: {
    14: readString(dads.FontSize["14"], "FontSize.14"),
    16: readString(dads.FontSize["16"], "FontSize.16"),
    20: readString(dads.FontSize["20"], "FontSize.20"),
    32: readString(dads.FontSize["32"], "FontSize.32"),
  },
  weight: {
    normal: readNumber(dads.FontWeight["400"], "FontWeight.400"),
    bold: readNumber(dads.FontWeight["700"], "FontWeight.700"),
  },
  lineHeight: {
    100: readNumber(dads.LineHeight["100"], "LineHeight.100"),
    130: readNumber(dads.LineHeight["130"], "LineHeight.130"),
    150: readNumber(dads.LineHeight["150"], "LineHeight.150"),
    175: readNumber(dads.LineHeight["175"], "LineHeight.175"),
  },
} as const;

// 角丸(px)。UIライブラリ側で倍率計算に使われるため px の数値に換算して渡す。
// 基準の 4px は適用前の既定値と同じ。
export const radiusToken = readRemAsPx(dads.BorderRadius["4"], "BorderRadius.4");

// 影(公式の Elevation 1〜8)。配列の添字0が Elevation 1 に対応する。
export const elevationTokens: string[] = [
  readString(dads.Elevation["1"], "Elevation.1"),
  readString(dads.Elevation["2"], "Elevation.2"),
  readString(dads.Elevation["3"], "Elevation.3"),
  readString(dads.Elevation["4"], "Elevation.4"),
  readString(dads.Elevation["5"], "Elevation.5"),
  readString(dads.Elevation["6"], "Elevation.6"),
  readString(dads.Elevation["7"], "Elevation.7"),
  readString(dads.Elevation["8"], "Elevation.8"),
];

// 余白(自前定義)。公式トークンに余白は無いため、デジタル庁デザインシステムのレイアウト指針
// 「基準 8 CSS px」に沿って定義する(research.md #2)。
export const spacingUnit = 8;
export const spacingScale = [4, 8, 16, 24, 32, 48] as const;

// レイアウト寸法(自前定義、px)。適用前の画面・フォームの最大幅とグラフの高さをそのまま引き継いでいる。
export type LayoutTokens = {
  contentWide: number;
  contentNarrow: number;
  form: number;
  chartHeight: number;
  // 境界線の太さ。公式トークンに無いため自前定義する。
  // hairline は面や表の区切り、emphasis は現在地を示す下線に使う。
  borderWidth: {
    hairline: number;
    emphasis: number;
  };
};

export const layoutTokens: LayoutTokens = {
  contentWide: 640,
  contentNarrow: 480,
  form: 320,
  chartHeight: 300,
  borderWidth: {
    hairline: 1,
    emphasis: 4,
  },
};
