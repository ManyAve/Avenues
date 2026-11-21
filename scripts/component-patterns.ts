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

  "form-dialog": {
    pattern: "dialog",
    why: "Changes dismissal: with unsaved input, Esc, an outside press, Cancel and the close button ask first (AVE-9); while a save is held or the dialog is locked, none of them close it (AVE-120).",
  },
  "pending-confirm-dialog": {
    pattern: "alertdialog",
    why: "Changes keys: while the step runs, Tab stays on the status line and Esc does nothing (AVE-9).",
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
  composer: {
    upstream: "textarea",
    note: "AVE-134: ui-sdk's Textarea (autoResize, submitShortcut enter) and Button, wired into a form. Its keys are ui-sdk's but Escape, which cancels a reply or edit banner only while one shows. The Composer stories send by Enter, by Tab and Enter on Send and by the pointer, and check focus stays in the field, a refused send keeps the text, and Escape; Composer / Typing is its agent test.",
  },
  dialog: { upstream: "dialog" },
  autocomplete: {
    upstream: "autocomplete",
    note: "AVE-207: ui-sdk's Autocomplete, styled, with its keys, roles and ARIA unchanged. Avenue adds its own item text (marks the typed words in a span, never <mark>, so the option's name stays plain) and the status line's words. The Autocomplete stories type, move, choose and escape by keyboard, and check the status line's role and words while loading, empty and failed; Autocomplete / Search as you type is its agent test.",
  },
  command: {
    upstream: "command",
    note: "AVE-197: ui-sdk's Command, styled, and in CommandDialog its Dialog, which a command that runs closes (after its Promise resolves). The Command stories search, move, run, drill into a page and go back by keyboard, and open the palette with ⌘K; Command / Palette is its agent test.",
  },
  "alert-dialog": { upstream: "alert-dialog" },
  drawer: { upstream: "drawer", note: "The Drawer stories test focus in and back, Tab staying inside, Esc, and the unsaved-changes hold." },
  menu: { upstream: "trigger-menu" },
  popover: { upstream: "popover" },
  progress: {
    upstream: "progress",
    note: "AVE-129: ui-sdk's Progress, styled. The Progress stories check the name, value text, fill width, indeterminate state and that the bar is never focused; Progress / Changing value is its agent test.",
  },
  tooltip: { upstream: "tooltip" },
  "hover-card": { upstream: "hover-card" },
  checkbox: { upstream: "checkbox" },
  switch: { upstream: "switch" },
  toggle: { upstream: "toggle" },
  "toggle-group": { upstream: "segmented-control", note: "UX Engineer, AVE-17: the radio-group pattern." },
  "collapsible-section": {
    upstream: "collapsible",
    note: "AVE-121: the Collapsible section stories press each variant's trigger by keyboard and check aria-expanded, aria-controls and focus returning from a closed panel.",
  },
  dock: {
    upstream: "collapsible",
    note: "AVE-135: each window is a ui-sdk Collapsible with a kept-mounted panel. The Dock stories fold and unfold by keyboard, check aria-expanded and aria-controls, that a typed draft survives a fold, that Tab skips a folded body and that Close returns focus to the launcher; Dock / Agent is its agent test.",
  },
  calendar: {
    upstream: "calendar",
    note: "AVE-121: the testing kit has no calendar pattern; the Calendar stories test one Tab stop, the arrows, Page Down, Enter and the names.",
  },
  "date-picker": {
    upstream: "date-picker",
    note: "AVE-202: ui-sdk's DatePicker in Avenue's look, with Avenue's Calendar in the popup and, in the one-tag form on a touch-first device, the OS's date input (native=\"auto\", as Select). The testing kit has no date-picker pattern; the Date picker stories type, paste, open with Alt+Down, pick by keyboard, post with a form and show the locale's error on submit. Date picker / Agent is its agent test.",
  },
  "date-input": {
    upstream: "date-input",
    note: "AVE-202: ui-sdk's DateInput, segments in Avenue's look; the OS's date input on touch-first devices (native=\"auto\"). No testing-kit pattern; the Date input stories fill, step and paste by keyboard, check each segment's name and value, and post with a form. Date input / Agent is its agent test.",
  },
  "time-input": {
    upstream: "time-input",
    note: "AVE-202: ui-sdk's TimeInput, segments in Avenue's look; the OS's time input on touch-first devices (native=\"auto\"). No testing-kit pattern; the Time input stories fill, step and choose AM or PM by keyboard and post with a form. Time input / Agent is its agent test.",
  },
  accordion: { upstream: "accordion" },
  tabs: { upstream: "tabs" },
  "radio-group": { upstream: "radio" },
  slider: { upstream: "slider" },
  input: { upstream: "input" },
  textarea: { upstream: "textarea" },
  field: { upstream: "field" },
  avatar: { upstream: "avatar" },
  "file-field": {
    upstream: "file-input",
    note: "The testing kit has no file-input pattern; the File field stories press Choose, Remove and Try again by keyboard and check the names and live regions.",
  },
  "initials-avatar": { upstream: "avatar", note: "ManyAve's tinted initials on Avatar." },
  status: { upstream: "tooltip", note: "The help is an InfoTip; the Status stories test focus, tap and Esc." },
  "empty-state": { upstream: "button", note: "EmptyState and SectionEmpty; the external link stays a link, and href or render actions are links (AVE-139), tested in their stories." },
  chip: {
    upstream: "toggle",
    note: "The Chip stories test the check, keyboard pressing and the scrolling row's focus reveal.",
  },
  "toolbar-button": { upstream: "button" },
  "selection-bar": {
    upstream: "toolbar",
    note: "ui-sdk's toolbar holding Buttons; the Selection bar stories test the announced count, the visible disabled reason and the keys.",
  },
  "display-options": {
    upstream: "popover",
    note: "A Popover from a toolbar button, holding Checkbox, ToggleGroup and Button; the Display options stories press each by keyboard.",
  },
  toolbar: {
    upstream: "toolbar",
    note: "ui-sdk's toolbar, styled; the fold into More renders one or the other, so no key changes. The Toolbar stories press every control by keyboard (AVE-9).",
  },
  "table-filter": {
    upstream: "menu",
    note: "AVE-123: ui-sdk's menu, popover, select, checkbox and input in the toolbar's focus order, wired without changing their keys; a long choice list is ui-sdk's combobox with `multiple`, its input in the popup (AVE-155). The Table filter stories add, edit and remove filters by keyboard; Table filter / Agent and Long list agent are its agent tests.",
  },
  preferences: {
    none: "No control of its own: ui-sdk's Preferences, plus Avenue's `.dark` on <html>. ModeToggle is the control; the Preferences stories test the saved choice by keyboard, the first-paint script and System following the computer.",
  },
  "mode-toggle": { upstream: "segmented-control", note: "Dev is a ui-sdk toggle; the theme is Avenue's single-choice ToggleGroup (the radio-group pattern, AVE-17)." },
  "search-input": {
    upstream: "input",
    note: "The WithShortcut story tests that the hint's key focuses the field and is plain text inside it.",
  },
  "nav-tab": { none: "A plain link with aria-current; no behavior beyond the browser's." },
  toast: {
    upstream: "toast",
    note: "The app's timing rules are story tests. The agent stories cover a toast showing and the empty region, which a patch to ui-sdk 0.1 leaves out of the agent snapshot (AVE-43; see AGENTS.md).",
  },

  // Avenue primitives with no kit pattern: built with definePrimitive, but ui-sdk's kit has no pattern of their kind
  // to run checkPattern against. Their stories press every key the primitive handles instead (AVE-79).
  register: {
    none: "ui-sdk's kit has no grid pattern to check; the Register stories press every key the grid handles, and Register / Agent expands and sorts is its agent test (AVE-9, AVE-79).",
  },

  "month-grid": {
    none: "AVE-121: ui-sdk's kit has no grid pattern to check; the Month grid stories press every key the grid handles, run across weeks and past the last week, and open a day's popover from the grid; Month grid / Agent is its agent test.",
  },

  "message-list": {
    none: "AVE-132: ui-sdk's kit has no log pattern, and the list changes no keys: the log is one Tab stop the browser scrolls, its buttons are ui-sdk Buttons. The Message list stories press Jump, Earlier messages and Try again by keyboard, check the log's role, name and aria-relevant, that focus stays in the log after a jump, and that the view holds while scrolled up and when history loads above; Message list / Agent is its agent test.",
  },

  // Plain markup.
  "top-bar": { none: "Layout: a home link, NavTab links in a named nav and the trailing actions; the Top bar stories test the order and aria-current." },
  "status-bar": { none: "Layout: a footer of static text and Money totals around the ModeToggle, which has its own proof." },
  skeleton: {
    none: "Decorative shapes (aria-hidden) and a busy region with one polite status; no control and nothing to focus. The Skeleton stories check the status, the hidden shapes and that Tab passes by (AVE-128).",
  },
  message: {
    none: "AVE-133: plain markup (groups, paragraphs, hidden text); its only controls are the app's, in the actions and status slots. The Message stories read each bubble's text, and Message / Agent is its agent test.",
  },
  "icon-tile": { none: "A decorative tile; only its Automatic mark is read, tested in the Icon tile stories." },
  "page-header": { none: "Layout: the page's h1, a description and its actions." },
  "section-card": { none: "Layout: a Card with a level-2 heading and one action." },
  "detail-list": { none: "A description list and list rows, static text." },
  card: { none: "Layout only." },
  "choice-card": {
    none: "Composition over Field and ui-sdk's Radio or Checkbox; it changes no keys or ARIA beyond naming the control by its title, which the Choice card stories assert.",
  },
  table: { none: "A static data table, not an interactive grid." },
  badge: { none: "Static text." },
  money: { none: "Static text; the Money stories test that it never wraps or truncates." },
  "ask-admin": { none: "Static text that controls point aria-describedby at." },
  callout: { none: "Static text: a tinted note, not a live region." },
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

/** `Select.stories.tsx` -> `select`, `ToggleGroup.stories.tsx` -> `toggle-group`. */
export function componentForStoryFile(importPath: string): string | undefined {
  const match = /([A-Za-z0-9]+)\.stories\.[jt]sx?$/.exec(importPath);
  if (!match) return undefined;
  return match[1]!.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
