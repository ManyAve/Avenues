/**
 * How each Avenue component's accessibility is proven in the story tests (AVE-18). Every file in
 * src/components must be listed, as one of three kinds, and `check:story-coverage` enforces the tag:
 *
 * - `{ pattern, why }`: the component is a primitive Avenue builds, or it changes the keys, roles or ARIA
 *   of a ui-sdk part. A story in its own stories file is tagged `pattern:<pattern>`, and the story tests
 *   run `checkPattern` from `@ui-sdk/core/testing` on it after `play`.
 * - `{ upstream }`: a ui-sdk component Avenue styles and wires without changing its behavior. ui-sdk's
 *   testing guide says its components are tested already, so don't run `checkPattern` on them; test what
 *   Avenue wired instead, plus the agent test. A story in its own stories file is tagged `agent`, and the
 *   story tests take a `createAgent` snapshot after `play` and fail on an empty one or an unnamed control.
 * - `{ none }`: plain markup with no behavior to check, with the reason.
 *
 * Rule from the Architect on AVE-18 (2026-11-12), following ui-sdk's own testing guide. When a pattern
 * and an older story assertion disagree, the pattern wins and the UX Engineer signs off on the card.
 */
import type { Pattern as KitPattern } from "@ui-sdk/core/testing";

export const PATTERNS = [
  "accordion",
  "alertdialog",
  "checkbox",
  "combobox",
  "dialog",
  "disclosure",
  "listbox",
  "menu",
  "menubar",
  "radio-group",
  "slider",
  "switch",
  "tabs",
  "toolbar",
  "tree",
] as const satisfies readonly KitPattern[];
export type Pattern = (typeof PATTERNS)[number];

// Tied to the testing kit's own type in both directions, so a ui-sdk upgrade that adds, renames or drops
// a pattern fails typecheck instead of drifting: the line above rejects a name the kit doesn't know, and
// this one rejects a kit pattern missing from the list.
type MissingFromList = Exclude<KitPattern, Pattern>;
export const listCoversKit: [MissingFromList] extends [never] ? true : MissingFromList = true;

export type Proof =
  | { pattern: Pattern; why: string }
  | { upstream: string; note?: string }
  | { none: string };

export const COMPONENT_PROOF: Record<string, Proof> = {
  // Changes a ui-sdk part's behavior: checkPattern.
  combobox: {
    pattern: "combobox",
    why: "Changes keys: leaving the field with half-typed text restores the last choice.",
  },

  // ui-sdk components, styled and wired: wiring tests plus the agent test.
  button: {
    upstream: "button",
    note: "disabledReason keeps a disabled button focusable and describes it; the testing kit has no button pattern, so the Button stories test that wiring.",
  },
  select: {
    upstream: "select",
    note: "Documented deviation (UX Engineer, AVE-17): ui-sdk's Select moves focus into the list, which its own combobox check rejects. Avenue ships it as is; revisit when ui-sdk leaves beta.",
  },
  dialog: { upstream: "dialog" },
  "alert-dialog": { upstream: "alert-dialog" },
  "dropdown-menu": { upstream: "trigger-menu" },
  popover: { upstream: "popover" },
  tooltip: { upstream: "tooltip" },
  "hover-card": { upstream: "hover-card" },
  checkbox: { upstream: "checkbox" },
  switch: { upstream: "switch" },
  toggle: { upstream: "toggle" },
  "toggle-group": { upstream: "segmented-control", note: "UX Engineer, AVE-17: the radio-group pattern." },
  disclosure: { upstream: "collapsible" },
  accordion: { upstream: "accordion" },
  tabs: { upstream: "tabs" },
  "radio-group": { upstream: "radio" },
  slider: { upstream: "slider" },
  input: { upstream: "input" },
  textarea: { upstream: "textarea" },
  field: { upstream: "field" },
  avatar: { upstream: "avatar" },

  // Plain markup.
  card: { none: "Layout only." },
  table: { none: "A static data table, not an interactive grid." },
  badge: { none: "Static text." },
  "inline-message": {
    none: "A live region; its announcements are covered by the Inline message stories.",
  },
};

/** The tag a component's story must carry, or undefined when none is needed. */
export function requiredTag(proof: Proof): string | undefined {
  if ("pattern" in proof) return `pattern:${proof.pattern}`;
  if ("upstream" in proof) return "agent";
  return undefined;
}

/** `Select.stories.tsx` -> `select`, `DropdownMenu.stories.tsx` -> `dropdown-menu`. */
export function componentForStoryFile(importPath: string): string | undefined {
  const match = /([A-Za-z0-9]+)\.stories\.[jt]sx?$/.exec(importPath);
  if (!match) return undefined;
  return match[1]!.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
