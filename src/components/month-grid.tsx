import { addDays, daysBetween, formatDate, monthNames, weekdayNames } from "@ui-sdk/core/date";
import { createParts } from "@ui-sdk/react/primitive";
import { createContext, Fragment, useContext, type ComponentProps, type ReactNode } from "react";
import { devError } from "#avenue/lib/dev";
import { monthGrid } from "#avenue/lib/month-grid";
import { defined, type Loose } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

// ui-sdk 0.1 beta types definePrimitive's `options` as `Record | undefined`, which createParts' `Primitive` refuses
// under exactOptionalPropertyTypes; this grid always has options, so narrow it. Remove when ui-sdk fixes the type.
const typed = monthGrid as typeof monthGrid & { options: NonNullable<typeof monthGrid.options> };
const parts = createParts(typed, { root: "div", row: "div", columnheader: "div", cell: "div" });

/** What a day's children function gets, as ui-sdk's CalendarDay hands its cell's state. */
export type MonthGridDayState = {
  /** The day, as an ISO date. */
  date: string;
  /** Today. */
  today: boolean;
  /** Before today. */
  past: boolean;
  /** The 1st of a month, whose number is drawn with the month's name. */
  first: boolean;
};

export type MonthGridProps = Omit<Loose<ComponentProps<typeof parts.Root>>, "children" | "start" | "weeks"> & {
  /** The first week's Sunday, as an ISO date. */
  start: string;
  weeks: number;
  /** Today, as an ISO date: its day is tinted, its number filled, and it carries aria-current. */
  today: string;
  /**
   * Each day, as a function of its state: return a `MonthGridDay` for it, with what it holds as children (AVE-149),
   * as ui-sdk's CalendarWeeks takes its days. Leave it out and every day is drawn empty.
   */
  children?: ((day: MonthGridDayState) => ReactNode) | undefined;
  /**
   * What a day holds under its number, such as the trigger of a popover over its items.
   * @deprecated Use the children function and `<MonthGridDay value={day.date}>…</MonthGridDay>` (v0.30.0, AVE-149).
   */
  renderDay?: ((date: string) => ReactNode) | undefined;
  /** Each week's height in pixels. The board's is 112: room for two chips, or one and "+N more". */
  rowHeight?: number | undefined;
  /** The language of the weekday and day names. Defaults to the page's. */
  locale?: string | undefined;
  /** Runs when the arrows go past the first or last week: add weeks there, and focus lands on the day it was going to. */
  onExtend?: ((direction: "earlier" | "later") => void) | undefined;
};

type GridContextValue = { start: string; today: string; locale: string | undefined; months: string[] };
const GridContext = createContext<GridContextValue | null>(null);

/** The square inset ring on a focused day, or on the day around its focused control, as the Register's cells. */
const ring =
  "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-ring";

/**
 * The board's month view (AVE-121): weeks of seven days under a sticky row of weekday names, each day showing its
 * number and what the app puts under it. One Tab stop for the whole month; the arrows move between days (the
 * `month-grid` primitive in src/lib/month-grid.ts has the keys). Each day is a gridcell named by its full date, read from hidden text rather than aria-label, so a day's own content stays part of its name (axe's label-content-name-mismatch).
 *
 * It draws the weeks it's given and no scroll of its own: put it in the app's scroll region, which follows the month
 * in view and adds weeks near either end, as the board's Activity month does. The weekday row sticks to that
 * region's top.
 *
 * The look is the board's: hairline cells, today tinted primary-subtle with its number filled, past days' numbers
 * muted, the 1st of a month named ("Nov 1"). Padding is on AVE-2's grid: 8px in a day (the board's 6px).
 *
 *   MonthGrid                 root: the weeks, and a function that draws each day
 *   └── MonthGridDay          one day: its number, its full date for screen readers, and what it holds
 */
export function MonthGrid({
  start,
  weeks,
  today,
  children,
  renderDay,
  rowHeight = 112,
  locale,
  onExtend,
  className,
  ...props
}: MonthGridProps) {
  const short = weekdayNames(locale, "short", 0);
  const long = weekdayNames(locale, "long", 0);
  const months = monthNames(locale, "short");
  const rows = Array.from({ length: weeks }, (_, row) => row);
  const day =
    children ?? ((state: MonthGridDayState) => <MonthGridDay value={state.date}>{renderDay?.(state.date)}</MonthGridDay>);
  return (
    <GridContext.Provider value={{ start, today, locale, months }}>
      <parts.Root
        start={start}
        weeks={weeks}
        {...defined({ onExtend })}
        className={cn("text-meta", className)}
        {...defined(props)}
      >
        <parts.Row className="sticky top-0 z-10 grid grid-cols-7 border-b bg-background text-muted-foreground">
          {short.map((name, i) => (
            <parts.Columnheader
              key={long[i]}
              aria-label={long[i]}
              className="px-2 py-2 text-start text-[11px] font-[550] tracking-wider uppercase"
            >
              {name}
            </parts.Columnheader>
          ))}
        </parts.Row>
        {rows.map((row) => (
          <parts.Row key={row} className="grid grid-cols-7 border-l" style={{ height: rowHeight }}>
            {Array.from({ length: 7 }, (_, col) => {
              const date = addDays(start, row * 7 + col);
              const state = { date, today: date === today, past: date < today, first: date.endsWith("-01") };
              return <Fragment key={`${date}:${row}`}>{day(state)}</Fragment>;
            })}
          </parts.Row>
        ))}
      </parts.Root>
    </GridContext.Provider>
  );
}

/**
 * One day of the month: its number (the month's name on the 1st), its full date for screen readers, then its
 * children. A day given content passes focus to the first button or link in it; a day with none takes focus itself.
 */
export function MonthGridDay({
  value: date,
  children,
  className,
  ...props
}: Omit<Loose<ComponentProps<typeof parts.Cell>>, "row" | "col" | "control" | "children"> & {
  /** The day, as an ISO date: the `date` the children function was given. */
  value: string;
  children?: ReactNode;
}) {
  const grid = useContext(GridContext);
  if (!grid) {
    devError("Avenue: MonthGridDay draws nothing outside a MonthGrid; return it from MonthGrid's children function.");
    return null;
  }
  const { start, today, locale, months } = grid;
  const index = daysBetween(start, date);
  const row = Math.floor(index / 7);
  const col = index % 7;
  const control = children !== undefined && children !== null && children !== false;
  const isToday = date === today;
  const first = date.endsWith("-01");
  const day = Number(date.slice(8));
  return (
    <parts.Cell
      // A new date or a new control in the same place binds again, so focus never lands on a stale element.
      key={`${date}:${row}:${control}`}
      id={`${date}:${row}:${control}`}
      row={row}
      col={col}
      control={control}
      aria-current={isToday ? "date" : undefined}
      data-date={date}
      data-today={isToday ? "" : undefined}
      className={cn(
        "flex min-w-0 scroll-mt-9 flex-col gap-1 overflow-hidden border-r border-b p-2",
        isToday && "bg-primary-subtle/50",
        ring,
        className,
      )}
      {...defined(props)}
    >
      <span
        aria-hidden
        className={cn(
          "grid h-6 min-w-6 place-items-center self-start rounded-full px-1 whitespace-nowrap",
          isToday
            ? "bg-primary font-[600] text-primary-foreground"
            : date < today
              ? "text-muted-foreground"
              : "text-foreground",
          first && !isToday && "font-[600] text-foreground",
        )}
      >
        {first ? `${months[Number(date.slice(5, 7)) - 1]} ${day}` : day}
      </span>
      <span className="sr-only">{formatDate(date, locale)}</span>
      {control && children}
    </parts.Cell>
  );
}
