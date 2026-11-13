/**
 * Which app story each Avenue component and composite story is compared with (AVE-10, `bun run parity`).
 *
 * Keys are Avenue story ids. A value is either a list of pairs, or `{ none: "<reason>" }` when the app has
 * nothing to compare with; the UI Designer signs off every reason on AVE-10. Every Avenue component and
 * composite story needs an entry, so a new story fails `bun run parity` until it is paired here.
 *
 * A pair names the app story (`app`), and Playwright selectors for the element to capture on each side
 * (`appCrop`, `avenueCrop`; default: the story root's first child). The app has no stories for its shadcn
 * primitives, so most pairs capture the primitive inside a larger app story. `avenueArgs` sets Storybook args
 * on the Avenue story (`key:value;key:value`), used to show the same text as the app so pixels can be judged.
 * `frame: true` compares a container's own box (border, corners, fill, padding, shadow) and not its contents.
 *
 * `allow` lists the differences that are expected, each with its reason (scripts/parity-lib.ts, Allowance):
 * an agreed AVE-2 or AVE-13 fix, a filed AVE bug, or `app: <file>` when the app's screen, not its component,
 * draws the difference. Anything else that differs fails the run.
 */
import type { Allowance, PairEntry } from "./parity-lib";

// ---- Reasons shared by several pairs

const GRID_10_TO_8 = "AVE-2 §1: the app's off-grid 10px side padding inside a control becomes 8px";
const GRID_10_TO_12_MD =
  "AVE-2 §1: the md button's off-grid 10px side padding moves onto the 4px grid; Avenue's md and lg buttons take 12px (AVE-6), not §1's 8, so the label keeps its room";
const GRID_ICON_GAP = "AVE-2 §1: icon to its label is --space-inline, 4px (the app's off-grid 6px)";
const INSET = "AVE-2 §1: container padding is --space-inset, 16px";
const MENU_ITEM_PAD = "AVE-2 §1: a menu item's off-grid 6px side padding and icon gap become 8px";
const MENU_ITEM_CORNER = "AVE-2 §3: items inside a menu or padded list use the sm corner, 6px";
const PILL = "AVE-2 §3: the label's 4xl corner (26px) becomes full, which renders the same pill";
const DUES_DIALOG =
  "app: app/ui/components/dues.tsx: the payment dialogs pass `gap-0 p-0` and draw their own bordered header, body and footer sections; Avenue's Dialog keeps the app's default p-4 gap-4 (app/ui/components/ui/dialog.tsx)";
const DETAIL_CARD =
  "app: app/ui/components/detail.tsx: the household detail cards add `shadow-card ring-border`; the app's Card itself is ring-1 ring-foreground/10, as Avenue's";
const DUES_TABLE =
  "app: app/ui/components/dues-table.tsx: the Dues table sets its own 34px muted headers, background and 7px padding; the app's Table itself is h-10 px-2 font-medium text-foreground, as Avenue's";

const MONEY_BOX: Allowance = { prop: "height", because: "AVE-55: Avenue's Money sits in a 24px box (20px desktop); the app's is an inline 21px line (18px)" };
const TOOLTIP_PAD = "AVE-2 §1: the tooltip's off-grid 6px top and bottom padding moves onto the 4px grid at 4px, so a one-line tooltip is 28px (24px desktop)";
const MODE_DEV: Allowance[] = [
  { prop: "*-gap", app: "6px", avenue: "4px", because: "AVE-2 §1: the mode toggle's icon to label 6px becomes 4px" },
  { prop: "padding-left", app: "10px", avenue: "8px", because: GRID_10_TO_8 },
  { prop: "padding-right", app: "10px", avenue: "8px", because: GRID_10_TO_8 },
  { prop: "width", because: "AVE-2 §1: the narrower padding and gap make the same label narrower" },
  { prop: "border-*-radius", app: "10px", avenue: "8px", because: "AVE-2 §3: the 28px sm toggle takes the md corner (8px) where the app's is 10px" },
];
const MODE_SEGMENT: Allowance[] = [
  ...MODE_DEV.filter((a) => a.prop !== "border-*-radius"),
  { prop: "border-*-radius", because: "AVE-2 §3: segmented-control items take the md corner (8px) where the app's are 10px" },
];
const MD_HEIGHT = "AVE-2 §2: toolbar controls share the md height, 32px (the app's are 29 or 30px)";
const CHIP: Allowance[] = [
  { prop: "height", app: "30px", avenue: "32px", because: MD_HEIGHT },
  { prop: "*-gap", app: "5px", avenue: "4px", because: "AVE-2 §1: the chip's 5px gap becomes 4px" },
  { prop: "*-gap", where: "root", app: "6px", avenue: "8px", because: "AVE-2 §1: chips in a row are --space-group, 8px, apart (the app's off-grid 6px)" },
  { prop: "parts", because: "AVE-56: the app's chip count is its own small span; Avenue uses Count, which is taller than the app's counts" },
];
const CHIP_CHECK: Allowance[] = [
  ...CHIP,
  { prop: "parts", because: "AVE-8: a selected chip shows a 16px check before its label (UI Designer, for WCAG 1.4.1), and uses Count (AVE-56)" },
  { prop: "width", because: "AVE-8: the selected chip's check makes it wider (UI Designer, for WCAG 1.4.1)" },
];
const NAV_TAB: Allowance[] = [
  { prop: "height", app: "30px", avenue: "28px", because: "AVE-2 §2: a top-bar link is an sm control, 28px" },
  { prop: "padding-top", app: "5px", avenue: "0px", because: "AVE-2 §2: the sm height sets the box, not 5px padding" },
  { prop: "padding-bottom", app: "5px", avenue: "0px", because: "AVE-2 §2: the sm height sets the box, not 5px padding" },
  { prop: "padding-left", app: "11px", avenue: "12px", because: "AVE-2 §1: the off-grid 11px side padding becomes 12px" },
  { prop: "padding-right", app: "11px", avenue: "12px", because: "AVE-2 §1: the off-grid 11px side padding becomes 12px" },
  { prop: "*-gap", app: "7px", avenue: "8px", because: "AVE-2 §1: the off-grid 7px gap becomes 8px" },
  { prop: "border-*-radius", app: "pill", avenue: "8px", because: "AVE-2 §5: a link acts, so it isn't a pill; sm controls take the md corner (§3)" },
  { prop: "width", because: "AVE-2 §1: the wider padding and gap make the same label wider" },
  { prop: "parts", because: "AVE-56: the app's nav count is its own small span; Avenue uses Count, which is taller than the app's counts" },
];
const SEARCH: Allowance[] = [
  { prop: "height", app: "30px", avenue: "32px", because: MD_HEIGHT },
  { prop: "padding-right", app: "10px", avenue: "8px", because: GRID_10_TO_8 },
  { prop: "width", because: GRID_10_TO_8 },
  { prop: "border-*-radius", app: "3px", avenue: "4px", because: "AVE-2 §3: the shortcut hint's 3px literal becomes the xs corner, 4px" },
];
const TOOLBAR: Allowance[] = [
  { prop: "height", app: "29px", avenue: "32px", because: MD_HEIGHT },
  { prop: "padding-left", app: "7px", avenue: "8px", because: "AVE-2 §1: the off-grid 7px side padding becomes 8px" },
  { prop: "padding-right", app: "7px", avenue: "8px", because: "AVE-2 §1: the off-grid 7px side padding becomes 8px" },
  { prop: "border-*-radius", app: "pill", avenue: "10px", because: "AVE-2 §5: icon-only toolbar buttons stop being pills and take the md control corner" },
  { prop: "width", because: "AVE-2 §2: the taller md button and its padding make it wider" },
  { prop: "width", app: "14px", avenue: "16px", because: "AVE-68: the md button draws 16px icons where the app's sm toolbar button draws 14px" },
  { prop: "height", app: "14px", avenue: "16px", because: "AVE-68: the md button draws 16px icons where the app's sm toolbar button draws 14px" },
];
const SECTIONED_DIALOG =
  "app: app/ui/components/dialogs.tsx: the account dialogs pass `gap-0 p-0` and draw their own bordered header, body and footer sections (px-5, footer py-3); Avenue's Dialog keeps the app's default p-4 gap-4 (app/ui/components/ui/dialog.tsx)";
const DIALOG_INSET = "AVE-2 §1: dialog padding is --space-inset, 16px; the app's sectioned dialogs use 20px at the sides";
/** AVE-29 (UI Designer): control text is 14px from 768px up on both scales; the app's text-sm is 16px on the web scale. */
const CONTROL_TEXT: Allowance[] = [
  { prop: "font-size", app: "16px", avenue: "14px", because: "AVE-29: text inside a control is text-control, 14px from 768px up on both type scales; the app's text-sm is 16px on the web scale" },
  { prop: "line-height", app: "24px", avenue: "20px", because: "AVE-29: the line height follows the 14px step" },
];
const CONTROL_ROW: Allowance[] = [
  ...CONTROL_TEXT,
  { prop: "height", app: "32px", avenue: "28px", because: "AVE-29: menu and list rows follow the 14px line, so they are 4px shorter on the web scale (the desktop scale's height already)" },
];

const BUTTON_MD: Allowance[] = [
  ...CONTROL_TEXT,
  { prop: "padding-left", app: "10px", avenue: "12px", because: GRID_10_TO_12_MD },
  { prop: "padding-right", app: "10px", avenue: "12px", because: GRID_10_TO_12_MD },
  { prop: "*-gap", app: "6px", avenue: "4px", because: GRID_ICON_GAP },
  // The 4px of extra padding makes the same label 4px wider.
  { prop: "width", because: GRID_10_TO_12_MD },
];
const SIDE_10_TO_8: Allowance[] = [
  { prop: "padding-left", app: "10px", avenue: "8px", because: GRID_10_TO_8 },
  { prop: "padding-right", app: "10px", avenue: "8px", because: GRID_10_TO_8 },
];
const PANEL: Allowance[] = [
  { prop: "padding-*", app: "12px", avenue: "16px", because: INSET },
];
const MENU_ITEM: Allowance[] = [
  ...CONTROL_ROW,
  { prop: "padding-left", app: "6px", avenue: "8px", because: MENU_ITEM_PAD },
  { prop: "padding-right", app: "6px", avenue: "8px", because: MENU_ITEM_PAD },
  { prop: "column-gap", app: "6px", avenue: "8px", because: MENU_ITEM_PAD },
  { prop: "row-gap", because: MENU_ITEM_PAD },
  { prop: "border-*-radius", app: "8px", avenue: "6px", because: MENU_ITEM_CORNER },
];
const STATUS: Allowance[] = [
  { prop: "padding-left", app: "6px", avenue: "8px", because: "AVE-2 §1: Status's 6px side padding becomes 8px" },
  { prop: "padding-right", app: "6px", avenue: "8px", because: "AVE-2 §1: Status's 6px side padding becomes 8px" },
  { prop: "*-gap", app: "5px", avenue: "4px", because: "AVE-2 §1: Status's 5px gap becomes 4px" },
  { prop: "border-*-radius", app: "26px", avenue: "pill", because: PILL },
  { prop: "width", because: "AVE-2 §1: the wider side padding makes the same label wider" },
  { prop: "height", because: "AVE-56: Status is 20px tall; the app's is 24px (22px on desktop)" },
  { prop: "padding-top", because: "AVE-56: the app's label has 1px top and bottom padding" },
  { prop: "padding-bottom", because: "AVE-56: the app's label has 1px top and bottom padding" },
];
const CARD_ACTION_ROW: Allowance[] = [
  { prop: "height", where: "card-action 1", avenue: "28px", because: "AVE-2 §6: the action row holds the 28px sm control, centred on the title's line" },
  { prop: "*-gap", where: "card-action 1", app: "6px", avenue: "8px", because: "AVE-2 §1: the off-grid 6px gap becomes 8px" },
  { prop: "*-gap", where: "root", app: "4px", avenue: "8px", because: "AVE-2 §1: 4px is for an icon beside its own label; the header's title and its action are separate things, 8px (space-group) apart (AVE-57)" },
];
const DESKTOP_TITLE: Allowance[] = [
  { prop: "font-size", app: "14px", avenue: "16px", because: "AVE-55: Avenue's titles don't follow the desktop type scale" },
  { prop: "line-height", because: "AVE-55: Avenue's titles don't follow the desktop type scale (and the card title's web line is 22px, the app's 24px)" },
  { prop: "height", because: "AVE-55: the title's line height differs, so its height does" },
];
const CARD_TITLE: Allowance[] = [
  ...DESKTOP_TITLE,
  { prop: "*-gap", app: "8px", avenue: "0px", because: "app: app/ui/components/detail.tsx: the detail card's title is a flex row (gap-2) so it can hold an icon; the app's CardTitle itself has no gap, as Avenue's" },
];

const REGISTER_CELL: Allowance[] = [
  { prop: "padding-left", app: "10px", avenue: "12px", because: "AVE-2 §1: a Register cell's off-grid 10px side padding moves onto the 4px grid at 12px" },
  { prop: "padding-right", app: "10px", avenue: "12px", because: "AVE-2 §1: a Register cell's off-grid 10px side padding moves onto the 4px grid at 12px" },
];
const REGISTER_HEADER: Allowance[] = [
  ...REGISTER_CELL,
  { prop: "*-gap", app: "6px", avenue: "8px", because: "AVE-2 §1: a column header's label to its sort button, the app's off-grid 6px, becomes 8px" },
];
const ADDRESS_CELL: Allowance[] = [
  ...REGISTER_CELL,
  {
    prop: "parts",
    where: "root",
    because: "app: app/ui/components/cells.tsx: the households screen puts a house icon and a hover-card preview in the address cell; the Register cell holds what the screen gives it, here a plain link",
  },
];
const STREET_TOTAL: Allowance = {
  prop: "parts",
  app: "only here: span",
  avenue: "only here: money",
  because: "AVE-55: the street total is Avenue's Money, which never truncates and sits in its own box; the app's group row prints a plain span",
};

const BEHAVIOUR = (look: string) =>
  `Behaviour story: a play function presses keys or checks focus, so its end state isn't a resting look the app has a story for. Its look is compared through ${look}.`;
const NEW_IN_AVENUE = (what: string, look: string) =>
  `${what} is new in Avenue; the app has no component or story of its kind. Its parts are compared through ${look}.`;
const STATE_ONLY = (state: string, look: string) =>
  `The app has no story showing ${state}; the resting look is compared through ${look}.`;

/** AVE-39: the app opens no list as a sheet (its pickers are popovers or the OS picker), so there is nothing to pair. */
const SHEET = (component: string) =>
  `${component}'s list presenting as a bottom sheet on a phone (AVE-39) is new in Avenue; the app has no sheet presentation. Its surface, corners and handle are Sheet's, and its rows are the popover's, compared through ${component} / Default.`;
/** AVE-38: the unchecked outline is a deliberate departure from the app, for 3:1 contrast (WCAG 1.4.11). */
const OUTLINE = (control: string) =>
  `A contrast proof (AVE-38): the unchecked ${control}'s outline departs from the app on purpose to reach 3:1, and the play function measures it. The app has no story of this measurement; the control's resting look is compared through its States story.`;

export const PAIRS: Record<string, PairEntry> = {
  // ---- Alert dialog (AVE-9 composites' base)
  "components-alert-dialog--open": [
    {
      label: "confirm dialog frame",
      app: "primitives-deleteaccount--allowed",
      appCrop: "[data-slot=dialog-content]",
      avenueCrop: "[data-slot=alert-dialog-content]",
      frame: true,
      allow: [{ prop: "padding-*", app: "0px", avenue: "16px", because: SECTIONED_DIALOG }],
    },
  ],
  "components-alert-dialog--keyboard": { none: BEHAVIOUR("Alert dialog / Open") },

  // ---- Ask admin (AVE-8)
  "components-ask-admin--inline": [
    { label: "ask-admin line", app: "dues-dialogs--set-assessment-member", appCrop: "p:has-text('Ask a board admin')", avenueCrop: "[data-slot=ask-admin]" },
  ],
  "components-ask-admin--in-a-dialog-footer": [
    {
      label: "dialog footer with ask-admin",
      app: "dues-dialogs--set-assessment-member",
      appCrop: "[data-slot=dialog-footer]",
      avenueCrop: "[data-slot=dialog-footer]",
      frame: true,
      allow: [{ prop: "padding-*", because: DUES_DIALOG }],
    },
  ],

  // ---- Avatar (AVE-6) and initials avatar (AVE-8)
  "components-avatar--sizes": {
    none: "Avenue's plain Avatar is the shadcn base with a neutral fallback; every avatar the app draws is ManyAve's tinted initials, compared through Initials avatar / Tints.",
  },
  "components-avatar--with-name": {
    none: "Avenue's plain Avatar is the shadcn base with a neutral fallback; every avatar the app draws is ManyAve's tinted initials, compared through Initials avatar / Tints.",
  },
  "components-initials-avatar--sizes": {
    none: "Shows Avenue's four avatar sizes with people the app's stories don't have, and the tint follows the name, so a capture would differ by design. Size 28 and the tints are compared through Initials avatar / Tints, which shows the app's own people.",
  },
  "components-initials-avatar--tints": [
    { label: "tinted initials, first tint", app: "primitives-avatar--tints", appCrop: "[data-slot=avatar] >> nth=0", avenueCrop: "[data-slot=avatar] >> nth=0" },
    { label: "tinted initials, second tint", app: "primitives-avatar--tints", appCrop: "[data-slot=avatar] >> nth=1", avenueCrop: "[data-slot=avatar] >> nth=1" },
  ],
  "components-initials-avatar--tint-from-id": {
    none: "Shows that one person gets the same tint whether it comes from their name or id, an Avenue rule the app has no story for. The tints themselves are compared through Initials avatar / Tints.",
  },
  "components-initials-avatar--beside-a-name": {
    none: "Shows a person the app's stories don't have, and the tint follows the name, so a capture would differ by design. The avatar is compared through Initials avatar / Tints, which shows the app's own people.",
  },

  // ---- Badge, status and count (AVE-6, AVE-8)
  "components-badge--variants": [
    {
      label: "outline badge",
      app: "primitives-status--paid",
      appCrop: "[data-slot=badge]",
      avenueCrop: "[data-slot=badge] >> nth=10",
      allow: [
        ...STATUS,
        { prop: "padding-left", because: "AVE-56: the app's badge has a status dot and 6px sides; Avenue's outline badge 4px and 8px" },
        { prop: "padding-right", because: "AVE-56: the app's badge has a status dot and 6px sides; Avenue's outline badge 4px and 8px" },
        { prop: "padding-top", because: "AVE-56: the app's badge has 1px top and bottom padding, Avenue's 2px" },
        { prop: "padding-bottom", because: "AVE-56: the app's badge has 1px top and bottom padding, Avenue's 2px" },
        { prop: "background-color", because: "AVE-56: the app's badge is filled with the card colour; Avenue's outline badge is transparent" },
        { prop: "color", because: "AVE-56: the app's badge text is muted; Avenue's outline badge is foreground" },
        { prop: "font-weight", because: "AVE-56: the app's badge is weight 450, Avenue's 500" },
        { prop: "parts", because: "AVE-56: the app's badge draws a status dot; Avenue's Badge takes an icon instead" },
      ],
    },
  ],
  "components-status--tones": [
    { label: "status: paid", app: "primitives-status--paid", appCrop: "[data-slot=badge]", avenueCrop: "[data-slot=status] >> nth=0", allow: STATUS },
    { label: "status: owing", app: "primitives-status--owing", appCrop: "[data-slot=badge]", avenueCrop: "[data-slot=status] >> nth=1", allow: STATUS },
  ],
  "components-status--with-help": [
    { label: "status with help", app: "primitives-status--owing", appCrop: "[data-slot=badge]", avenueCrop: "[data-slot=status] >> nth=0", allow: STATUS },
  ],
  "components-status--counts": [
    {
      label: "count",
      app: "primitives-count--default",
      appCrop: "#storybook-root > span",
      avenueCrop: "[data-slot=count] >> nth=0",
      allow: [
        { prop: "padding-left", app: "5px", avenue: "4px", because: "AVE-2 §1: Count's 5px side padding becomes 4px" },
        { prop: "padding-right", app: "5px", avenue: "4px", because: "AVE-2 §1: Count's 5px side padding becomes 4px" },
        { prop: "width", because: "AVE-2 §1: the narrower side padding makes the same count 2px narrower" },
        { prop: "height", because: "AVE-56: the app's count is an inline 17px box (16px desktop); Avenue's is 20px (18px)" },
      ],
    },
  ],

  // ---- Button (AVE-6)
  "components-button--playground": [
    { label: "primary", app: "primitives-button--primary", appCrop: "[data-slot=button]", avenueCrop: "[data-slot=button]", avenueArgs: "children:Button", allow: BUTTON_MD },
    { label: "outline", app: "primitives-button--outline", appCrop: "[data-slot=button]", avenueCrop: "[data-slot=button]", avenueArgs: "children:Button;variant:outline", allow: BUTTON_MD },
    { label: "ghost", app: "primitives-button--ghost", appCrop: "[data-slot=button]", avenueCrop: "[data-slot=button]", avenueArgs: "children:Button;variant:ghost", allow: BUTTON_MD },
  ],
  "components-button--variants": [
    { label: "default", app: "primitives-button--primary", appCrop: "[data-slot=button]", avenueCrop: "[data-slot=button] >> nth=0", allow: BUTTON_MD },
    { label: "outline", app: "primitives-button--outline", appCrop: "[data-slot=button]", avenueCrop: "[data-slot=button] >> nth=3", allow: BUTTON_MD },
    { label: "ghost", app: "primitives-button--ghost", appCrop: "[data-slot=button]", avenueCrop: "[data-slot=button] >> nth=9", allow: BUTTON_MD },
  ],
  "components-button--sizes": [
    { label: "sm outline in a card", app: "detail-pieces--dues", appCrop: "[data-slot=button]:has-text('Record payment')", avenueCrop: "[data-slot=button] >> nth=5", allow: SIDE_10_TO_8 },
    { label: "md", app: "primitives-button--primary", appCrop: "[data-slot=button]", avenueCrop: "[data-slot=button] >> nth=8", allow: BUTTON_MD },
  ],
  "components-button--states": [
    { label: "disabled", app: "primitives-button--disabled", appCrop: "[data-slot=button]", avenueCrop: "[data-slot=button]:disabled >> nth=0", allow: BUTTON_MD },
  ],
  "components-button--disabled-with-reason": [
    { label: "reason under a disabled button", app: "settings-billing--member", appCrop: "text=Only a board admin", avenueCrop: "[data-slot=button-reason]" },
  ],
  "components-button--text-action": {
    none: "The inline text action is a Button variant new in Avenue (AVE-6); the app writes these as one-off underlined buttons with no shared style or story.",
  },

  // ---- Card (AVE-6)
  "components-card--default": [
    { label: "card title", app: "detail-pieces--people", appCrop: "[data-slot=card-title]", avenueCrop: "[data-slot=card-title]", allow: CARD_TITLE },
  ],
  "components-card--header-with-action": [
    { label: "card frame", app: "detail-pieces--dues", appCrop: "[data-slot=card]", avenueCrop: "[data-slot=card]", frame: true, allow: [{ prop: "box-shadow", because: DETAIL_CARD }] },
    { label: "card header with action", app: "detail-pieces--dues", appCrop: "[data-slot=card-header]", avenueCrop: "[data-slot=card-header]", allow: [
      ...CARD_ACTION_ROW,
      { prop: "parts", because: "AVE-2 §6: Avenue's header action is the 28px year control; the app's story shows text there" },
    ] },
  ],
  "components-card--small": {
    none: "The app's Card has the same sm size (12px spacing, ported unchanged), but no app screen or story uses it. The frame is compared through Card / Header with action and the title through Card / Default.",
  },

  // ---- Checkbox and radio (AVE-6, AVE-33)
  "components-checkbox--states": [
    { label: "unchecked", app: "primitives-input--checkbox-story", appCrop: "[data-slot=checkbox]", avenueCrop: "[aria-label=Unchecked]" },
    { label: "checked", app: "dues-table--selection", appCrop: "[data-slot=checkbox][aria-checked=true] >> nth=0", avenueCrop: "[aria-label=Checked]" },
  ],
  "components-checkbox--select-all": [
    { label: "checked row checkbox", app: "dues-table--selection", appCrop: "[data-slot=checkbox][aria-checked=true] >> nth=0", avenueCrop: "[data-slot=checkbox][aria-checked=true] >> nth=0" },
  ],
  "components-checkbox--required-in-field": [
    { label: "field error", app: "primitives-signin--bad-email", appCrop: "[data-slot=field-error]", avenueCrop: "[data-slot=field-error]" },
  ],
  "components-radio-group--states": { none: NEW_IN_AVENUE("The radio group", "Checkbox / States (the same 16px control and ring)") },
  "components-radio-group--keyboard": { none: BEHAVIOUR("Checkbox / States") },
  "components-radio-group--unchecked-outline": { none: OUTLINE("radio") },
  "components-checkbox--unchecked-outline": { none: OUTLINE("checkbox") },
  "components-choice-card--checkboxes": { none: NEW_IN_AVENUE("The choice card (AVE-33, AVE-37)", "Checkbox / States and Field / Label and description") },
  "components-choice-card--radio": { none: NEW_IN_AVENUE("The choice card (AVE-33, AVE-37)", "Checkbox / States and Field / Label and description") },
  "components-choice-card--phone": { none: NEW_IN_AVENUE("The choice card at phone width (AVE-33)", "Checkbox / States and Field / Label and description") },

  // ---- Combobox (AVE-7)
  ...Object.fromEntries(
    ["households", "time-zone", "with-none"].map((story) => [
      `components-combobox--${story}`,
      [
        {
          label: "combobox input",
          app: "primitives-time-zone-picker--default",
          appCrop: "div:has(> input[role=combobox])",
          avenueCrop: "[data-slot=combobox]",
          allow: [
            { prop: "height", where: "svg 1", because: "AVE-59: the app's combobox icons are 14px, Avenue's 16px" },
            { prop: "height", where: "svg 2", because: "AVE-59: the app's combobox icons are 14px, Avenue's 16px" },
            { prop: "width", where: "svg 1", because: "AVE-59: the app's combobox icons are 14px, Avenue's 16px" },
            { prop: "width", where: "svg 2", because: "AVE-59: the app's combobox icons are 14px, Avenue's 16px" },
            { prop: "padding-left", where: "root", because: "AVE-59: the app's input group has no start padding (its icon has a 10px margin); Avenue's has 8px" },
            { prop: "parts", because: "AVE-59: ui-sdk's combobox wraps the icon and names its input and trigger parts; the app's Base UI picker has a bare input and button" },
          ],
        },
      ],
    ]),
  ),
  "components-combobox--small": {
    none: "The 28px combobox for card and dialog headers is new in Avenue (AVE-2 §2); the app's only combobox is the 32px time-zone picker, compared through Combobox / Time zone.",
  },
  "components-combobox--invalid": { none: STATE_ONLY("an invalid combobox", "Combobox / Time zone, and the error text through Field / Invalid") },
  "components-combobox--disabled": { none: STATE_ONLY("a disabled combobox", "Combobox / Time zone") },
  "components-combobox--empty": { none: STATE_ONLY("an empty combobox list (the time zones always match)", "Combobox / Time zone") },
  "components-combobox--keyboard": { none: BEHAVIOUR("Combobox / Time zone") },
  "components-combobox--sheet-on-phones": { none: SHEET("Combobox") },
  "components-combobox--sheet-open": { none: SHEET("Combobox") },
  "components-combobox--sheet-keyboard": { none: BEHAVIOUR("Combobox / Sheet, open") },
  "components-combobox--sheet-swipe-to-close": { none: BEHAVIOUR("Combobox / Sheet, open") },
  "components-combobox--pattern": { none: BEHAVIOUR("Combobox / Time zone") },

  // ---- Dialog (AVE-6)
  "components-dialog--open": [
    { label: "dialog frame", app: "primitives-deleteaccount--allowed", appCrop: "[data-slot=dialog-content]", avenueCrop: "[data-slot=dialog-content]", frame: true, allow: [{ prop: "padding-*", app: "0px", avenue: "16px", because: SECTIONED_DIALOG }] },
    { label: "dialog title", app: "dues-dialogs--adjustment", appCrop: "[data-slot=dialog-title]", avenueCrop: "[data-slot=dialog-title]", allow: DESKTOP_TITLE },
  ],
  "components-dialog--focus-on-open-and-close": { none: BEHAVIOUR("Dialog / Open") },
  "components-dialog--confirm-focuses-safe-button": [
    { label: "dialog footer", app: "primitives-deleteaccount--allowed", appCrop: "[data-slot=dialog-footer]", avenueCrop: "[data-slot=dialog-footer]", frame: true, allow: [{ prop: "padding-*", because: SECTIONED_DIALOG }] },
  ],
  "components-dialog--escape-blocked-while-pending": { none: BEHAVIOUR("Dialog / Open") },

  // ---- Disclosure (AVE-7)
  ...Object.fromEntries(
    (["closed", "open"] as const).map((story) => [
      `components-disclosure--${story}`,
      [
        {
          label: "Advanced trigger",
          app: "dues-payments--stripe-customer",
          appCrop: "summary:has-text('Advanced')",
          avenueCrop: "[data-slot=collapsible-trigger]",
          allow: [
            { prop: "padding-*", because: "AVE-58: Avenue's trigger adds 4px side padding" },
            { prop: "border-*-radius", because: "AVE-58: Avenue's trigger adds a 4px corner" },
            { prop: "*-gap", because: "AVE-58: Avenue's trigger adds a chevron 4px from the label" },
            { prop: "parts", because: "AVE-58: Avenue's trigger draws a chevron; the app's summary uses the browser's marker" },
            { prop: "width", because: "AVE-58: the app's summary fills the row; Avenue's trigger fits its label" },
            { prop: "color", because: "AVE-58: Avenue's open trigger turns to foreground; the app's stays muted" },
          ],
        },
      ],
    ]),
  ),
  "components-disclosure--disabled": {
    none: "The app hides its Advanced section from board members who can't use it rather than disabling it, so it has no disabled disclosure. The resting look is compared through Disclosure / Closed.",
  },
  "components-disclosure--in-a-card": { none: STATE_ONLY("its skipped-sheets disclosure collapsed in a card", "Disclosure / Closed") },
  "components-disclosure--keyboard": { none: BEHAVIOUR("Disclosure / Closed") },
  "components-disclosure--agent": { none: BEHAVIOUR("Disclosure / Open") },

  // ---- Dropdown menu (AVE-6)
  "components-dropdown-menu--open": [
    { label: "menu panel", app: "primitives-menus--new-menu-story", appCrop: "[data-slot=dropdown-menu-content]", avenueCrop: "[data-slot=menu-content]", frame: true },
    { label: "menu item", app: "primitives-menus--new-menu-story", appCrop: "[data-slot=dropdown-menu-item] >> nth=1", avenueCrop: "[data-slot=menu-item] >> nth=1", allow: MENU_ITEM },
  ],
  "components-dropdown-menu--keyboard": { none: BEHAVIOUR("Dropdown menu / Open") },
  "components-dropdown-menu--open-by-click": { none: BEHAVIOUR("Dropdown menu / Open") },

  // ---- Empty state (AVE-8)
  "components-empty-state--default": [
    { label: "empty state action", app: "primitives-emptystate--default", appCrop: "[data-slot=button]", avenueCrop: "[data-slot=button]", allow: SIDE_10_TO_8 },
    {
      label: "empty state",
      app: "primitives-emptystate--no-action",
      appCrop: "#storybook-root > *",
      avenueCrop: "[data-slot=empty-state]",
      frame: true,
      allow: [{ prop: "padding-*", app: "64px", avenue: "48px", because: "AVE-2 §1: empty-state padding is space-12, 48px (the page form's 64px)" }],
    },
  ],
  "components-empty-state--secondary-action": [
    {
      label: "secondary action",
      app: "primitives-emptystate--with-secondary-action",
      appCrop: "[data-slot=button] >> nth=1",
      avenueCrop: "[data-slot=button] >> nth=1",
      allow: [
        ...SIDE_10_TO_8,
        { prop: "width", because: GRID_10_TO_8 },
        { prop: "color", because: "AVE-13: in dark, links use the lighter primary text so they reach 4.5:1 on the background" },
      ],
    },
  ],
  "components-empty-state--external-link": [
    {
      label: "empty state",
      app: "primitives-emptystate--with-external-link",
      appCrop: "#storybook-root > *",
      avenueCrop: "[data-slot=empty-state]",
      frame: true,
      allow: [{ prop: "padding-*", app: "64px", avenue: "48px", because: "AVE-2 §1: empty-state padding is space-12, 48px (the page form's 64px)" }],
    },
  ],
  "components-empty-state--disabled-action": { none: STATE_ONLY("the empty state's action disabled", "Empty state / Default, and disabled opacity through Button / Playground") },
  "components-empty-state--compact-in-a-card": {
    none: "The compact empty state inside a card is an Avenue pattern (AVE-23) the app draws by hand in each place, with no story; the empty state itself is compared through Empty state / Default.",
  },
  "components-empty-state--section": {
    none: "The app's SectionEmpty has no story of its own; it appears only inside page stories that show it with real lists around it.",
  },

  // ---- Field, input and textarea (AVE-6, AVE-25)
  "components-field--label-and-description": [
    { label: "field label", app: "dues-dialogs--adjustment", appCrop: "[data-slot=field-label] >> nth=1", avenueCrop: "[data-slot=field-label]" },
    { label: "input", app: "dues-dialogs--adjustment", appCrop: "[data-slot=input] >> nth=0", avenueCrop: "[data-slot=input]", allow: [
      ...SIDE_10_TO_8,
      { prop: "width", because: "app: app/ui/components/dues.tsx: the adjustment dialog sets its fields two to a row (grid-cols-2); an input fills whatever column it is in, as Avenue's" },
    ] },
    { label: "field description", app: "dues-dialogs--adjustment", appCrop: "[data-slot=field-description] >> nth=0", avenueCrop: "[data-slot=field-description]" },
  ],
  "components-field--invalid": [
    { label: "field error", app: "primitives-signin--bad-email", appCrop: "[data-slot=field-error]", avenueCrop: "[data-slot=field-error]" },
    {
      label: "invalid input",
      app: "primitives-signin--bad-email",
      appCrop: "[data-slot=input]",
      avenueCrop: "[data-slot=input]",
      allow: [
        ...SIDE_10_TO_8,
        { prop: "width", because: "app: app/ui/components/sign-in.tsx: the sign-in card makes its input 336px wide; the story's field is 352px" },
        { prop: "border-top-color", because: "AVE-13: the dark destructive colour is 0.56 lightness, not 0.58, so its text reaches 4.5:1" },
        { prop: "box-shadow", because: "AVE-13: the dark destructive colour is 0.56 lightness, not 0.58, so its text reaches 4.5:1" },
      ],
    },
  ],
  "components-field--required-on-submit": { none: BEHAVIOUR("Field / Invalid") },
  "components-field--disabled": { none: STATE_ONLY("a disabled text field", "Field / Label and description, and disabled opacity through Button / Playground") },
  "components-field--form": [
    { label: "field legend", app: "primitives-forms--people-property", appCrop: "[data-slot=field-legend] >> nth=0", avenueCrop: "[data-slot=field-legend]", allow: DESKTOP_TITLE },
  ],
  "components-field--popup-in-field": [
    {
      label: "popover panel",
      app: "primitives-displayoptions--default",
      appCrop: "[data-slot=popover-content]",
      avenueCrop: "[data-slot=popover-content]",
      frame: true,
      allow: PANEL,
    },
  ],
  "components-input--sizes": [
    { label: "md input", app: "primitives-input--default", appCrop: "[data-slot=input]", avenueCrop: "[data-slot=input] >> nth=2", allow: [...SIDE_10_TO_8, { prop: "width", because: "app: app/ui/components/Input.stories.tsx: the app's story stretches the input across the canvas" }] },
  ],
  "components-input--placeholder-states": { none: "Shows the placeholder rule (AVE-25) across states; the input is compared through Input / Sizes and Field / Invalid." },
  "components-input--placeholder-do-and-dont": { none: "A do-and-don't page for the placeholder rule (AVE-25); the input is compared through Input / Sizes." },
  "components-input--empty-beside-filled": { none: "Shows empty and filled inputs side by side for the placeholder rule (AVE-25); the input is compared through Input / Sizes." },
  "components-textarea--in-field": [
    { label: "textarea", app: "website-editor--events-form", appCrop: "[data-slot=textarea] >> nth=0", avenueCrop: "[data-slot=textarea]", frame: true, allow: [...SIDE_10_TO_8, ...CONTROL_TEXT] },
  ],
  "components-textarea--invalid": { none: STATE_ONLY("an invalid textarea", "Textarea / In field, and the error text through Field / Invalid") },
  "components-textarea--empty-beside-filled": { none: "Shows empty and filled textareas side by side for the placeholder rule (AVE-25); the textarea is compared through Textarea / In field." },

  // ---- File field (AVE-35)
  ...Object.fromEntries(
    ["upload", "document-states", "image-states", "long-name", "rejected", "disabled-with-reason", "phone"].map((story) => [
      `components-file-field--${story}`,
      { none: NEW_IN_AVENUE("The shared file and image field (AVE-35)", "Button / Sizes (its 28px buttons) and Field / Label and description") },
    ]),
  ),

  // ---- Hover card, popover, tooltip (AVE-6)
  "components-hover-card--open": [
    { label: "hover card panel", app: "households-table--cell-previews", appCrop: "[data-slot=hover-card-content]", avenueCrop: "[data-slot=hover-card-content]", frame: true, allow: PANEL },
  ],
  "components-hover-card--same-content-without-hover": {
    none: "Shows the hover card's content reachable without hovering (an accessibility rule Avenue adds); the app has no such story. The panel is compared through Hover card / Open.",
  },
  "components-popover--open": [
    { label: "popover panel", app: "primitives-displayoptions--default", appCrop: "[data-slot=popover-content]", avenueCrop: "[data-slot=popover-content]", frame: true, allow: PANEL },
  ],
  "components-popover--keyboard": { none: BEHAVIOUR("Popover / Open") },
  "components-tooltip--open": [
    {
      label: "tooltip",
      app: "website-editor--toolbar-before-first-publish",
      appCrop: "[data-slot=tooltip-content]",
      avenueCrop: "[data-slot=tooltip-content]",
      keepFocus: true,
      allow: [
        { prop: "padding-top", app: "6px", avenue: "4px", because: TOOLTIP_PAD },
        { prop: "padding-bottom", app: "6px", avenue: "4px", because: TOOLTIP_PAD },
        { prop: "*-gap", app: "6px", avenue: "4px", because: GRID_ICON_GAP },
        { prop: "height", because: TOOLTIP_PAD },
        { prop: "parts", because: "app: app/ui/components/ui/tooltip.tsx: Base UI's arrow carries no data-slot, so it can't be matched by name to Avenue's tooltip-arrow; both are a 10px square turned 45°" },
      ],
    },
  ],
  "components-tooltip--on-focus": { none: BEHAVIOUR("Tooltip / Open") },
  "components-tooltip--help-on-a-label": {
    none: "The help icon beside a label is an Avenue pattern; the app's tooltips sit on toolbar buttons. The tooltip panel is compared through Tooltip / Open.",
  },

  // ---- Inline message (AVE-7)
  "components-inline-message--error-tone": [
    {
      label: "error text",
      app: "primitives-signin--offline",
      appCrop: "[data-slot=field-error]",
      avenueCrop: "[data-slot=inline-message]",
      allow: [
        { prop: "font-size", because: "AVE-55: Avenue's inline error is 14px (13px desktop); the app's error text is 16px (14px)" },
        { prop: "line-height", because: "AVE-55: Avenue's inline error is 14px (13px desktop); the app's error text is 16px (14px)" },
        { prop: "height", because: "AVE-55: the smaller line makes the message shorter" },
        { prop: "*-gap", because: "AVE-55: Avenue's inline error leads with an icon; the app's error text has none" },
        { prop: "parts", because: "AVE-55: Avenue's inline error leads with an icon; the app's error text has none" },
      ],
    },
  ],
  "components-inline-message--pending": {
    none: "The app shows saving inside the disabled button that started it (\"Saving…\"), not as a message, so there is nothing of the same kind to compare; Avenue's pending tone is the info tone with a spinner.",
  },
  "components-inline-message--warning": {
    none: "The app writes warnings as plain text in each dialog with no shared style or story; the error tone is compared through Inline message / Error tone.",
  },
  "components-inline-message--info": {
    none: "The app writes notes as plain muted text with no shared style or story; the error tone is compared through Inline message / Error tone.",
  },
  "components-inline-message--tones": { none: "All four tones side by side, an Avenue overview; the tone the app has is compared through its own story." },
  "components-inline-message--announcing": { none: BEHAVIOUR("Inline message / Error tone") },

  // ---- Money (AVE-8)
  "components-money--amounts": [
    { label: "amount", app: "primitives-money--default", appCrop: "#storybook-root span", avenueCrop: "[data-slot=money] >> nth=0", allow: [MONEY_BOX] },
    { label: "large amount", app: "primitives-money--large", appCrop: "#storybook-root span", avenueCrop: "[data-slot=money] >> nth=3", allow: [MONEY_BOX] },
  ],
  "components-money--column": [
    { label: "amount in a column", app: "primitives-money--column", appCrop: "#storybook-root span >> nth=1", avenueCrop: "[data-slot=money] >> nth=0" },
  ],
  "components-money--never-truncates": {
    none: "Draws a dashed 48px box across the amount to prove it overflows rather than truncates, so the box's edge crosses the digits; the large amount is compared through Money / Amounts.",
  },

  // ---- Select (AVE-7)
  ...Object.fromEntries(
    [
      ["default", "[data-slot=select-trigger]"],
      ["sizes", "[data-slot=select-trigger] >> nth=0"],
    ].map(([story, crop]) => [
      `components-select--${story}`,
      [
        {
          label: "select trigger beside the app's input",
          app: "primitives-input--default",
          appCrop: "[data-slot=input]",
          avenueCrop: crop!,
          frame: true,
          allow: [
            ...SIDE_10_TO_8,
            { prop: "padding-top", app: "4px", avenue: "0px", because: "AVE-2 §2: the trigger is the 32px md control and centres its text, so it needs no vertical padding; the input's 4px fits the same height" },
            { prop: "padding-bottom", app: "4px", avenue: "0px", because: "AVE-2 §2: the trigger is the 32px md control and centres its text, so it needs no vertical padding; the input's 4px fits the same height" },
          ],
        },
      ],
    ]),
  ),
  "components-select--placeholder": { none: "Same trigger as Select / Default with placeholder text; compared there." },
  "components-select--disabled": { none: STATE_ONLY("a disabled select", "Select / Default, and disabled opacity through Button / Playground") },
  "components-select--disabled-option": [
    { label: "select list panel", app: "primitives-menus--new-menu-story", appCrop: "[data-slot=dropdown-menu-content]", avenueCrop: "[data-slot=select-content]", frame: true },
    {
      label: "select option",
      app: "primitives-menus--new-menu-story",
      appCrop: "[data-slot=dropdown-menu-item] >> nth=0",
      avenueCrop: "[data-slot=select-item] >> nth=0",
      allow: [
        ...MENU_ITEM,
        { prop: "parts", because: "AVE-2 §3: a select option reserves its check mark's place; a menu item shows an icon instead (the app has no Select list to compare)" },
        { prop: "height", where: "span 1", because: "AVE-2 §3: a select option reserves its check mark's place; a menu item shows an icon instead (the app has no Select list to compare)" },
      ],
    },
  ],
  "components-select--invalid": [
    { label: "field error", app: "primitives-signin--bad-email", appCrop: "[data-slot=field-error]", avenueCrop: "[data-slot=field-error]" },
  ],
  "components-select--long-options": { none: "Same trigger as Select / Default with long text that truncates; compared there." },
  "components-select--native-on-phones": { none: "The operating system's own picker on phones; its look is the platform's, not Avenue's or the app's." },
  "components-select--keyboard": { none: BEHAVIOUR("Select / Default") },
  "components-select--sheet-on-phones": { none: SHEET("Select") },
  "components-select--sheet-open": { none: SHEET("Select") },
  "components-select--sheet-keyboard": { none: BEHAVIOUR("Select / Sheet, open") },
  "components-select--sheet-swipe-to-close": { none: BEHAVIOUR("Select / Sheet, open") },
  "components-select--invalid-is-announced": { none: BEHAVIOUR("Select / Invalid") },
  ...Object.fromEntries(
    [
      ["in-card-header", "[data-slot=card-header]"],
      ["year-select-before-after", "[data-slot=card-header] >> nth=0"],
    ].map(([story, crop]) => [
      `components-select--${story}`,
      [
        {
          label: "year select in the Dues card header",
          app: "detail-pieces--dues",
          appCrop: "[data-slot=card-header]",
          avenueCrop: crop!,
          allow: [...CARD_ACTION_ROW, { prop: "parts", because: "AVE-2 §6: the year select sits in the header's action row; the app's story shows only its text there" }],
        },
      ],
    ]),
  ),
  "components-select--in-clipped-card-at-edge": {
    none: "Proves the list isn't clipped by a card at the window edge, a bug the app has; a matching capture would reproduce the bug. The header is compared through Select / In card header.",
  },
  "components-select--agent": { none: BEHAVIOUR("Select / Default") },

  // ---- Sheet (AVE-32)
  ...Object.fromEntries(
    ["closed", "bottom-on-desktop", "bottom-on-phone", "side-on-desktop", "side-on-phone", "long-title", "unsaved-changes", "keyboard"].map((story) => [
      `components-sheet--${story}`,
      { none: NEW_IN_AVENUE("The Sheet for phone forms and filters (AVE-32)", "Dialog / Open (the same title, inset and buttons)") },
    ]),
  ),

  // ---- Switch (AVE-6)
  "components-switch--unchecked-outline": { none: OUTLINE("switch") },
  "components-switch--states": [
    { label: "switch on", app: "primitives-dialogs--automations-story", appCrop: "[data-slot=switch][data-checked] >> nth=0", avenueCrop: "[aria-label='On, default']" },
    { label: "switch off", app: "primitives-dialogs--automations-story", appCrop: "[data-slot=switch][data-unchecked] >> nth=0", avenueCrop: "[aria-label='Off, default']" },
  ],
  "components-switch--settings-row": [
    { label: "switch on", app: "primitives-dialogs--automations-story", appCrop: "[data-slot=switch][data-checked] >> nth=0", avenueCrop: "[data-slot=switch]" },
  ],

  // ---- Table (AVE-6)
  "components-table--default": [
    {
      label: "column header",
      app: "dues-table--default",
      appCrop: "[data-slot=table-head] >> nth=2",
      avenueCrop: "[data-slot=table-head] >> nth=1",
      allow: [
        { prop: "padding-*", because: DUES_TABLE },
        { prop: "background-color", because: DUES_TABLE },
        { prop: "color", because: DUES_TABLE },
        { prop: "font-*", because: DUES_TABLE },
        { prop: "line-height", because: DUES_TABLE },
        { prop: "height", because: DUES_TABLE },
        { prop: "parts", because: "app: app/ui/components/dues-table.tsx: the Dues table's headers are sort buttons" },
      ],
    },
    {
      label: "body cell",
      app: "dues-table--default",
      appCrop: "[data-slot=table-body] [data-slot=table-cell] >> nth=2",
      avenueCrop: "[data-slot=table-body] [data-slot=table-cell] >> nth=1",
      allow: [
        { prop: "padding-*", because: DUES_TABLE },
        { prop: "background-color", because: DUES_TABLE },
        { prop: "font-weight", because: "app: app/ui/components/dues-table.tsx: the Dues table's address cell is a hover-card link; the story's first cell is a bold address" },
        { prop: "height", because: DUES_TABLE },
        { prop: "parts", because: "app: app/ui/components/dues-table.tsx: the Dues table's address cell is a hover-card link" },
      ],
    },
  ],

  // ---- Toast (AVE-8)
  ...Object.fromEntries(
    ["success", "success-with-action", "action-runs", "action-keeps-it-while-focused", "error-shown", "error-stays", "new-replaces-current"].map((story) => [
      `components-toast--${story}`,
      {
        none: "The app's Toast stories raise a toast only inside their play function and it has left by the time the story reports rendered, so there is no resting toast to capture. Compared by eye when AVE-8 ported it.",
      },
    ]),
  ),

  // ---- App controls ported in AVE-8 part 2: each app story has an Avenue story of the same name
  "components-chip--selected-beside-unselected": [
    { label: "selected chip", app: "primitives-chip--pressed", appCrop: "[aria-pressed=true] >> nth=0", avenueCrop: "[aria-pressed=true] >> nth=0", allow: CHIP_CHECK.filter((a) => !a.because.startsWith("AVE-56")) },
    { label: "unselected chip", app: "primitives-chip--default", appCrop: "[aria-pressed=false] >> nth=0", avenueCrop: "[aria-pressed=false] >> nth=0", allow: CHIP },
  ],
  "components-chip--filter-row": [{ label: "filter row", app: "primitives-chip--filter-row", avenueCrop: "[data-slot=chip-row]", allow: CHIP }],
  "components-chip--press-by-keyboard": { none: BEHAVIOUR("Chip / Selected beside unselected") },
  "components-chip--scrolling-row-on-a-phone": { none: "The chip row at phone width, scrolling sideways (AVE-22); the app has no phone story of it. Compared through Chip / Filter row." },
  "components-modetoggle--default": [
    { label: "dev toggle", app: "primitives-modetoggle--default", appCrop: "[data-slot=toggle-group-item] >> nth=0", avenueCrop: "[data-slot=toggle] >> nth=0", allow: MODE_DEV },
    { label: "theme control", app: "primitives-modetoggle--default", appCrop: "[data-slot=toggle-group] >> nth=1", avenueCrop: "[data-slot=segmented-control]", frame: true },
    { label: "chosen theme", app: "primitives-modetoggle--default", appCrop: "[data-slot=toggle-group] >> nth=1 >> [data-slot=toggle-group-item][aria-pressed=true]", avenueCrop: "[data-slot=segmented-control-item][aria-checked=true]", allow: MODE_SEGMENT },
  ],
  "components-modetoggle--dev-dark": [
    { label: "dev toggle", app: "primitives-modetoggle--dev-dark", appCrop: "[data-slot=toggle-group-item] >> nth=0", avenueCrop: "[data-slot=toggle] >> nth=0", allow: MODE_DEV },
    { label: "theme control", app: "primitives-modetoggle--dev-dark", appCrop: "[data-slot=toggle-group] >> nth=1", avenueCrop: "[data-slot=segmented-control]", frame: true },
    { label: "chosen theme", app: "primitives-modetoggle--dev-dark", appCrop: "[data-slot=toggle-group] >> nth=1 >> [data-slot=toggle-group-item][aria-pressed=true]", avenueCrop: "[data-slot=segmented-control-item][aria-checked=true]", allow: MODE_SEGMENT },
  ],
  "components-modetoggle--system": [
    { label: "dev toggle", app: "primitives-modetoggle--system", appCrop: "[data-slot=toggle-group-item] >> nth=0", avenueCrop: "[data-slot=toggle] >> nth=0", allow: MODE_DEV },
    { label: "theme control", app: "primitives-modetoggle--system", appCrop: "[data-slot=toggle-group] >> nth=1", avenueCrop: "[data-slot=segmented-control]", frame: true },
    { label: "chosen theme", app: "primitives-modetoggle--system", appCrop: "[data-slot=toggle-group] >> nth=1 >> [data-slot=toggle-group-item][aria-pressed=true]", avenueCrop: "[data-slot=segmented-control-item][aria-checked=true]", allow: MODE_SEGMENT },
  ],
  "components-modetoggle--without-dev": { none: "The mode toggle without the Dev segment; the app's stories always show it. The segments are compared through ModeToggle / Default." },
  "components-modetoggle--by-keyboard": { none: BEHAVIOUR("ModeToggle / Default") },
  "components-navtab--default": [{ label: "nav tab", app: "primitives-navtab--default", allow: NAV_TAB }],
  "components-navtab--current": [{ label: "current nav tab", app: "primitives-navtab--current", allow: NAV_TAB }],
  "components-navtab--with-count": [{ label: "nav tab with count", app: "primitives-navtab--with-count", allow: NAV_TAB }],
  "components-navtab--sections": { none: "A column of nav tabs as the sidebar sections; the app shows its sidebar only inside full screens. Each tab is compared through NavTab / Default, Current and With count." },
  "components-navtab--as-router-link": { none: BEHAVIOUR("NavTab / Default") },
  "components-searchinput--default": [{ label: "search input", app: "primitives-searchinput--default", allow: SEARCH }],
  "components-searchinput--with-shortcut": [
    { label: "search input with shortcut", app: "primitives-searchinput--with-shortcut", avenueCrop: "[data-slot=search-input]", allow: SEARCH },
  ],
  "components-searchinput--filled": { none: STATE_ONLY("a search input with text in it", "SearchInput / Default") },
  "components-toolbarbutton--icon": [{ label: "icon toolbar button", app: "primitives-toolbarbutton--icon", allow: TOOLBAR }],
  "components-toolbarbutton--with-label": [{ label: "toolbar button with label", app: "primitives-toolbarbutton--with-label", allow: TOOLBAR }],
  "components-toolbarbutton--group": [
    { label: "toolbar button group", app: "primitives-toolbarbutton--group", allow: [...TOOLBAR, { prop: "*-gap", where: "root", app: "4px", avenue: "8px", because: "AVE-2 §1: controls in a toolbar are --space-group, 8px, apart" }] },
  ],

  // ---- Toggle and toggle group (AVE-6)
  "components-toggle--variants": {
    none: "The app's only Toggles are the filter chips, which Avenue builds as Chip (AVE-8); the plain shadcn Toggle has no counterpart in the app. Chip is compared through Chip / Selected beside unselected and Filter row.",
  },
  "components-toggle--keyboard": { none: BEHAVIOUR("Toggle group / Variants") },
  "components-toggle-group--variants": [
    { label: "segmented control", app: "primitives-modetoggle--default", appCrop: "[data-slot=toggle-group] >> nth=1", avenueCrop: "[data-slot=segmented-control] >> nth=1", frame: true },
    {
      label: "selected segment",
      app: "primitives-modetoggle--default",
      appCrop: "[data-slot=toggle-group] >> nth=1 >> [data-slot=toggle-group-item][aria-pressed=true]",
      avenueCrop: "[data-slot=segmented-control] >> nth=0 >> [data-slot=segmented-control-item][aria-checked=true]",
      allow: [
        { prop: "border-*-radius", because: "AVE-2 §4: a segment inside the control's corner takes the concentric sm/md corner instead of the app's square middle segment" },
        { prop: "border-left-width", because: "AVE-2 §4: Avenue's segments are separate rounded items, each with its own border" },
        { prop: "*-gap", app: "6px", avenue: "4px", because: GRID_ICON_GAP },
        { prop: "parts", because: "app: app/ui/components/ModeToggle.tsx: the app's theme segments show an icon beside the label" },
      ],
    },
    {
      label: "unselected segment",
      app: "primitives-modetoggle--default",
      appCrop: "[data-slot=toggle-group] >> nth=1 >> [data-slot=toggle-group-item][aria-pressed=false] >> nth=0",
      avenueCrop: "[data-slot=segmented-control] >> nth=0 >> [data-slot=segmented-control-item][aria-checked=false] >> nth=0",
      allow: [
        { prop: "border-*-radius", because: "AVE-2 §4: a segment inside the control's corner takes the concentric sm/md corner instead of the app's square middle segment" },
        { prop: "*-gap", app: "6px", avenue: "4px", because: GRID_ICON_GAP },
        { prop: "parts", because: "app: app/ui/components/ModeToggle.tsx: the app's theme segments show an icon beside the label" },
      ],
    },
  ],
  "components-toggle-group--keyboard": { none: BEHAVIOUR("Toggle group / Variants") },
  "components-toggle-group--keyboard-multiple": { none: BEHAVIOUR("Toggle group / Variants") },
  "components-toggle-group--phone": { none: "The segmented control at phone width (AVE-33); the app's segmented controls are desktop-only. Compared through Toggle group / Variants." },

  // ---- Composites part 2 (AVE-9)
  "composites-page-header--desktop-minimum": [
    { label: "page header frame", app: "detail-pieces--page-header-story", appCrop: "header:has(h1) >> nth=0", avenueCrop: "[data-slot=page-header]", frame: true },
    { label: "page title", app: "detail-pieces--page-header-story", appCrop: "header h1 >> nth=0", avenueCrop: "[data-slot=page-header] h1", allow: [
      { prop: "line-height", avenue: "30px", because: "AVE-70: Avenue's page title sits on a 30px line; the app's on 24px (20px on the desktop scale)" },
      { prop: "height", avenue: "30px", because: "AVE-70: Avenue's page title sits on a 30px line; the app's on 24px (20px on the desktop scale)" },
      { prop: "*-gap", app: "0px", avenue: "8px", because: "AVE-70: Avenue's title is a flex row that can hold a count (the count is new; the gap shows only with one)" },
      { prop: "parts", because: "AVE-70: Avenue's page header story shows a count beside the title; the app's PageHeader has none" },
    ] },
  ],
  "composites-page-header--wide": { none: "The page header inside the 1280px page frame; the frame is the page's, and the header is compared through Page header / Desktop minimum." },
  "composites-page-header--phone": { none: "The page header at phone width with its actions wrapped under the title; the desktop app has no phone story. Compared through Page header / Desktop minimum." },
  "composites-page-header--reading-width-long-title": { none: "A long title wrapping inside the 768px reading frame; the app has no such story. Compared through Page header / Desktop minimum." },
  "composites-section-card--desktop-minimum": [
    { label: "section card frame", app: "detail-pieces--people", appCrop: "[data-slot=card] >> nth=0", avenueCrop: "[data-slot=card] >> nth=0", frame: true, allow: [
      { prop: "box-shadow", because: "AVE-70: Avenue's SectionCard outline is Card's ring-foreground/10; the app's section card uses ring-border" },
    ] },
    { label: "section card title", app: "detail-pieces--people", appCrop: "[data-slot=card-title] >> nth=0", avenueCrop: "[data-slot=card-title] h2 >> nth=0", allow: DESKTOP_TITLE },
  ],
  "composites-section-card--detail-list-story": [
    { label: "detail label", app: "detail-pieces--people", appCrop: "dl >> nth=0 >> dt >> nth=0", avenueCrop: "[data-slot=detail-list] dt >> nth=0" },
    { label: "detail value", app: "detail-pieces--people", appCrop: "dl >> nth=0 >> dd >> nth=0", avenueCrop: "[data-slot=detail-list] dd:not(:has([data-slot=money])) >> nth=0" },
  ],
  "composites-section-card--wide": { none: "Two columns of section cards inside the 1280px frame; the columns are the page's layout. Each card is compared through Section card / Desktop minimum." },
  "composites-icon-tile--tones": [
    { label: "money-in icon tile (success)", app: "components-activity--board", appCrop: "span.size-9:not(:has(span)) >> nth=0", avenueCrop: "[data-slot=icon-tile] >> nth=1" },
  ],
  "composites-icon-tile--phone-row": { none: "An icon tile in a feed row at phone width; the app has no phone story. The tile is compared through Icon tile / Tones." },

  // ---- Composites part 3: the Register (AVE-9)
  "composites-register--wide": [
    { label: "column header", app: "households-table--default", appCrop: "#storybook-root thead th:nth-child(3) >> nth=0", avenueCrop: "#storybook-root thead th:nth-child(3) >> nth=0", allow: REGISTER_HEADER },
    { label: "street bar", app: "households-table--default", appCrop: "#storybook-root tbody tr:first-child td >> nth=0", avenueCrop: "[data-slot=register-body] tr:first-child td >> nth=0", allow: [STREET_TOTAL] },
    { label: "row cell", app: "households-table--default", appCrop: "#storybook-root tbody tr:nth-child(2) td:nth-child(2) >> nth=0", avenueCrop: "[data-slot=register-body] tr:nth-child(2) td:nth-child(2) >> nth=0", allow: ADDRESS_CELL },
  ],
  "composites-register--compact": [
    { label: "compact row cell", app: "households-table--compact", appCrop: "#storybook-root tbody tr:nth-child(2) td:nth-child(2) >> nth=0", avenueCrop: "[data-slot=register-body] tr:nth-child(2) td:nth-child(2) >> nth=0", allow: ADDRESS_CELL },
  ],
  "composites-register--normal-and-comfortable": { none: "The Register at normal and comfortable density, stacked; each row height is compared through Register / Wide (normal) and asserted in the story (48 and 52)." },
  "composites-register--desktop-minimum": { none: BEHAVIOUR("Register / Wide") },
  "composites-register--sort-popover": { none: BEHAVIOUR("Register / Wide") },
  "composites-register--row-action-dialog-then-tab": { none: BEHAVIOUR("Register / Wide and Alert dialog / Open") },
  "composites-register--row-action-clicked-dialog-then-tab": { none: BEHAVIOUR("Register / Wide and Alert dialog / Open") },
  "composites-register--click-moves-the-stop": { none: BEHAVIOUR("Register / Wide") },
  "composites-register--rows-go-away": { none: BEHAVIOUR("Register / Wide") },
  "composites-register--field-keeps-its-keys": { none: BEHAVIOUR("Register / Wide and Input / Default") },

  // ---- Composites (AVE-9)
  "composites-form-dialog--open": [
    { label: "form dialog frame", app: "dues-dialogs--adjustment", appCrop: "[data-slot=dialog-content]", avenueCrop: "[data-slot=dialog-content]", frame: true },
    { label: "form dialog header", app: "dues-dialogs--adjustment", appCrop: "[data-slot=dialog-header]", avenueCrop: "[data-slot=dialog-header]", frame: true, allow: [
      { prop: "padding-left", app: "20px", avenue: "16px", because: DIALOG_INSET },
      { prop: "padding-right", app: "20px", avenue: "48px", because: "AVE-61: the form dialog header keeps 48px on the right, clear of the close button; the app's keeps 20px" },
    ] },
    { label: "form dialog footer", app: "dues-dialogs--adjustment", appCrop: "[data-slot=dialog-footer]", avenueCrop: "[data-slot=dialog-footer]", frame: true, allow: [
      { prop: "padding-left", app: "20px", avenue: "16px", because: DIALOG_INSET },
      { prop: "padding-right", app: "20px", avenue: "16px", because: DIALOG_INSET },
    ] },
  ],
  "composites-form-dialog--long-form": { none: "The same form dialog as Form dialog / Open with more fields, to show scrolling; compared there." },
  "composites-form-dialog--with-error": { none: "Form dialog / Open with a save error; the dialog is compared there and the error text through Field / Invalid." },
  "composites-form-dialog--pending": { none: "Form dialog / Open while saving; compared there." },
  "composites-form-dialog--ask-admin": { none: "Form dialog / Open for a board member; compared there, and the ask-admin line through Ask admin / In a dialog footer." },
  "composites-form-dialog--discard-guard": { none: BEHAVIOUR("Form dialog / Open and Alert dialog / Open") },
  "composites-form-dialog--discard-guard-keep-editing": { none: BEHAVIOUR("Form dialog / Open") },
  "composites-form-dialog--escape-when-clean": { none: BEHAVIOUR("Form dialog / Open") },
  "composites-form-dialog--keyboard-flow": { none: BEHAVIOUR("Form dialog / Open") },
  "composites-pending-confirm-dialog--ready": [
    { label: "confirm dialog frame", app: "primitives-deleteaccount--allowed", appCrop: "[data-slot=dialog-content]", avenueCrop: "[data-slot=alert-dialog-content]", frame: true, allow: [{ prop: "padding-*", app: "0px", avenue: "16px", because: SECTIONED_DIALOG }] },
  ],
  "composites-pending-confirm-dialog--pending": { none: "Pending confirm dialog / Ready while the action runs; compared there." },
  "composites-pending-confirm-dialog--unknown-check-first": { none: "Pending confirm dialog / Ready with a couldn't-confirm note; compared there." },
  "composites-pending-confirm-dialog--keyboard-flow": { none: BEHAVIOUR("Pending confirm dialog / Ready") },
};
