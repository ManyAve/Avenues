import { createCn } from "cn/config";

/**
 * Joins class names and resolves Tailwind conflicts. It knows Avenue's text scale:
 * the text-* steps (meta … display) are font sizes, so they don't drop beside a text colour, and the spacing
 * aliases (inset, group, row-y …) are spacing, so `p-0` passed in replaces a part's own `p-inset` (AVE-9).
 */
export const cn = createCn({
  extend: {
    theme: { spacing: ["inline", "group", "row-y", "inset", "page", "section"] },
    classGroups: {
      "font-size": [
        { text: ["meta", "compact", "control", "post", "title", "heading", "display"] },
      ],
    },
  },
});
