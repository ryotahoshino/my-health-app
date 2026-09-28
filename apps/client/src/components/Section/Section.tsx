import { useId, type ReactNode } from "react";
import { Stack, Typography } from "@mui/material";
import { Surface } from "../Surface";

export type SectionProps = {
  title: string;
  // 画面内の位置に応じて見出しレベルを選ぶ(既定は画面見出し(h1)の次)。
  // 見出しレベルを飛ばすとアクセシビリティ検査(heading-order)で違反になる。
  titleComponent?: "h2" | "h3";
  children: ReactNode;
};

// 見出し付きのまとまり。面(Surface)と節見出しを組にして、情報の区切りを
// 視覚的にも支援技術にも伝える(FR-004 / FR-006 / US1 受け入れシナリオ2)。
export const Section = ({ title, titleComponent = "h2", children }: SectionProps) => {
  const titleId = useId();

  return (
    <Surface>
      {/* 見出しと領域を対応づけ、まとまりの名前が支援技術に伝わるようにする。 */}
      <Stack component="section" aria-labelledby={titleId} spacing={2}>
        <Typography id={titleId} variant="h2" component={titleComponent}>
          {title}
        </Typography>
        {children}
      </Stack>
    </Surface>
  );
};
