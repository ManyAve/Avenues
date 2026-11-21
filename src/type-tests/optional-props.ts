/**
 * AVE-108: every optional prop of every Avenue component also takes `undefined`, so an app with
 * `exactOptionalPropertyTypes` on (Management) can pass a maybe-undefined value straight through.
 * It runs in `bun run typecheck`: a prop that rejects undefined fails to compile here, naming its file, component and
 * prop. Every file in src/components is listed in Modules; scripts/optional-props.test.ts fails if one is missing.
 */
import type { ComponentProps, ReactNode } from "react";
import type * as alertDialog from "#avenue/components/alert-dialog";
import type * as askAdmin from "#avenue/components/ask-admin";
import type * as autocomplete from "#avenue/components/autocomplete";
import type * as avatar from "#avenue/components/avatar";
import type * as badge from "#avenue/components/badge";
import type * as button from "#avenue/components/button";
import type * as card from "#avenue/components/card";
import type * as calendar from "#avenue/components/calendar";
import type * as callout from "#avenue/components/callout";
import type * as checkbox from "#avenue/components/checkbox";
import type * as chip from "#avenue/components/chip";
import type * as choiceCard from "#avenue/components/choice-card";
import type * as collapsibleSection from "#avenue/components/collapsible-section";
import type * as combobox from "#avenue/components/combobox";
import type * as command from "#avenue/components/command";
import type * as composer from "#avenue/components/composer";
import type * as dateInput from "#avenue/components/date-input";
import type * as datePicker from "#avenue/components/date-picker";
import type * as detailList from "#avenue/components/detail-list";
import type * as dialog from "#avenue/components/dialog";
import type * as displayOptions from "#avenue/components/display-options";
import type * as dock from "#avenue/components/dock";
import type * as drawer from "#avenue/components/drawer";
import type * as emptyState from "#avenue/components/empty-state";
import type * as field from "#avenue/components/field";
import type * as fileField from "#avenue/components/file-field";
import type * as formDialog from "#avenue/components/form-dialog";
import type * as hoverCard from "#avenue/components/hover-card";
import type * as iconTile from "#avenue/components/icon-tile";
import type * as initialsAvatar from "#avenue/components/initials-avatar";
import type * as inlineMessage from "#avenue/components/inline-message";
import type * as input from "#avenue/components/input";
import type * as menu from "#avenue/components/menu";
import type * as messageList from "#avenue/components/message-list";
import type * as modeToggle from "#avenue/components/mode-toggle";
import type * as preferences from "#avenue/components/preferences";
import type * as message from "#avenue/components/message";
import type * as money from "#avenue/components/money";
import type * as monthGrid from "#avenue/components/month-grid";
import type * as navTab from "#avenue/components/nav-tab";
import type * as pageHeader from "#avenue/components/page-header";
import type * as pendingConfirmDialog from "#avenue/components/pending-confirm-dialog";
import type * as popover from "#avenue/components/popover";
import type * as progress from "#avenue/components/progress";
import type * as radioGroup from "#avenue/components/radio-group";
import type * as register from "#avenue/components/register";
import type * as searchInput from "#avenue/components/search-input";
import type * as sectionCard from "#avenue/components/section-card";
import type * as select from "#avenue/components/select";
import type * as selectionBar from "#avenue/components/selection-bar";
import type * as skeleton from "#avenue/components/skeleton";
import type * as statusBar from "#avenue/components/status-bar";
import type * as status from "#avenue/components/status";
import type * as switchControl from "#avenue/components/switch";
import type * as table from "#avenue/components/table";
import type * as tableFilter from "#avenue/components/table-filter";
import type * as tabs from "#avenue/components/tabs";
import type * as textarea from "#avenue/components/textarea";
import type * as timeInput from "#avenue/components/time-input";
import type * as toast from "#avenue/components/toast";
import type * as toggleGroup from "#avenue/components/toggle-group";
import type * as toggle from "#avenue/components/toggle";
import type * as toolbarButton from "#avenue/components/toolbar-button";
import type * as toolbar from "#avenue/components/toolbar";
import type * as tooltip from "#avenue/components/tooltip";
import type * as topBar from "#avenue/components/top-bar";

export type Modules = {
  "alert-dialog": typeof alertDialog;
  "ask-admin": typeof askAdmin;
  "autocomplete": typeof autocomplete;
  "avatar": typeof avatar;
  "badge": typeof badge;
  "button": typeof button;
  "card": typeof card;
  "calendar": typeof calendar;
  "callout": typeof callout;
  "checkbox": typeof checkbox;
  "chip": typeof chip;
  "choice-card": typeof choiceCard;
  "collapsible-section": typeof collapsibleSection;
  "combobox": typeof combobox;
  "command": typeof command;
  "composer": typeof composer;
  "date-input": typeof dateInput;
  "date-picker": typeof datePicker;
  "detail-list": typeof detailList;
  "dialog": typeof dialog;
  "display-options": typeof displayOptions;
  "dock": typeof dock;
  "drawer": typeof drawer;
  "empty-state": typeof emptyState;
  "field": typeof field;
  "file-field": typeof fileField;
  "form-dialog": typeof formDialog;
  "hover-card": typeof hoverCard;
  "icon-tile": typeof iconTile;
  "initials-avatar": typeof initialsAvatar;
  "inline-message": typeof inlineMessage;
  "input": typeof input;
  "menu": typeof menu;
  "message-list": typeof messageList;
  "mode-toggle": typeof modeToggle;
  "preferences": typeof preferences;
  "message": typeof message;
  "money": typeof money;
  "month-grid": typeof monthGrid;
  "nav-tab": typeof navTab;
  "page-header": typeof pageHeader;
  "pending-confirm-dialog": typeof pendingConfirmDialog;
  "popover": typeof popover;
  "progress": typeof progress;
  "radio-group": typeof radioGroup;
  "register": typeof register;
  "search-input": typeof searchInput;
  "section-card": typeof sectionCard;
  "select": typeof select;
  "selection-bar": typeof selectionBar;
  "skeleton": typeof skeleton;
  "status-bar": typeof statusBar;
  "status": typeof status;
  "switch": typeof switchControl;
  "table": typeof table;
  "table-filter": typeof tableFilter;
  "tabs": typeof tabs;
  "textarea": typeof textarea;
  "time-input": typeof timeInput;
  "toast": typeof toast;
  "toggle-group": typeof toggleGroup;
  "toggle": typeof toggle;
  "toolbar-button": typeof toolbarButton;
  "toolbar": typeof toolbar;
  "tooltip": typeof tooltip;
  "top-bar": typeof topBar;
};

/** The keys of P that may be left out. */
type OptionalKeys<P> = { [K in keyof P]-?: {} extends Pick<P, K> ? K : never }[keyof P];

/** Each optional key of P that rejects an explicit `undefined` (TS2375 at the call site). Distributes over unions. */
type RejectsUndefined<P> = P extends unknown
  ? { [K in OptionalKeys<P>]: { [Q in K]: undefined } extends Pick<P, K> ? never : K }[OptionalKeys<P>]
  : never;

/** "file › Component › prop" for every component (a capitalised function export) and prop that rejects undefined. */
type Failures = {
  [F in keyof Modules]: {
    [C in keyof Modules[F]]: C extends Capitalize<C & string>
      ? Modules[F][C] extends (props: infer P, ...rest: never[]) => unknown
        ? `${F & string} › ${C & string} › ${RejectsUndefined<P> & string}`
        : never
      : never;
  }[keyof Modules[F]];
}[keyof Modules];

/** Fails to compile while any optional prop rejects undefined; the error names the first such prop. */
declare function noneRejectUndefined<_T extends never>(): void;
noneRejectUndefined<Failures>();

// The cases Management hit (AVE-108), spelled out, so the failure reads plainly if the check above ever misses them.
declare const maybe: {
  onClick: (() => void) | undefined;
  onOpenChange: ((open: boolean) => void) | undefined;
  disabled: boolean | undefined;
};
export const managementCases = [
  { onClick: maybe.onClick } satisfies ComponentProps<typeof button.Button>,
  { onOpenChange: maybe.onOpenChange } satisfies ComponentProps<typeof dialog.Dialog>,
  { disabled: maybe.disabled } satisfies ComponentProps<typeof checkbox.Checkbox>,
];

/**
 * A component that puts its children inside markup of its own takes plain children, so an app can pass its own
 * ReactNode children on (AVE-108, "also found").
 */
type Children<C> = C extends (props: infer P) => unknown ? (P extends { children?: infer K } ? K : never) : never;
export const plainChildren: ReactNode[] = [
  null as unknown as Children<typeof badge.Badge>,
  null as unknown as Children<typeof chip.Chip>,
  null as unknown as Children<typeof dialog.DialogContent>,
  null as unknown as Children<typeof alertDialog.AlertDialogContent>,
  null as unknown as Children<typeof drawer.DrawerContent>,
  null as unknown as Children<typeof tooltip.TooltipContent>,
  null as unknown as Children<typeof menu.MenuItem>,
  null as unknown as Children<typeof toggleGroup.ToggleGroup>,
  null as unknown as Children<typeof status.Status>,
  null as unknown as Children<typeof skeleton.Loading>,
  null as unknown as Children<typeof progress.Progress>,
  null as unknown as Children<typeof message.MessageBubble>,
  null as unknown as Children<typeof message.MessageQuote>,
  null as unknown as Children<typeof message.MessageStatus>,
  null as unknown as Children<typeof composer.Composer>,
  null as unknown as Children<typeof composer.ComposerContext>,
];
