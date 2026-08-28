/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// PWA対応はマニフェストとインストーラビリティの土台のみ整備する。
// オフラインでのデータ編集・同期はこのspecの範囲外(research.md #7)。
import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
let dirname: string;
if (typeof __dirname !== "undefined") {
  dirname = __dirname;
} else {
  dirname = path.dirname(fileURLToPath(import.meta.url));
}

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  // aria-query(CJS)がVitest browserモードの依存事前バンドル対象から漏れると
  // 名前付きexportが解決できずStorybook Interaction Testが起動できないため、
  // 明示的に含める。react-hook-form等も初回実行時に事前バンドルが走ると
  // テスト実行中にリロードが発生し不安定になるため、あわせて含めておく。
  optimizeDeps: {
    include: [
      "aria-query",
      "react-hook-form",
      "@hookform/resolvers/zod",
      "@mui/material",
      "@mui/material/styles",
      "zod",
    ],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "my-health-app",
        short_name: "health-app",
        start_url: "/",
        display: "standalone",
        theme_color: "#1976d2",
        background_color: "#ffffff",
      },
    }),
  ],
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
          }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: "chromium",
              },
            ],
          },
        },
      },
    ],
  },
});
