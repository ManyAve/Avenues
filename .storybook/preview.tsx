// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="./css.d.ts" />
import type { Preview } from "@storybook/react-vite";
import "../src/styles/avenue.css";
import desktopCss from "../src/styles/desktop.css?inline";
import { AXE_TAGS, a11yGuardProblems } from "./a11y-guard";

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
  initialGlobals: { theme: "light", typeScale: "web" },
  beforeEach: ({ parameters, globals, title, name }) => {
    const problems = a11yGuardProblems(parameters, globals);
    if (problems.length > 0) throw new Error(`${title} / ${name} weakens the accessibility check:\n- ${problems.join("\n- ")}`);
  },
  decorators: [
    (Story, { globals }) => {
      document.documentElement.classList.toggle("dark", globals.theme === "dark");
      setDesktopScale(globals.typeScale === "desktop");
      return <Story />;
    },
  ],
  parameters: {
    // The page background comes from Avenue's own tokens, not Storybook's backgrounds tool.
    backgrounds: { disable: true },
    // axe runs on every story in `bun run test:stories`, and any violation fails it: WCAG 2.2 AA plus
    // axe's best practices. The beforeEach below fails a story that weakens this; see a11y-guard.ts for
    // the one allowed exception (a rule turned off with a written reason).
    a11y: { test: "error", options: { runOnly: AXE_TAGS } },
    options: {
      storySort: { order: ["Introduction", "Tokens", "Foundations", "Components", "Composites"] },
    },
  },
};

export default preview;
