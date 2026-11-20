/**
 * Avenue's one class rule oxlint-tailwindcss can't express (AVE-171): `hit-area` and an `after:` utility in the same
 * class string. hit-area owns the control's ::after (AVE-22), so an after: utility beside it fights it. The plugin's
 * no-restricted-classes tests one class at a time and no-conflicting-classes doesn't see into a custom @utility's
 * ::after, so this pairs the two itself, in every string and template literal, as check:classes did.
 *
 * Plain JavaScript: an app loads it from node_modules, where Node won't strip types.
 */

/** A class whose last segment is `hit-area` (`hit-area`, `[a]:hit-area`), not `hit-area-x`. */
const HIT_AREA = /(?:^|:)hit-area!?$/;

/** A utility under the `after:` variant (`after:inset-0`, `data-[side=top]:after:h-24`), not the word `after:` in prose. */
function isAfterUtility(/** @type {string} */ c) {
  const parts = c.split(":");
  return parts.at(-1) !== "" && parts.slice(0, -1).includes("after");
}

/** @param {string} text */
function pairsHitAreaWithAfter(text) {
  const classes = text.split(/\s+/);
  return classes.some((c) => HIT_AREA.test(c)) && classes.some(isAfterUtility);
}

const hitAreaAfter = {
  meta: {
    type: "problem",
    docs: { description: "Disallow an after: utility beside hit-area, which owns the control's ::after (AVE-22)." },
    messages: {
      pair: "hit-area owns the control's ::after: decorate the control with before: or a child element (AVE-22).",
    },
  },
  /** @param {any} context */
  create(context) {
    /** @param {any} node @param {string | null | undefined} text */
    const check = (node, text) => {
      if (typeof text === "string" && pairsHitAreaWithAfter(text)) context.report({ node, messageId: "pair" });
    };
    return {
      /** @param {any} node */
      Literal(node) {
        if (!node.regex) check(node, typeof node.value === "string" ? node.value : null);
      },
      /** @param {any} node */
      TemplateElement(node) {
        check(node, node.value.cooked);
      },
    };
  },
};

export default { meta: { name: "avenue" }, rules: { "hit-area-after": hitAreaAfter } };
