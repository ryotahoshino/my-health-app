import type { ReactNode } from "react";
import { AppBar, Toolbar } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Link as RouterLink, useLocation } from "react-router";

// ヘッダー(アプリ名)+ 横並びのナビゲーション + 主要コンテンツ領域。
// デジタル庁デザインシステムの「水平メニュー」に倣い、面は白、現在地は
// 主色の文字と主色の下線で示す(https://design.digital.go.jp/dads/components/horizontal-menu/)。
// 素朴なテキストリンクの並びを置き換える(FR-016 / contracts/app-shell.md)。
// アプリ名とナビゲーションは1行に収め、本文の領域を圧迫しない高さにする。

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

// 高さはテーマの mixins.toolbar(トークンの headerHeight)で決まる。
// MUI 既定より低く抑え、アプリ名とナビゲーションを同じ行に収める。
const HeaderRow = styled(Toolbar)(({ theme }) => ({
  // 画面幅375pxでもアプリ名と4項目が収まるよう、左右の余白は1段階(8px)にする(FR-011)。
  paddingInline: theme.spacing(1),
  gap: theme.spacing(1),
  justifyContent: "space-between",
}));

// アプリ名。画面見出し(h1)と競合させないため見出し要素にはしない。
const ServiceName = styled("p")(({ theme }) => ({
  ...theme.typography.button,
  margin: 0,
  whiteSpace: "nowrap",
}));

// Toolbar は子を上下中央に置くため、ナビゲーションだけは高さいっぱいに伸ばす。
// これで各項目の下線がヘッダーの下端に揃い、タップ領域も1行分の高さになる。
const Navigation = styled("nav")({
  display: "flex",
  alignSelf: "stretch",
});

const NavigationList = styled("ul")(({ theme }) => ({
  display: "flex",
  alignItems: "stretch",
  gap: theme.spacing(0.5),
  listStyle: "none",
  margin: 0,
  padding: 0,
}));

const NavigationItemCell = styled("li")({
  display: "flex",
});

// 項目のラベルはUIラベル(1行)。折り返さない(contracts/app-shell.md 表示要件)。
// 下線をヘッダーの下端に合わせるため、項目はヘッダーの高さいっぱいに広げる。
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
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap",
    paddingInline: theme.spacing(0.5),
    textDecoration: "none",
    // 現在地でない項目にも同じ太さの透明な線を引き、切り替えで文字の位置が動かないようにする。
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
        <HeaderRow>
          <ServiceName>健康記録</ServiceName>
          <Navigation aria-label="主要メニュー">
            <NavigationList>
              {navigationItems.map((item) => {
                const isCurrent = pathname === item.to;
                let ariaCurrent: "page" | undefined;
                if (isCurrent) {
                  ariaCurrent = "page";
                }

                return (
                  <NavigationItemCell key={item.to}>
                    <NavigationLink to={item.to} isCurrent={isCurrent} aria-current={ariaCurrent}>
                      {item.label}
                    </NavigationLink>
                  </NavigationItemCell>
                );
              })}
            </NavigationList>
          </Navigation>
        </HeaderRow>
      </HeaderBar>
      <Main>{children}</Main>
    </>
  );
};
