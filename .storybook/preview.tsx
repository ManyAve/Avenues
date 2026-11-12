// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="./css.d.ts" />
import type { Preview } from "@storybook/react-vite";
import "../src/styles/avenue.css";
import desktopCss from "../src/styles/desktop.css?inline";
import { TooltipProvider } from "#avenue/components/tooltip";

// Story tests (vitest.config.ts) run every story once per theme and set VITE_AVENUE_THEME for each run.
const testTheme = import.meta.env.VITE_AVENUE_THEME;

// Under test (Playwright sets navigator.webdriver), skip enter and exit animations, so a popup that is open is
// visible at once instead of fading in from opacity 0 while a play function or axe checks it. Storybook keeps them.
if (typeof navigator !== "undefined" && navigator.webdriver) {
  const still = document.createElement("style");
  still.textContent =
    "*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }";
  document.head.append(still);
}

// Avenue's dark theme is the `.dark` class on <html>, as in the ManyAve app; the toolbar switch flips it.
// The type-scale switch loads desktop.css, the opt-in desktop type scale, the way the desktop app does.
function setDesktopScale(on: boolean) {
  const existing = document.getElementById("avenue-desktop-scale");
  if (on && !existing) {
    const style = document.createElement("style");
    style.id = "avenue-desktop-scale";
    style.textContent = desktopCss;
    document.head.append(style);
  } else if (!on && existing) {
    existing.remove();
  }
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Color scheme",
      toolbar: { icon: "mirror", items: ["light", "dark"], dynamicTitle: true },
    },
    typeScale: {
      description: "Type scale",
      toolbar: { icon: "paragraph", items: ["web", "desktop"], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: testTheme ?? "light", typeScale: "web" },
  decorators: [
    (Story, { globals }) => {
      document.documentElement.classList.toggle("dark", globals.theme === "dark");
      setDesktopScale(globals.typeScale === "desktop");
      return (
        <TooltipProvider>
          <Story />
        </TooltipProvider>
      );
    },
  ],
  parameters: {
    // The page background comes from Avenue's own tokens, not Storybook's backgrounds tool.
    backgrounds: { disable: true },
    // axe fails a story test on any violation (`bun run test:stories`), in both themes.
    a11y: { test: "error" },
    options: {
      storySort: { order: ["Introduction", "Tokens", "Foundations", "Components", "Composites"] },
    },
  },
};

export default preview;
