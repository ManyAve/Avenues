import { createCn } from "cn/config";

/**
 * Joins class names and resolves Tailwind conflicts. It knows Avenue's text scale:
 * the text-* steps (meta … display) are font sizes, so they don't drop beside a text colour.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["meta", "compact", "control", "post", "title", "heading", "display"] },
      ],
    },
  },
});
