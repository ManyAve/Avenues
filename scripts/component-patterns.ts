/**
 * Which ui-sdk accessibility pattern each Avenue component must pass (AVE-18). Every file in
 * src/components must be listed: a pattern name, or `null` with the reason no pattern applies. A new
 * component that isn't listed fails `check:story-coverage`, so the decision is made on purpose.
 *
 * The pattern names are the ones `checkPattern` from `@ui-sdk/core/testing` accepts. A component with a
 * pattern needs at least one story tagged `pattern:<name>`; the story tests then run the check on it.
 * When the pattern and an older story assertion disagree, the pattern wins and the UX Engineer signs off
 * the changed assertion on the card (decided 2026-11-12, AVE-17).
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

type NoPattern = { none: string };

export const COMPONENT_PATTERNS: Record<string, Pattern | NoPattern> = {
  // Popups and pickers
  select: "combobox", // select-only combobox (ui-sdk select)
  combobox: "combobox",
  "dropdown-menu": "menu",
  dialog: "dialog",
  "alert-dialog": "alertdialog",
  popover: "dialog", // ui-sdk popover follows the (non-modal) dialog pattern
  // Controls
  checkbox: "checkbox",
  switch: "switch",
  disclosure: "disclosure",
  accordion: "accordion",
  tabs: "tabs",
  "radio-group": "radio-group",
  "segmented-control": "radio-group",
  slider: "slider",
  "toggle-group": "radio-group", // UX Engineer, AVE-17: follows ui-sdk segmented-control (radio group)
  toolbar: "toolbar",
  listbox: "listbox",
  tree: "tree",
  menubar: "menubar",
  // No matching pattern in the testing kit; their behavior is covered by story tests.
  tooltip: { none: "The testing kit has no tooltip pattern; focus and Esc are covered by the Tooltip stories." },
  "hover-card": { none: "No APG pattern; the stories prove the same content is reachable without hover." },
  button: { none: "A native button; no composite keyboard pattern." },
  toggle: { none: "A single toggle button (aria-pressed); no composite keyboard pattern." },
  input: { none: "A native text input." },
  textarea: { none: "A native textarea." },
  field: { none: "Labelling and error wiring, covered by the Field stories." },
  card: { none: "Layout only." },
  table: { none: "A static data table, not an interactive grid." },
  avatar: { none: "An image with a text fallback." },
  badge: { none: "Static text." },
  "inline-message": { none: "A live region; its announcements are covered by the Inline message stories." },
};

/** `Select.stories.tsx` -> `select`, `DropdownMenu.stories.tsx` -> `dropdown-menu`. */
export function componentForStoryFile(importPath: string): string | undefined {
  const match = /([A-Za-z0-9]+)\.stories\.[jt]sx?$/.exec(importPath);
  if (!match) return undefined;
  return match[1]!.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
