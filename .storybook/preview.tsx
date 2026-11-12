// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference path="./css.d.ts" />
import type { Preview } from "@storybook/react-vite";
import "../src/styles/avenue.css";

// Avenue's dark theme is the `.dark` class on <html>, as in the ManyAve app; the toolbar switch flips it.
const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Color scheme",
      toolbar: { icon: "mirror", items: ["light", "dark"], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, { globals }) => {
      document.documentElement.classList.toggle("dark", globals.theme === "dark");
      return <Story />;
    },
  ],
  parameters: {
    // The page background comes from Avenue's own tokens, not Storybook's backgrounds tool.
    backgrounds: { disable: true },
    a11y: { test: "todo" },
    options: {
      storySort: { order: ["Introduction", "Tokens", "Foundations", "Components", "Composites"] },
    },
  },
};

export default preview;
