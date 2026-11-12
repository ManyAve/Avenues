import path from "node:path";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Story tests: every story renders in real Chromium, its play function runs, and axe checks it
// (a11y.test is "error" in .storybook/preview.tsx). Each story runs twice, once per theme, so
// contrast and focus rings are checked in light and dark.
// AVENUE_CHROMIUM points at a Chromium binary when Playwright's own download isn't installed.
const configDir = path.join(import.meta.dirname, ".storybook");
const executablePath = process.env.AVENUE_CHROMIUM;

function storiesIn(theme: "light" | "dark") {
  return {
    extends: true,
    plugins: [storybookTest({ configDir })],
    define: { "import.meta.env.VITE_AVENUE_THEME": JSON.stringify(theme) },
    test: {
      name: `stories-${theme}`,
      browser: {
        enabled: true,
        headless: true,
        provider: playwright({ launchOptions: executablePath ? { executablePath } : {} }),
        instances: [{ browser: "chromium" as const }],
      },
    },
  };
}

export default defineConfig({
  test: { projects: [storiesIn("light"), storiesIn("dark")] },
});
