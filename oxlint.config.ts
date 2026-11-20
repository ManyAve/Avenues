import { defineConfig } from "oxlint";
// By package name, the way an app imports it, so the typecheck proves the `./oxlint` export carries its types (AVE-181).
import { avenueClasses } from "@manyave/avenue/oxlint";

const uiSdkRootImport = {
  name: "@ui-sdk/react",
  message: "ui-sdk has no root import: import each component from its own entry, like @ui-sdk/react/select (AGENTS.md).",
};
const uiSdkInternals = {
  group: ["@ui-sdk/core/internal", "@ui-sdk/core/internal/*"],
  message: "Never import ui-sdk's internals (AGENTS.md).",
};
const agentBridge = "Avenue never creates the agent bridge; only stories may (AGENTS.md, practice 9).";

export default defineConfig({
  // Avenue's class rules, the same config apps extend (lint/classes.mjs, ADOPTING.md; AVE-171).
  extends: [avenueClasses()],
  plugins: ["typescript", "react", "jsx-a11y", "import"],
  categories: {
    correctness: "error",
    suspicious: "warn",
  },
  settings: {
    tailwindcss: { entryPoint: "src/styles/avenue.css" },
  },
  rules: {
    "react/react-in-jsx-scope": "off",
    "import/no-unassigned-import": ["warn", { allow: ["**/*.css"] }],
    "no-restricted-imports": ["error", { paths: [uiSdkRootImport], patterns: [uiSdkInternals] }],
    // oxlint-tailwindcss's correctness rules beyond Avenue's class rules: Avenue's own source passes them.
    "tailwindcss/no-conflicting-classes": "error",
    "tailwindcss/no-contradicting-variants": "error",
    "tailwindcss/no-dark-without-light": "error",
    "tailwindcss/no-deprecated-classes": "error",
    "tailwindcss/no-duplicate-classes": "error",
    "tailwindcss/no-dynamic-classes": "error",
  },
  ignorePatterns: ["storybook-static", "node_modules"],
  overrides: [
    {
      files: ["src/components/**", "src/lib/**", "src/hooks/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [
              uiSdkRootImport,
              { name: "@ui-sdk/react/agent", message: agentBridge },
              { name: "@ui-sdk/core/agent", message: agentBridge },
            ],
            patterns: [uiSdkInternals],
          },
        ],
      },
    },
  ],
});
