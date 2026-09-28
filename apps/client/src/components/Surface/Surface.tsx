import type { ReactNode } from "react";
import { Paper } from "@mui/material";
import { styled } from "@mui/material/styles";

export type SurfaceProps = {
  children: ReactNode;
};

// 情報のまとまりを示す面。境界線と内側の余白でまとまりの範囲を示す。
// 色・余白・角丸はトークン由来で、入れ子は2段までとする(data-model.md #5)。
const Root = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
}));

export const Surface = ({ children }: SurfaceProps) => {
  return <Root variant="outlined">{children}</Root>;
};
