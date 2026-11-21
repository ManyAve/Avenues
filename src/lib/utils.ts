import { createCn } from "cn/config";

/**
 * Avenue's own spacing and text-size names (src/styles). `cn` must know each one, or it can't resolve a conflict:
 * an unknown `text-web-card` reads as a colour and drops beside `text-muted-foreground`, and an unknown
 * `h-control-sm` stays beside a passed `h-8`. scripts/cn-tokens.test.ts fails when a token is missing here.
 */
export const SPACING_NAMES = [
  "inline",
  "group",
  "row-y",
  "inset",
  "page",
  "section",
  "controls",
  "control-xs",
  "control-sm",
  "control-md",
  "control-lg",
] as const;
export const TEXT_SIZE_NAMES = [
  "meta",
  "compact",
  "control",
  "post",
  "title",
  "heading",
  "display",
  "hero",
  "web-card",
  "web-section",
  "web-hero",
  "web-hero-narrow",
  "web-glyph",
  // A utility (avenue.css), not a --text token: the field text size, AVE-53.
  "field",
] as const;
/** Avenue's font weights, durations and layers (avenue.css, AVE-182), beside Tailwind's own. */
export const FONT_WEIGHT_NAMES = ["quiet", "emphasis", "heading"] as const;
export const DURATION_NAMES = ["fast", "moderate", "slow"] as const;
/** Avenue's two easings (avenue.css, AVE-212): ease-fade for colour, ease-move for movement. */
export const EASE_NAMES = ["fade", "move"] as const;
export const Z_INDEX_NAMES = ["sticky-group", "sticky", "sticky-bar", "dock", "overlay", "toast"] as const;

/**
 * Joins class names and resolves Tailwind conflicts. It knows Avenue's text scale:
 * the text-* steps (meta … display, web-*) are font sizes, so they don't drop beside a text colour, and the spacing
 * aliases (inset, group, row-y, control-* …) are spacing, so `p-0` passed in replaces a part's own `p-inset` (AVE-9).
 * The weight, duration, easing and layer names are those, so `font-emphasis` gives way to `font-medium`, not to `font-mono`.
 */
export const cn = createCn({
  extend: {
    theme: { spacing: [...SPACING_NAMES], "font-weight": [...FONT_WEIGHT_NAMES] },
    classGroups: {
      "font-size": [{ text: [...TEXT_SIZE_NAMES] }],
      duration: [{ duration: [...DURATION_NAMES] }],
      ease: [{ ease: [...EASE_NAMES] }],
      // The `press` utility (avenue.css, AVE-212) is a control's transition, so a `transition-colors` passed in
      // replaces it and turns the press off.
      transition: ["press"],
      z: [{ z: [...Z_INDEX_NAMES] }],
      // The `chosen` utility (avenue.css, AVE-50) sets the border, fill and text colours, so a later `chosen`
      // replaces an earlier `bg-muted` under the same variant, as `bg-primary-subtle` did.
      chosen: ["chosen"],
    },
    conflictingClassGroups: { chosen: ["bg-color", "border-color", "text-color"] },
  },
});
