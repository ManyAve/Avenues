import { formatDate, todayDate } from "@ui-sdk/react/date";
import { useSyncExternalStore } from "react";
import { fieldControl, type PickerSize } from "#avenue/lib/picker";
import { cn } from "#avenue/lib/utils";

// Internal to Avenue: what DatePicker, DateInput and TimeInput share. lib/ is not a package export.

/**
 * The locale a date field reads, the way ui-sdk's date parts read it: `locale` when given, else the nearest `lang`
 * around `element` once it mounts, else the browser's. English on the server and the first render, as ui-sdk's are.
 */
export function useFieldLocale(element: Element | null, locale: string | undefined) {
  const found = useSyncExternalStore(
    unchanging,
    () => (element ?? document.documentElement).closest("[lang]")?.getAttribute("lang") || navigator.language || "en-US",
    () => "en-US",
  );
  return locale ?? found;
}

// A page's lang is read once per render; it doesn't change while a field is on screen.
const unchanging = () => () => {};

/** What each kind of field asks for, in its error: "Enter a date like 31/12/2026". */
export type DateFieldKind = "date" | "date-time" | "time";

/**
 * An example value in the locale's own order, digits padded as the field shows them. A date is December 31 of this
 * year, as ui-sdk's DatePickerHint shows it: the day can't be read as a month, so the order is plain.
 */
export function exampleValue(kind: DateFieldKind, locale: string) {
  const year = todayDate().slice(0, 4);
  const date = { day: "2-digit", month: "2-digit", year: "numeric" } as const;
  const time = { hour: "2-digit", minute: "2-digit" } as const;
  if (kind === "time") return new Intl.DateTimeFormat(locale, time).format(new Date(2000, 0, 1, 14, 30));
  if (kind === "date") return formatDate(`${year}-12-31`, locale, date);
  return new Intl.DateTimeFormat(locale, { ...date, ...time }).format(new Date(Number(year), 11, 31, 14, 30));
}

/** The error a date field shows when its text isn't one it takes: "Enter a date like 31/12/2026". */
export function exampleMessage(kind: DateFieldKind, locale: string) {
  const what = kind === "date" ? "a date" : kind === "time" ? "a time" : "a date and time";
  return `Enter ${what} like ${exampleValue(kind, locale)}`;
}

/**
 * A segment of DateInput and TimeInput: a borderless input the width of its digits, inside the field's box. The focused
 * segment takes the list highlight (`bg-accent`), the empty one shows its dashes in the placeholder colour, and the
 * text between segments is muted. An <input> can't carry `hit-area`, so each segment is its own target: at least 24px
 * wide and the field's height with a mouse, 44 x 44px on a phone.
 */
export const segmentClass = cn(
  "rounded-xs bg-transparent px-0.5 text-center tabular-nums caret-transparent outline-none field-sizing-content",
  "placeholder:text-placeholder focus:bg-accent focus:text-accent-foreground",
  "data-[type=literal]:px-0 data-[type=literal]:text-muted-foreground",
  "not-data-[type=literal]:min-h-6 not-data-[type=literal]:min-w-6 not-data-[type=literal]:self-stretch",
  "pointer-coarse:not-data-[type=literal]:min-h-11 pointer-coarse:not-data-[type=literal]:min-w-11",
  "disabled:cursor-not-allowed",
);

/**
 * The segmented field's box: the control surface, growing to a second line rather than cutting off its value. On a
 * phone its segments are 44px tall inside the border, so the box is 46px; phones get the OS picker by default.
 */
export function segmentedField(size: PickerSize = "md") {
  return cn(
    fieldControl({ size }),
    "h-auto flex-wrap gap-0 py-0.5 pointer-coarse:py-0",
    size === "sm" ? "min-h-control-sm" : "min-h-control-md",
    "data-disabled:cursor-not-allowed",
  );
}
