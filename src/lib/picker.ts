import { controlSize, controlSurface, type ControlSize } from "#avenue/lib/control";
import { popupMotion, sheetHandle } from "#avenue/lib/popup";
import { cn } from "#avenue/lib/utils";

// Internal to Avenue: the shared look of Select and Combobox. lib/ is not a package export, so none of this is
// public API.

/** Select and Combobox come in md (32px, lg corner, the default) and sm (28px, md corner, for a card or dialog header). */
export type PickerSize = Extract<ControlSize, "sm" | "md">;

/** How the list opens: ui-sdk's presentation setting (AVE-39). */
export type Presentation = "auto" | "popover" | "sheet";

/**
 * The closed field every value picker shares (Select trigger, native Select, Combobox input group): Avenue's control
 * surface and size (#avenue/lib/control), plus the states a wrapper needs. Base UI's Field marks an invalid Select
 * trigger with data-invalid, and a Combobox's invalid input sits inside the group, so both show the invalid ring.
 * Text size comes from controlSurface: 16px on phones so iOS doesn't zoom, text-control (14px) from 768px up.
 */
export function fieldControl({ size = "md" }: { size?: PickerSize | null | undefined } = {}) {
  return cn(
    controlSurface,
    controlSize({ size: size ?? "md" }),
    "flex items-center gap-2 text-foreground",
    // Icons follow the control size, as Button's do (AVE-84): 16px in an md field, 14px in an sm one. The chevron,
    // the Combobox's up-down chevron and a leading icon all take it, so Select and Combobox can't drift apart.
    size === "sm" ? "[&_svg:not([class*='size-'])]:size-3.5" : "[&_svg:not([class*='size-'])]:size-4",
    "data-invalid:border-destructive data-invalid:ring-3 data-invalid:ring-destructive/20 dark:data-invalid:border-destructive/50 dark:data-invalid:ring-destructive/40",
    "has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/20",
    "forced-colors:has-[input:focus-visible]:outline-2 forced-colors:has-[input:focus-visible]:outline-offset-2 forced-colors:has-[input:focus-visible]:outline-solid",
    "has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40",
  );
}

/**
 * The open list's frame: the app's menu look (lg corner, popover colours, ring). As wide as its field, never narrower
 * than 192px (UI Designer, AVE-7); long options wrap.
 */
export const listPopup = cn(
  popupMotion,
  "max-h-[min(20rem,var(--available-height))] w-(--anchor-width) min-w-48 max-w-(--available-width) overflow-y-auto overscroll-contain rounded-lg bg-popover p-1 text-popover-foreground shadow-popover ring-1 ring-border outline-none",
  listSheet(),
);

/**
 * The same list presenting as a sheet (AVE-39): `presentation="auto"` turns it into one on a small touch screen, as
 * ui-sdk decides each time it opens. It takes Drawer's bottom-sheet look (`sheet-bottom` in avenue.css: the 512px
 * measure, 14px top corners, home-indicator padding) and its handle, and dims the page as Dialog and Drawer do. The
 * sheet slides itself, so the popover's scale and fade are off. The list inside scrolls; the handle stays put. 8px at
 * the sides puts each row's check on the page's 16px line.
 */
export function listSheet() {
  return "sheet:sheet-bottom sheet:relative sheet:flex sheet:flex-col sheet:gap-2 sheet:overflow-hidden sheet:px-2 sheet:pt-inset sheet:shadow-none sheet:[--sheet-backdrop:rgb(0_0_0/0.1)] sheet:transition-none sheet:data-starting-style:scale-100 sheet:data-starting-style:opacity-100 sheet:data-ending-style:scale-100 sheet:data-ending-style:opacity-100";
}

/** The part of the list that scrolls inside a sheet. In a popover the whole frame scrolls, so it adds nothing there. */
export const listScroll = "sheet:min-h-0 sheet:flex-1 sheet:overflow-y-auto sheet:overscroll-contain";

/**
 * The sheet's drag handle, shown only while the list presents as a sheet. Always first: a Combobox's search field moves
 * into the sheet ahead of it.
 */
export const listSheetHandle = cn(sheetHandle, "hidden sheet:order-first sheet:block");

/**
 * One row in that list: sm corner, inset 4px inside the lg frame (AVE-2 section 4). 44px tall on phones (AVE-22), and
 * in a sheet whatever the pointer (AVE-39).
 */
export const listItem =
  "grid pointer-coarse:min-h-11 sheet:min-h-11 cursor-default grid-cols-[1rem_1fr] items-center gap-x-2 rounded-sm px-2 py-1 text-control outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50";


/**
 * One entry of `items`, in ui-sdk's shape (`ListItem` from `@ui-sdk/react/select`), with optional props that also take
 * `undefined` (AVE-108). `value` is a string, or any value with `itemToValue`.
 */
export type ListItem<T = string> = {
  value: T;
  /** The text shown, and matched by typing and searching. */
  label: string;
  /** More words a search matches, like a spreadsheet ID. */
  keywords?: string[] | undefined;
  disabled?: boolean | undefined;
};

/** A labelled group of items, as ui-sdk's `ListGroup`. */
export type ListGroup<T = string, Item extends ListItem<T> = ListItem<T>> = {
  type: "group";
  label?: string | undefined;
  items: readonly (Item | (T & string))[];
};

/** A line between items or groups, as ui-sdk's `ListSeparator`. */
export type ListSeparator = { type: "separator" };

/** `items` as ui-sdk takes them: items, plain strings (value and label at once), groups and separators. */
export type ListData<T = string, Item extends ListItem<T> = ListItem<T>> = readonly (
  | Item
  | ListGroup<T, Item>
  | ListSeparator
  | (T & string)
)[];

type Entry<T, Item extends ListItem<T>> = ListData<T, Item>[number];

export const isGroup = <T, Item extends ListItem<T>>(entry: Entry<T, Item>): entry is ListGroup<T, Item> =>
  typeof entry === "object" && "type" in entry && entry.type === "group";

export const isSeparator = <T, Item extends ListItem<T>>(entry: Entry<T, Item>): entry is ListSeparator =>
  typeof entry === "object" && "type" in entry && entry.type === "separator";

/** A plain string entry is its own value and label. */
export function toItem<T, Item extends ListItem<T>>(entry: Item | (T & string)): Item {
  return typeof entry === "string" ? ({ value: entry, label: entry } as unknown as Item) : entry;
}

/** Every item in `data`, groups opened, separators left out, in order. */
export function flatItems<T, Item extends ListItem<T>>(data: ListData<T, Item>): Item[] {
  return data.flatMap((entry) =>
    isSeparator(entry) ? [] : isGroup(entry) ? entry.items.map((i) => toItem<T, Item>(i)) : [toItem<T, Item>(entry)],
  );
}

/**
 * The string a value is known and posted by: `itemToValue` when the app gives one, otherwise ui-sdk's own rule
 * (a string is itself, an object its `value` or `id`).
 */
export function valueKey<T>(itemToValue: ((value: T) => string) | undefined) {
  return (value: T): string => {
    if (itemToValue) return itemToValue(value);
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      const v = value as { value?: unknown; id?: unknown };
      return String(v.value ?? v.id);
    }
    return String(value);
  };
}

/** `data` without its `undefined` props, as ui-sdk's `ListData` takes it. */
export function toUiData<T, Item extends ListItem<T>>(data: ListData<T, Item>) {
  const item = (entry: Item | (T & string)) => {
    if (typeof entry === "string") return entry;
    const { value, label, keywords, disabled } = entry;
    return { value, label, ...(keywords ? { keywords } : {}), ...(disabled ? { disabled } : {}) };
  };
  return data.map((entry) =>
    isSeparator(entry)
      ? entry
      : isGroup(entry)
        ? { type: "group" as const, ...(entry.label !== undefined ? { label: entry.label } : {}), items: entry.items.map(item) }
        : item(entry),
  );
}

/** A group's heading inside a Select or Combobox list: in line with the items' text, past the check's column. */
export const listGroupLabel = "px-2 ps-8 py-1 text-xs font-medium text-muted-foreground";

/** The line between groups, as a menu draws it. */
export const listSeparator = "-mx-1 my-1 h-px bg-border";

/**
 * A React key for each entry of `data`: an item's value, a group's label (or its first item), and for a separator,
 * which has no value of its own, the entry before it.
 */
export function entryKeys<T, Item extends ListItem<T>>(data: ListData<T, Item>, keyOf: (value: T) => string): string[] {
  const own = (entry: Entry<T, Item>): string =>
    isSeparator(entry)
      ? "separator"
      : isGroup(entry)
        ? `group-${entry.label ?? (entry.items[0] === undefined ? "" : keyOf(toItem<T, Item>(entry.items[0]).value))}`
        : keyOf(toItem<T, Item>(entry).value);
  return data.map((entry, i) => (isSeparator(entry) ? `separator-after-${i === 0 ? "start" : own(data[i - 1]!)}` : own(entry)));
}
