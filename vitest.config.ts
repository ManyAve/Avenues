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

// Pre-bundle every dependency the stories import, so Vite never discovers one mid-run and reloads the page under
// a running test ("Vite unexpectedly reloaded a test").
const prebundle = [
  "@base-ui/react/**",
  "@ui-sdk/react/avatar",
  "@ui-sdk/react/button",
  "@ui-sdk/react/checkbox",
  "@ui-sdk/react/dialog",
  "@ui-sdk/react/field",
  "@ui-sdk/react/hover-card",
  "@ui-sdk/react/input",
  "@ui-sdk/react/menu",
  "@ui-sdk/react/popover",
  "@ui-sdk/react/primitive",
  "@ui-sdk/react/segmented-control",
  "@ui-sdk/react/switch",
  "@ui-sdk/react/textarea",
  "@ui-sdk/react/toggle",
  "@ui-sdk/react/tooltip",
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
