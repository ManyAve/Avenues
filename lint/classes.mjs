/**
 * Avenue's class rules as an oxlint config (AVE-171), for an app's `extends` and for Avenue's own oxlint.config.ts.
 * oxlint-tailwindcss reads the app's real Tailwind build, so:
 *
 * - retired corners (rounded-2xl, rounded-3xl, rounded-4xl and their side forms), typos and missing tokens fail
 *   `tailwindcss/no-unknown-classes`: Avenue's theme clears them, so they make no CSS (AVE-2);
 * - off-grid spacing, literal breakpoints, and raw type sizes, weights, shadows, layers and durations fail
 *   `tailwindcss/no-restricted-classes`, with the fix in the message (AVE-2, AVE-79, AVE-85, AVE-184);
 * - a colour typed into a class fails `tailwindcss/no-hardcoded-colors`; an arbitrary value a named class already
 *   draws fails `tailwindcss/no-unnecessary-arbitrary-value`; a literal equal to a theme token or a whole 4px step
 *   fails `tailwindcss/prefer-scale-token`; `bg-(--card)` where `bg-card` exists fails `tailwindcss/prefer-theme-tokens`
 *   (AVE-184);
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
 * Off-grid spacing and literal breakpoints (AVE-2, AVE-79, AVE-85). Each pattern is tested against one whole class,
 * variants included (`sm:px-2.5`).
 * @type {{ pattern: string; message: string }[]}
 */
export const gridClassPatterns = [
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
 * Raw type sizes, weights, Tailwind's shadows, page layers and durations, where Avenue has a named step (AVE-184).
 * An app that hasn't moved its screens yet can keep only `gridClassPatterns` for those folders (ADOPTING.md).
 * @type {{ pattern: string; message: string }[]}
 */
export const scaleClassPatterns = [
  {
    // Type sizes come from the scale (tokens.css): a size typed in skips it, and 11px to 13px break the 14px floor.
    pattern: "(?:^|:)text-\\[\\d*\\.?\\d+(?:px|rem|em)\\](?:/\\S+)?!?$",
    message:
      "a literal type size. Use a step: text-meta (14px), text-control (14px in controls), text-compact (16px), text-post (18px), text-title (20px), text-heading (24px), text-display (32px). Nothing goes under 14px (AVE-184).",
  },
  {
    // Tailwind's sizes past text-base aren't Avenue's steps, even where one matches a step's size today (text-lg, text-post).
    pattern: "(?:^|:)text-(?:lg|[2-9]?xl)(?:/\\S+)?!?$",
    message:
      "a Tailwind type size outside Avenue's scale. Use text-post (18px), text-title (20px), text-heading (24px) or text-display (32px) (AVE-184).",
  },
  {
    pattern: "(?:^|:)font-\\[\\d+\\]!?$",
    message:
      "a literal font weight. Use font-normal (400), font-quiet (450), font-medium (500), font-emphasis (550), font-semibold (600) or font-heading (620); a weight used in one place only keeps its literal with a disable comment that says why (AVE-182, AVE-184).",
  },
  {
    // shadow-2xs to shadow-2xl and bare `shadow`; shadow-none and Avenue's three named shadows pass.
    pattern: "(?:^|:)shadow(?:-(?:2xs|xs|sm|md|lg|xl|2xl))?!?$",
    message:
      "one of Tailwind's own shadows. Use Avenue's: shadow-control (a field or button), shadow-card (a card), shadow-popover (anything that floats: menus, popovers, dialogs, toasts) (Foundations/Elevation, AVE-184).",
  },
  {
    // Page-level layers have names; a small local order inside one component (z-1, focus:z-10) keeps a bare number
    // under 20, under `isolate` (AVE-182).
    pattern: "(?:^|:)-?z-(?:\\[[^\\]]+\\]|[2-9]\\d|\\d{3,})!?$",
    message:
      "a literal layer. Use z-sticky-group (5), z-sticky (10), z-dock (40), z-overlay (50) or z-toast (70); a local order inside one component is a bare number under 20 (-z-1, z-10) under `isolate` (AVE-182, AVE-184).",
  },
  {
    pattern: "(?:^|:)duration-(?:\\d+|\\[[^\\]]+\\])!?$",
    message:
      "a literal duration. Use duration-fast (100ms, an overlay opening), duration-moderate (150ms, a change in place) or duration-slow (200ms, the ceiling) (Foundations/Motion, AVE-182, AVE-184).",
  },
];

/** Every pattern `tailwindcss/no-restricted-classes` rejects in Avenue's class rules. */
export const restrictedClassPatterns = [...gridClassPatterns, ...scaleClassPatterns];

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
      "tailwindcss/no-hardcoded-colors": "error",
      "tailwindcss/no-unnecessary-arbitrary-value": "error",
      // Whole steps only: `w-[390px]` (a phone) stays a literal rather than `w-97.5`, and an off-grid `px-[14px]`
      // is left to the spacing pattern above, which says what to use.
      "tailwindcss/prefer-scale-token": ["error", { step: 1 }],
      "tailwindcss/prefer-theme-tokens": "error",
      "tailwindcss/no-restricted-classes": ["error", { patterns: restrictedClassPatterns }],
      "avenue/hit-area-after": "error",
    },
  };
}

export default avenueClasses;
