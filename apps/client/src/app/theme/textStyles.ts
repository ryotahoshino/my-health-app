import { fontTokens } from "./tokens";

// テキストスタイル(文字サイズ・太さ・行高の組)。デジタル庁デザインシステムのテキストスタイル
// 命名「区分-サイズ-太さ-行高」(例: Std-16N-175)に対応させて合成する(research.md #4)。
// 個々の値は tokens.ts で公式トークンから読み取ったものだけを使う。
export type TextStyle = {
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing?: string;
};

export type TextStyles = {
  heading1: TextStyle;
  heading2: TextStyle;
  body: TextStyle;
  bodySmall: TextStyle;
  button: TextStyle;
};

export const textStyles: TextStyles = {
  // Std-32B-150: 画面見出し
  heading1: {
    fontSize: fontTokens.size[32],
    fontWeight: fontTokens.weight.bold,
    lineHeight: fontTokens.lineHeight[150],
  },
  // Std-20B-150: 節見出し
  heading2: {
    fontSize: fontTokens.size[20],
    fontWeight: fontTokens.weight.bold,
    lineHeight: fontTokens.lineHeight[150],
  },
  // Std-16N-175: 本文(16px以上・行高1.5以上 / INV-2)
  body: {
    fontSize: fontTokens.size[16],
    fontWeight: fontTokens.weight.normal,
    lineHeight: fontTokens.lineHeight[175],
  },
  // Dns-14N-130: 補足・表のセルなど情報密度の高い箇所
  bodySmall: {
    fontSize: fontTokens.size[14],
    fontWeight: fontTokens.weight.normal,
    lineHeight: fontTokens.lineHeight[130],
  },
  // Oln-16B-100: ボタンのラベル(1行で完結する文字列)
  button: {
    fontSize: fontTokens.size[16],
    fontWeight: fontTokens.weight.bold,
    lineHeight: fontTokens.lineHeight[100],
    letterSpacing: "0.02em",
  },
};
