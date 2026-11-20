import {
  Calendar as CalendarRoot,
  CalendarDay as CalendarDayPrimitive,
  CalendarGrid as CalendarGridPrimitive,
  CalendarHeading as CalendarHeadingPrimitive,
  CalendarNext as CalendarNextPrimitive,
  CalendarPrevious as CalendarPreviousPrimitive,
  CalendarWeekday as CalendarWeekdayPrimitive,
  CalendarWeekdays as CalendarWeekdaysPrimitive,
  CalendarWeeks as CalendarWeeksPrimitive,
  type CalendarDayState,
} from "@ui-sdk/react/calendar";
import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { buttonVariants } from "#avenue/components/button";
import { defined, type Loose, type NodeChildren, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

export type CalendarProps = NodeChildren<Loose<ComponentProps<typeof CalendarRoot>>>;

/**
 * A month to pick a day from (AVE-121), as the board's small month under the Activity title, which jumps to any day.
 * Behavior is ui-sdk's Calendar: the month is one grid with one Tab stop, the arrows move by day and week, Page Up and
 * Down by month (Shift for a year), Home and End to the week's ends, Enter or Space picks. Each day is named by its
 * full date and today carries aria-current. Keys past the month turn it.
 *
 * The look is the board's small month: narrow weekday letters, 28px round days, today filled with the primary colour,
 * days of the months either side muted (the board fades them to 60%, which fails 4.5:1 contrast), a dot under a day that holds something. A picked day takes the primary-subtle
 * fill. On a phone each day grows to 44px, so the calendar needs 308px.
 *
 * ui-sdk's parts, each in Avenue's look (AVE-149). An empty Calendar draws them all, as ui-sdk's does; write them out
 * to fill a day:
 *
 *   Calendar
 *   ├── CalendarHeader        Avenue's row: the month's name, then the arrows
 *   │   ├── CalendarHeading
 *   │   ├── CalendarPrevious
 *   │   └── CalendarNext
 *   └── CalendarGrid
 *       ├── CalendarWeekdays → CalendarWeekday
 *       └── CalendarWeeks    → CalendarDay (children: what sits in the round, such as a CalendarDayMark)
 */
export function Calendar({ className, children, weekdayFormat = "narrow", fixedWeeks = true, ...props }: CalendarProps) {
  return (
    <CalendarRoot
      weekdayFormat={weekdayFormat}
      fixedWeeks={fixedWeeks}
      className={cn("grid w-fit gap-1", className)}
      {...defined(props)}
    >
      {children ?? (
        <>
          <CalendarHeader>
            <CalendarHeading />
            <CalendarPrevious />
            <CalendarNext />
          </CalendarHeader>
          <CalendarGrid>
            <CalendarWeekdays>{(index) => <CalendarWeekday index={index} />}</CalendarWeekdays>
            <CalendarWeeks>
              {(cell) => (
                <CalendarDay value={cell.date} />
              )}
            </CalendarWeeks>
          </CalendarGrid>
        </>
      )}
    </CalendarRoot>
  );
}

/** Avenue's row over the grid: the month's name, then the previous and next arrows at the end. */
export function CalendarHeader({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps({ "data-slot": "calendar-header", className: cn("flex items-center gap-controls ps-1", className) }, defined(props)),
    render,
  );
}

/** The month's name. */
export function CalendarHeading({ className, ...props }: Loose<ComponentProps<typeof CalendarHeadingPrimitive>>) {
  return (
    <CalendarHeadingPrimitive
      className={cn("me-auto text-compact font-[550] whitespace-nowrap", className)}
      {...defined(props)}
    />
  );
}

const step = buttonVariants({ variant: "ghost", size: "icon-sm" });

/** The previous month: a ghost icon button, "Previous month". */
export function CalendarPrevious({ className, children, ...props }: Loose<ComponentProps<typeof CalendarPreviousPrimitive>>) {
  return (
    <CalendarPreviousPrimitive aria-label="Previous month" className={cn(step, className)} {...defined(props)}>
      {children ?? <ChevronLeftIcon aria-hidden className="rtl:rotate-180" />}
    </CalendarPreviousPrimitive>
  );
}

/** The next month: a ghost icon button, "Next month". */
export function CalendarNext({ className, children, ...props }: Loose<ComponentProps<typeof CalendarNextPrimitive>>) {
  return (
    <CalendarNextPrimitive aria-label="Next month" className={cn(step, className)} {...defined(props)}>
      {children ?? <ChevronRightIcon aria-hidden className="rtl:rotate-180" />}
    </CalendarNextPrimitive>
  );
}

/** The month's grid. */
export function CalendarGrid({ className, ...props }: Loose<ComponentProps<typeof CalendarGridPrimitive>>) {
  return <CalendarGridPrimitive className={cn("border-collapse text-center text-meta", className)} {...defined(props)} />;
}

/** A weekday's narrow letter. */
export function CalendarWeekday({ className, ...props }: Loose<ComponentProps<typeof CalendarWeekdayPrimitive>>) {
  return (
    <CalendarWeekdayPrimitive
      className={cn("py-1 text-[11px] font-[550] text-muted-foreground", className)}
      {...defined(props)}
    />
  );
}

/**
 * One day: its 28px round (44px on a phone), with the day's number and then its children, which may be a function of
 * the day's state as ui-sdk's CalendarDay takes. Put a `CalendarDayMark` there for a day that holds something.
 */
export function CalendarDay({
  className,
  children,
  ...props
}: Omit<Loose<ComponentProps<typeof CalendarDayPrimitive>>, "children"> & {
  children?: ReactNode | ((day: CalendarDayState) => ReactNode);
}) {
  return (
    <CalendarDayPrimitive
      className={cn("group/day relative p-0 outline-none data-disabled:cursor-not-allowed", className)}
      {...defined(props)}
    >
      {(day) => (
        <span
          className={cn(
            "relative mx-auto grid size-7 place-items-center rounded-full pointer-coarse:size-11",
            "group-hover/day:bg-accent group-focus-visible/day:ring-3 group-focus-visible/day:ring-ring/50",
            day.outside && "text-muted-foreground",
            day.selected && "bg-primary-subtle font-[600] text-primary-subtle-foreground group-hover/day:bg-primary-subtle",
            day.today && "bg-primary font-[600] text-primary-foreground group-hover/day:bg-primary",
            day.today && day.selected && "ring-2 ring-primary/40 ring-offset-1 ring-offset-background",
            day.unavailable && "line-through",
            day.disabled && "opacity-50",
          )}
        >
          {day.label}
          {typeof children === "function" ? children(day) : children}
        </span>
      )}
    </CalendarDayPrimitive>
  );
}

/**
 * A dot under a day's number, for a day that holds something. Decoration: say what it means beside the calendar.
 * `tint` colours it with a tint's `--tint-fg` (`teal`); otherwise it is the primary colour, or a `bg-*` class. Hidden on
 * today, whose filled round already stands out.
 */
export function CalendarDayMark({
  tint,
  className,
  render,
  ...props
}: Omit<OwnPartProps<"span">, "children"> & { tint?: string | undefined }) {
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "calendar-day-mark",
        "aria-hidden": true,
        "data-tint": tint,
        className: cn(
          "absolute bottom-0.5 size-1 rounded-full bg-primary group-data-today/day:hidden",
          tint && "bg-(--tint-fg)",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** The weekday row: a function of each weekday's index, returning a CalendarWeekday. */
export function CalendarWeekdays(props: Loose<ComponentProps<typeof CalendarWeekdaysPrimitive>>) {
  return <CalendarWeekdaysPrimitive {...defined(props)} />;
}

/** The weeks: a function of each cell, returning a CalendarDay. */
export function CalendarWeeks(props: Loose<ComponentProps<typeof CalendarWeeksPrimitive>>) {
  return <CalendarWeeksPrimitive {...defined(props)} />;
}
