import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
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

export default defineConfig({
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
