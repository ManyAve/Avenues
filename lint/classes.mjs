/**
 * Avenue's class rules as an oxlint config (AVE-171), for an app's `extends` and for Avenue's own oxlint.config.ts.
 * oxlint-tailwindcss reads the app's real Tailwind build, so:
 *
 * - retired corners (rounded-2xl, rounded-3xl, rounded-4xl and their side forms), typos and missing tokens fail
 *   `tailwindcss/no-unknown-classes`: Avenue's theme clears them, so they make no CSS (AVE-2);
 * - off-grid spacing and literal breakpoints fail `tailwindcss/no-restricted-classes`, with the fix in the message
 *   (AVE-2, AVE-79, AVE-85);
 * - `hit-area` beside an `after:` utility fails `avenue/hit-area-after` (./hit-area-plugin.mjs, AVE-22).
 *
 * oxlint never takes `settings` from an extended config, so the app names its own Tailwind entry (the CSS that
 * imports `@manyave/avenue/styles.css`) in `settings.tailwindcss.entryPoint` (ADOPTING.md).
 *
 * Plain JavaScript: an app loads it from node_modules, where Node won't strip types.
 */
import { fileURLToPath } from "node:url";
import { tailwindcss } from "oxlint-tailwindcss/config";

/** Padding, margin, gap, space-between, inset and scroll spacing. Sizing (w-, h-, size-) is not spacing: a 14px icon is fine. */
const SPACING =
  "-?(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left|start|end|scroll-[mp][xytrblse]?)";

/**
 * Each pattern is tested against one whole class, variants included (`sm:px-2.5`).
 * @type {{ pattern: string; message: string }[]}
 */
export const restrictedClassPatterns = [
  {
    // Every fractional step but the 2px hairline (*-0.5): the quarter steps (AVE-79) and the half steps from 6px up.
    pattern: `(?:^|:)${SPACING}-(?:\\d+\\.(?:25|75)|[1-9]\\d*\\.5)!?$`,
    message:
      "off-grid spacing. Use a 4px step (1.5 -> 2, 2.5 -> 2 inside a control or 3 between blocks, 3.5 -> 4; 1.25 -> 1, 1.75 and 2.25 -> 2) or an alias (AVE-2).",
  },
  {
    // The app's breakpoints are tokens (--breakpoint-phone, --breakpoint-wide in avenue.css).
    pattern: "(?:^|:)(?:max|min)-\\[\\d+(?:\\.\\d+)?(?:px|rem|em)\\]:",
    message:
      "a literal breakpoint. Use a named one: max-phone: (below 700px), desktop: (900px up), wide: (1100px up), max-wide: (below 1100px) (AVE-85).",
  },
];

/**
 * Avenue's class rules: oxlint-tailwindcss plus Avenue's hit-area rule, without the plugin's other recommended rules.
 * @returns {import("oxlint").OxlintConfig}
 */
export function avenueClasses() {
  const plugin = tailwindcss({ recommended: false });
  return {
    // No built-in plugins: an extended config without `plugins` brings oxlint's defaults (unicorn among them) along.
    plugins: [],
    jsPlugins: [...(plugin.jsPlugins ?? []), fileURLToPath(new URL("./hit-area-plugin.mjs", import.meta.url))],
    rules: {
      "tailwindcss/no-unknown-classes": "error",
      "tailwindcss/no-restricted-classes": ["error", { patterns: restrictedClassPatterns }],
      "avenue/hit-area-after": "error",
    },
  };
}

export default avenueClasses;
