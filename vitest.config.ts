import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Every story is a browser test: it must render, its play function (if any) must pass, and axe must
// find no violation (`a11y.test: "error"` in .storybook/preview.tsx). The four projects run the whole
// set once per theme and type scale, through the same toolbar globals Storybook's switches set.
//
// The fifth project, `touch`, runs the light web set again as a phone: Playwright's hasTouch makes
// `(pointer: coarse)` match, and the `pointer` global turns on the 44px touch-target measure after each story
// (AVE-22, src/checks/touch-targets.ts).
const matrix = [
  ["light", "web", "fine"],
  ["dark", "web", "fine"],
  ["light", "desktop", "fine"],
  ["dark", "desktop", "fine"],
  ["light", "web", "coarse"],
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
  // Bare @ui-sdk/core holds definePrimitive and the behaviors Avenue's own primitives use (the Register's grid
  // focus); left out, a cold cache reloaded the page mid-run (AVE-80).
  "@ui-sdk/core",
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
    projects: matrix.map(([theme, typeScale, pointer]) => ({
      extends: true,
      plugins: [
        storybookTest({
          configDir: ".storybook",
          // The touch project is also phone-sized: Storybook's viewport "phone", 390 x 844 (.storybook/preview.tsx).
          initialGlobals: { theme, typeScale, pointer, ...(pointer === "coarse" ? { viewport: { value: "phone" } } : {}) },
        }),
      ],
      test: {
        // A toast with an action stays 10s (AVE-41), and its stories wait it out in real time: storybook/test has
        // no fake timers that reach ui-sdk's toaster. Vitest's browser default of 15s is too short for that.
        testTimeout: 30_000,
        name: pointer === "coarse" ? "touch" : `${theme}-${typeScale}`,
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({
            ...(executablePath ? { launchOptions: { executablePath } } : {}),
            ...(pointer === "coarse" ? { contextOptions: { hasTouch: true } } : {}),
          }),
          instances: [{ browser: "chromium" as const }],
        },
      },
    })),
  },
});
