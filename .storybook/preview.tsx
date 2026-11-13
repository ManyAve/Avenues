// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="./css.d.ts" />
import type { Preview } from "@storybook/react-vite";
import "../src/styles/avenue.css";
import desktopCss from "../src/styles/desktop.css?inline";
import { AXE_TAGS, a11yGuardProblems } from "./a11y-guard";
import { runAccessibilityChecks } from "./pattern-check";
import { runTouchTargetCheck } from "./touch-targets";
import { runViewportCheck } from "./viewport-check";

// ui-sdk's development warnings (a missing name, a part outside its root, ...) throw instead of logging,
// so a story that misuses ui-sdk fails the story tests (the ui-sdk skill, references/testing.md).
Object.assign(globalThis, { ["__UI_SDK_STRICT__"]: true });

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
  initialGlobals: { theme: "light", typeScale: "web" },
  beforeEach: ({ parameters, globals, title, name }) => {
    const problems = a11yGuardProblems(parameters, globals);
    if (problems.length > 0) throw new Error(`${title} / ${name} weakens the accessibility check:\n- ${problems.join("\n- ")}`);
  },
  // After the play function: ui-sdk's pattern check for stories tagged `pattern:<name>`, and the agent
  // test for stories tagged `agent` (AVE-18, .storybook/pattern-check.ts).
  // Then a story that asked for a viewport (the 390px phone) must have run at that width (.storybook/viewport-check.ts),
  // and the target-size measure (AVE-22, .storybook/touch-targets.ts): mouse minimums in the four fine-pointer
  // projects, the 44px hit test in the `touch` project (globals.pointer, vitest.config.ts).
  afterEach: async ({ tags, parameters, globals, title }) => {
    await runAccessibilityChecks(tags, parameters["patternRoot"]);
    runViewportCheck(globals, parameters);
    runTouchTargetCheck(globals["pointer"], title);
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
    // A 390px phone, for stories that must be seen at phone width (AVE-23). A story picks it with
    // `globals: { viewport: { value: "phone" } }`; the story tests then run that story at 390 x 844,
    // and the `touch` project runs every story there to measure touch targets (AVE-22).
    viewport: {
      options: { phone: { name: "Phone (390px)", styles: { width: "390px", height: "844px" }, type: "mobile" } },
    },
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
