import { useState, type ReactNode } from "react";
import { AppBar, Drawer, IconButton, Toolbar } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Link as RouterLink, useLocation } from "react-router";

// ヘッダー(アプリ名)+ ナビゲーション + 主要コンテンツ領域。
// デジタル庁デザインシステムの「水平メニュー」に倣い、面は白、現在地は主色の文字と
// 主色の下線で示す。幅が狭いときはハンバーガーメニューに切り替える
// (https://design.digital.go.jp/dads/components/horizontal-menu/)。
// 素朴なテキストリンクの並びを置き換える(FR-016 / contracts/app-shell.md)。
//
// 切り替えはメディアクエリではなくコンテナクエリ(@container)で行う。ヘッダーは常に
// 画面幅いっぱいに広がるため実際の見た目は同じで、かつ幅を固定した器に入れて
// ストーリーで検証できる(実際の画面幅を変えられないテスト環境のため)。

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
  containerType: "inline-size",
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

// 横並びのナビゲーション。Toolbar は子を上下中央に置くため高さいっぱいに伸ばし、
// 各項目の下線がヘッダーの下端に揃うようにする。狭いときは隠す。
const HorizontalNavigation = styled("nav")(({ theme }) => ({
  display: "flex",
  alignSelf: "stretch",
  [`@container (max-width: ${theme.layout.navigationCollapse - 1}px)`]: {
    display: "none",
  },
}));

const HorizontalList = styled("ul")(({ theme }) => ({
  display: "flex",
  alignItems: "stretch",
  gap: theme.spacing(0.5),
  listStyle: "none",
  margin: 0,
  padding: 0,
}));

const HorizontalItem = styled("li")({
  display: "flex",
});

// 項目のラベルはUIラベル(1行)。折り返さない(contracts/app-shell.md 表示要件)。
const HorizontalLink = styled(RouterLink, {
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

// ハンバーガーのボタン。広いときは隠す。
const MenuButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.primary,
  borderRadius: theme.shape.borderRadius,
  [`@container (min-width: ${theme.layout.navigationCollapse}px)`]: {
    display: "none",
  },
}));

// アイコンは3本の線で描く(アイコンのパッケージを増やさず、太さ・色をトークンで揃える)。
const MenuIcon = styled("span")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  width: theme.layout.iconSize,
  height: theme.layout.iconSize,
  paddingBlock: theme.spacing(0.5),
  "& > span": {
    backgroundColor: "currentColor",
    height: theme.layout.borderWidth.hairline * 2,
  },
}));

const MenuPanel = styled("nav")(({ theme }) => ({
  paddingBlock: theme.spacing(1),
  minWidth: theme.layout.navigationPanel,
}));

const MenuList = styled("ul")({
  listStyle: "none",
  margin: 0,
  padding: 0,
});

// 縦並びの項目。現在地は主色の文字・太字と、左端の主色の線で示す(色のみに依存しない)。
const MenuLink = styled(RouterLink, {
  shouldForwardProp: (prop) => prop !== "isCurrent",
})<{ isCurrent: boolean }>(({ theme, isCurrent }) => {
  let color = theme.palette.text.primary;
  let fontWeight = theme.typography.body1.fontWeight;
  let borderInlineStartColor = "transparent";
  if (isCurrent) {
    color = theme.palette.primary.main;
    fontWeight = theme.typography.button.fontWeight;
    borderInlineStartColor = theme.palette.primary.main;
  }

  return {
    ...theme.typography.button,
    color,
    fontWeight,
    display: "flex",
    alignItems: "center",
    minHeight: theme.layout.headerHeight,
    paddingInline: theme.spacing(2),
    textDecoration: "none",
    borderInlineStartStyle: "solid",
    borderInlineStartWidth: theme.layout.borderWidth.emphasis,
    borderInlineStartColor,
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
      textDecoration: "underline",
    },
  };
});

const Main = styled("main")(({ theme }) => ({
  padding: theme.spacing(3),
}));

const toAriaCurrent = (isCurrent: boolean): "page" | undefined => {
  if (isCurrent) {
    return "page";
  }
  return undefined;
};

export const AppShell = ({ children }: AppShellProps) => {
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      <HeaderBar position="static" elevation={1}>
        <HeaderRow>
          <ServiceName>健康記録</ServiceName>
          <HorizontalNavigation aria-label="主要メニュー">
            <HorizontalList>
              {navigationItems.map((item) => {
                const isCurrent = pathname === item.to;

                return (
                  <HorizontalItem key={item.to}>
                    <HorizontalLink
                      to={item.to}
                      isCurrent={isCurrent}
                      aria-current={toAriaCurrent(isCurrent)}
                    >
                      {item.label}
                    </HorizontalLink>
                  </HorizontalItem>
                );
              })}
            </HorizontalList>
          </HorizontalNavigation>
          <MenuButton
            aria-label="メニューを開く"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(true)}
          >
            <MenuIcon>
              <span />
              <span />
              <span />
            </MenuIcon>
          </MenuButton>
        </HeaderRow>
      </HeaderBar>
      {/* 画面が狭いときのメニュー。開いている間だけ描画されるため、
          ナビゲーション領域が2つ同時に存在することはない。 */}
      <Drawer anchor="right" open={isMenuOpen} onClose={closeMenu}>
        <MenuPanel aria-label="主要メニュー">
          <MenuList>
            {navigationItems.map((item) => {
              const isCurrent = pathname === item.to;

              return (
                <li key={item.to}>
                  <MenuLink
                    to={item.to}
                    isCurrent={isCurrent}
                    aria-current={toAriaCurrent(isCurrent)}
                    onClick={closeMenu}
                  >
                    {item.label}
                  </MenuLink>
                </li>
              );
            })}
          </MenuList>
        </MenuPanel>
      </Drawer>
      <Main>{children}</Main>
    </>
  );
};
