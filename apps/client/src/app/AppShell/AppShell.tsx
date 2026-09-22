import type { ReactNode } from "react";
import { AppBar, Toolbar } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Link as RouterLink, useLocation } from "react-router";

// ヘッダー(アプリ名)+ 横並びのナビゲーション + 主要コンテンツ領域。
// デジタル庁デザインシステムの「水平メニュー」に倣い、面は白、現在地は
// 主色の文字と主色の下線で示す(https://design.digital.go.jp/dads/components/horizontal-menu/)。
// 素朴なテキストリンクの並びを置き換える(FR-016 / contracts/app-shell.md)。

export type AppShellProps = {
  children: ReactNode;
};

type NavigationItem = {
  to: string;
  label: string;
};

const navigationItems: NavigationItem[] = [
  { to: "/weight", label: "体重" },
  { to: "/training", label: "トレーニング" },
  { to: "/steps", label: "歩数" },
  { to: "/foods", label: "食材" },
];

// 面(白)として本文領域と区別する。境界は影(公式の Elevation)で示す。
// AppBar は既定で header 要素として描画されるため、ヘッダー領域の役割も満たす。
const HeaderBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
}));

// アプリ名。画面見出し(h1)と競合させないため見出し要素にはしない。
const ServiceName = styled("p")(({ theme }) => ({
  ...theme.typography.h2,
  margin: 0,
}));

const NavigationList = styled("ul")(({ theme }) => ({
  display: "flex",
  // 画面幅375pxでも4項目が収まるよう、項目の余白は1段階(8px)に抑える(FR-011)。
  gap: theme.spacing(1),
  listStyle: "none",
  margin: 0,
  padding: 0,
  paddingInline: theme.spacing(2),
}));

// 項目のラベルはUIラベル(1行)。折り返さない(contracts/app-shell.md 表示要件)。
const NavigationLink = styled(RouterLink, {
  shouldForwardProp: (prop) => prop !== "isCurrent",
})<{ isCurrent: boolean }>(({ theme, isCurrent }) => {
  let color = theme.palette.text.primary;
  let fontWeight = theme.typography.body1.fontWeight;
  let borderBottomColor = "transparent";
  if (isCurrent) {
    color = theme.palette.primary.main;
    fontWeight = theme.typography.button.fontWeight;
    borderBottomColor = theme.palette.primary.main;
  }

  return {
    ...theme.typography.button,
    color,
    fontWeight,
    display: "block",
    whiteSpace: "nowrap",
    // 縦は2段階(16px)でタップ領域の高さを確保し、横は1段階(8px)に抑えて
    // 画面幅375pxでも4項目が収まるようにする(FR-011 / SC-008)。
    padding: `${theme.spacing(2)} ${theme.spacing(1)}`,
    textDecoration: "none",
    // 現在地でない項目にも同じ太さの透明な線を引き、切り替えで高さが動かないようにする。
    borderBottomStyle: "solid",
    borderBottomWidth: theme.layout.borderWidth.emphasis,
    borderBottomColor,
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
      textDecoration: "underline",
    },
  };
});

const Main = styled("main")(({ theme }) => ({
  padding: theme.spacing(3),
}));

export const AppShell = ({ children }: AppShellProps) => {
  const { pathname } = useLocation();

  return (
    <>
      <HeaderBar position="static" elevation={1}>
        <Toolbar>
          <ServiceName>健康記録</ServiceName>
        </Toolbar>
        <nav aria-label="主要メニュー">
          <NavigationList>
            {navigationItems.map((item) => {
              const isCurrent = pathname === item.to;
              let ariaCurrent: "page" | undefined;
              if (isCurrent) {
                ariaCurrent = "page";
              }

              return (
                <li key={item.to}>
                  <NavigationLink to={item.to} isCurrent={isCurrent} aria-current={ariaCurrent}>
                    {item.label}
                  </NavigationLink>
                </li>
              );
            })}
          </NavigationList>
        </nav>
      </HeaderBar>
      <Main>{children}</Main>
    </>
  );
};
