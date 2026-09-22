import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { MemoryRouter } from "react-router";
import { Typography } from "@mui/material";
import { theme } from "../theme";
// T042 で実装する(このテストは実装が無い間は失敗する)。
// 契約: contracts/app-shell.md
import { AppShell } from "./AppShell";

const meta: Meta<typeof AppShell> = {
  title: "app/AppShell",
  component: AppShell,
  args: {
    children: <Typography variant="body1">本文のサンプル</Typography>,
  },
};
export default meta;

type Story = StoryObj<typeof AppShell>;

const withRoute = (path: string) => (Story: () => React.ReactElement) => (
  <MemoryRouter initialEntries={[path]}>
    <Story />
  </MemoryRouter>
);

// 横並びとハンバーガーの切り替えはコンテナクエリで行うため、幅を固定した器に入れると
// 実際の画面幅と同じように切り替わる(AppShell.tsx のコメント参照)。
const FRAME_TEST_ID = "shell-frame";

const withWidth = (width: number) => (Story: () => React.ReactElement) => (
  <div style={{ width }} data-testid={FRAME_TEST_ID}>
    <Story />
  </div>
);

const WIDE_WIDTH_PX = 900;

export const Landmarks: Story = {
  name: "ヘッダー・名前付きナビゲーション・主要コンテンツの領域がある",
  decorators: [withWidth(WIDE_WIDTH_PX), withRoute("/weight")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 支援技術に役割が伝わる領域として提供する(contracts/app-shell.md 1・2)。
    await expect(canvas.getByRole("banner")).toBeInTheDocument();
    await expect(canvas.getByRole("navigation", { name: "主要メニュー" })).toBeInTheDocument();
    await expect(canvas.getByRole("main")).toBeInTheDocument();
    // 本文はヘッダーの外(主要コンテンツ領域の中)に置かれる。
    await expect(within(canvas.getByRole("main")).getByText("本文のサンプル")).toBeInTheDocument();
  },
};

export const NavigationItems: Story = {
  name: "4画面へのリンクがある",
  decorators: [withWidth(WIDE_WIDTH_PX), withRoute("/weight")],
  play: async ({ canvasElement }) => {
    const navigation = within(within(canvasElement).getByRole("navigation"));

    for (const [label, path] of [
      ["体重", "/weight"],
      ["トレーニング", "/training"],
      ["歩数", "/steps"],
      ["食材", "/foods"],
    ]) {
      await expect(navigation.getByRole("link", { name: label })).toHaveAttribute("href", path);
    }
  },
};

export const CurrentPage: Story = {
  name: "表示中の画面の項目だけが現在のページとして伝わる",
  decorators: [withWidth(WIDE_WIDTH_PX), withRoute("/steps")],
  play: async ({ canvasElement }) => {
    const navigation = within(within(canvasElement).getByRole("navigation"));

    await expect(navigation.getByRole("link", { name: "歩数" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    for (const label of ["体重", "トレーニング", "食材"]) {
      await expect(navigation.getByRole("link", { name: label })).not.toHaveAttribute(
        "aria-current",
      );
    }
  },
};

export const CurrentPageIsNotColorOnly: Story = {
  name: "現在地は色以外の手がかり(太字と下線)でも判別できる",
  decorators: [withWidth(WIDE_WIDTH_PX), withRoute("/steps")],
  play: async ({ canvasElement }) => {
    const navigation = within(within(canvasElement).getByRole("navigation"));

    const current = getComputedStyle(navigation.getByRole("link", { name: "歩数" }));
    const other = getComputedStyle(navigation.getByRole("link", { name: "体重" }));

    // 色のみに依存しない(contracts/app-shell.md 3)。
    await expect(Number(current.fontWeight)).toBeGreaterThan(Number(other.fontWeight));
    await expect(current.borderBottomColor).not.toBe(other.borderBottomColor);
    await expect(Number.parseFloat(current.borderBottomWidth)).toBeGreaterThan(0);
  },
};

// 横並びを保つ最も狭い幅(切り替えの境界)で、4項目が収まることを確認する
// (FR-011 / SC-008。quickstart の手動シナリオを自動化、research.md #5)。
export const NarrowestHorizontalWidth: Story = {
  name: "横並びを保つ最小幅で4項目が横スクロールなしに収まる",
  decorators: [withWidth(theme.layout.navigationCollapse), withRoute("/weight")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = canvas.getByTestId(FRAME_TEST_ID);
    const header = canvas.getByRole("banner");
    const navigation = canvas.getByRole("navigation", { name: "主要メニュー" });

    // アプリ名と4項目が1行に収まり、横スクロールが出ないこと。
    await expect(header.scrollWidth).toBeLessThanOrEqual(frame.clientWidth);
    await expect(navigation.scrollWidth).toBeLessThanOrEqual(frame.clientWidth);
    // ヘッダーが本文の領域を圧迫しないこと(高さはトークンどおりの1行分)。
    await expect(header.getBoundingClientRect().height).toBe(theme.layout.headerHeight);
    // 最も長いラベルが折り返していないこと。文字の描画範囲が1つ(=1行)かどうかで判定する。
    const link = canvas.getByRole("link", { name: "トレーニング" });
    const labelRange = document.createRange();
    labelRange.selectNodeContents(link);
    await expect(labelRange.getClientRects().length).toBe(1);
  },
};

// 画面が狭いときはハンバーガーメニューに切り替える
// (デジタル庁デザインシステム「水平メニュー」の記載に沿う)。
const MOBILE_WIDTH_PX = 375;

export const MobileHamburger: Story = {
  name: "画面幅375pxではハンバーガーメニューに切り替わる",
  decorators: [withWidth(MOBILE_WIDTH_PX), withRoute("/steps")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 横並びの項目は見えず、開くためのボタンが見えている。
    await expect(canvas.getByRole("button", { name: "メニューを開く" })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "トレーニング" })).not.toBeInTheDocument();
    // ヘッダーの高さは横並びのときと同じ。
    await expect(canvas.getByRole("banner").getBoundingClientRect().height).toBe(
      theme.layout.headerHeight,
    );
  },
};

export const MobileHamburgerOpens: Story = {
  name: "ハンバーガーメニューを開くと4項目と現在地が分かる",
  decorators: [withWidth(MOBILE_WIDTH_PX), withRoute("/steps")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const openButton = canvas.getByRole("button", { name: "メニューを開く" });

    // 開閉の状態が支援技術に伝わること。
    await expect(openButton).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(openButton);
    await expect(openButton).toHaveAttribute("aria-expanded", "true");

    // メニューは画面(body)側に描画されるため、canvas ではなく document 全体から探す。
    const menu = within(await screen.findByRole("navigation", { name: "主要メニュー" }));
    for (const [label, path] of [
      ["体重", "/weight"],
      ["トレーニング", "/training"],
      ["歩数", "/steps"],
      ["食材", "/foods"],
    ]) {
      await expect(menu.getByRole("link", { name: label })).toHaveAttribute("href", path);
    }
    await expect(menu.getByRole("link", { name: "歩数" })).toHaveAttribute("aria-current", "page");
  },
};

export const MobileHamburgerClosesOnSelect: Story = {
  name: "ハンバーガーメニューの項目を選ぶと閉じる",
  decorators: [withWidth(MOBILE_WIDTH_PX), withRoute("/steps")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "メニューを開く" }));

    const menu = await screen.findByRole("navigation", { name: "主要メニュー" });
    await userEvent.click(within(menu).getByRole("link", { name: "食材" }));

    await waitFor(async () => {
      await expect(canvas.getByRole("button", { name: "メニューを開く" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });
  },
};

export const MobileHamburgerKeyboard: Story = {
  name: "キーボードだけでハンバーガーメニューを開いて項目に到達できる",
  decorators: [withWidth(MOBILE_WIDTH_PX), withRoute("/weight")],
  play: async ({ canvasElement }) => {
    const openButton = within(canvasElement).getByRole("button", { name: "メニューを開く" });

    await userEvent.tab();
    await expect(openButton).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    const menu = within(await screen.findByRole("navigation", { name: "主要メニュー" }));
    await userEvent.tab();
    await expect(menu.getByRole("link", { name: "体重" })).toHaveFocus();
    // Escape で閉じられること。
    await userEvent.keyboard("{Escape}");
    await waitFor(async () => {
      await expect(openButton).toHaveAttribute("aria-expanded", "false");
    });
  },
};

export const KeyboardNavigation: Story = {
  name: "Tabキーのみで4項目すべてに到達できる",
  decorators: [withWidth(WIDE_WIDTH_PX), withRoute("/weight")],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const labels = ["体重", "トレーニング", "歩数", "食材"];

    const reached: string[] = [];
    // ヘッダー内の要素を順に辿り、ナビゲーション項目に到達したものを記録する。
    for (let index = 0; index < 10 && reached.length < labels.length; index += 1) {
      await userEvent.tab();
      const active = document.activeElement;
      if (active && active.textContent && labels.includes(active.textContent)) {
        reached.push(active.textContent);
      }
    }

    await expect(reached).toEqual(labels);
    // フォーカスされた項目が見えていること(可視表示の前提)。
    await expect(canvas.getByRole("link", { name: "食材" })).toBeVisible();
  },
};
