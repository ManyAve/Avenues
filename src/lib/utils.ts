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
  "web-card",
  "web-section",
  "web-hero",
  "web-hero-narrow",
  "web-glyph",
] as const;

/**
 * Joins class names and resolves Tailwind conflicts. It knows Avenue's text scale:
 * the text-* steps (meta … display, web-*) are font sizes, so they don't drop beside a text colour, and the spacing
 * aliases (inset, group, row-y, control-* …) are spacing, so `p-0` passed in replaces a part's own `p-inset` (AVE-9).
 */
export const cn = createCn({
  extend: {
    theme: { spacing: [...SPACING_NAMES] },
    classGroups: {
      "font-size": [{ text: [...TEXT_SIZE_NAMES] }],
    },
  },
});
