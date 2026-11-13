import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Every story is a browser test: it must render, its play function (if any) must pass, and axe must
// find no violation (`a11y.test: "error"` in .storybook/preview.tsx). The four projects run the whole
// set once per theme and type scale, through the same toolbar globals Storybook's switches set.
const matrix = [
  ["light", "web"],
  ["dark", "web"],
  ["light", "desktop"],
  ["dark", "desktop"],
] as const;

// Playwright downloads its own Chromium (`bunx playwright install chromium`). Set AVENUE_CHROMIUM to
// use a Chromium that is already installed instead.
const executablePath = process.env.AVENUE_CHROMIUM;

function uiSdkEntries() {
  const manifest = new URL("node_modules/@ui-sdk/react/package.json", import.meta.url);
  const { exports } = JSON.parse(readFileSync(manifest, "utf8")) as { exports: Record<string, unknown> };
  return Object.keys(exports)
    .filter((key) => key.startsWith("./") && !/\.[a-z]+$/.test(key))
    .map((key) => `@ui-sdk/react/${key.slice(2)}`);
}

// Pre-bundle every dependency the stories import, so Vite never discovers one mid-run and reloads the page under
// a running test ("Vite unexpectedly reloaded a test").
const prebundle = [
  "@ui-sdk/core/testing",
  // Every ui-sdk entry, read from its exports, so a component that starts using a new one can't miss this
  // list. Vite's "@ui-sdk/react/*" glob doesn't read package exports, so it can't be used here.
  ...uiSdkEntries(),
  "class-variance-authority",
  "cn/config",
  "lucide-react",
  "react",
  "react-dom",
  "react/jsx-dev-runtime",
  "storybook/test",
];

export default defineConfig({
  optimizeDeps: { include: prebundle },
  test: {
    projects: matrix.map(([theme, typeScale]) => ({
      extends: true,
      plugins: [storybookTest({ configDir: ".storybook", initialGlobals: { theme, typeScale } })],
      test: {
        name: `${theme}-${typeScale}`,
        browser: {
          enabled: true,
          headless: true,
          provider: playwright(executablePath ? { launchOptions: { executablePath } } : {}),
          instances: [{ browser: "chromium" as const }],
        },
      },
    })),
  },
});
