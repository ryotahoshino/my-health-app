import type { StorybookConfig } from "@storybook/react-vite";

import { dirname } from "path";

import { fileURLToPath } from "url";

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
const getAbsolutePath = (value: string) => {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
};
const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    getAbsolutePath("@storybook/addon-vitest"),
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-docs"),
  ],
  framework: getAbsolutePath("@storybook/react-vite"),
  // vite.config.ts の vite-plugin-pwa はアプリ本体のビルド専用。
  // Storybookのビルドにも巻き込まれるとPWAのプリキャッシュサイズ上限に
  // 引っかかって失敗するため、Storybookのビルドからは除外する。
  async viteFinal(viteConfig) {
    // VitePWA()は複数プラグインの配列を返すため、フィルタ前に1段階フラット化する
    const flatPlugins = (viteConfig.plugins ?? []).flatMap((plugin) => {
      if (Array.isArray(plugin)) {
        return plugin;
      }
      return [plugin];
    });
    return {
      ...viteConfig,
      plugins: flatPlugins.filter((plugin) => {
        let name: unknown;
        if (plugin && typeof plugin === "object" && "name" in plugin) {
          name = plugin.name;
        } else {
          name = undefined;
        }
        return typeof name !== "string" || !name.startsWith("vite-plugin-pwa");
      }),
    };
  },
};
export default config;
