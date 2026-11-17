import {
  Calendar as CalendarRoot,
  CalendarDay,
  CalendarGrid,
  CalendarHeading,
  CalendarNext,
  CalendarPrevious,
  CalendarWeekday,
  CalendarWeekdays,
  CalendarWeeks,
} from "@ui-sdk/react/calendar";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { buttonVariants } from "#avenue/components/button";
import { defined, type Loose } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/** A day's dot: a background class (`bg-info`), or a tint (`teal`) whose `--tint-fg` colours it. */
export type CalendarMark = { className?: string | undefined; tint?: string | undefined };

export type CalendarProps = Omit<Loose<ComponentProps<typeof CalendarRoot>>, "children"> & {
  /** A dot under the day, for days that hold something. Decoration: say what it means beside the calendar. */
  mark?: ((date: string) => CalendarMark | undefined) | undefined;
};

/**
 * A month to pick a day from (AVE-121), as the board's small month under the Activity title, which jumps to any day.
 * Behavior is ui-sdk's Calendar: the month is one grid with one Tab stop, the arrows move by day and week, Page Up and
 * Down by month (Shift for a year), Home and End to the week's ends, Enter or Space picks. Each day is named by its
 * full date and today carries aria-current. Keys past the month turn it.
 *
 * The look is the board's small month: narrow weekday letters, 28px round days, today filled with the primary colour,
 * days of the months either side muted (the board fades them to 60%, which fails 4.5:1 contrast), a dot under a day that holds something. A picked day takes the primary-subtle
 * fill. On a phone each day grows to 44px, so the calendar needs 308px.
 */
export function Calendar({ className, mark, weekdayFormat = "narrow", fixedWeeks = true, ...props }: CalendarProps) {
  const step = cn(buttonVariants({ variant: "ghost", size: "icon-sm" }));
  return (
    <CalendarRoot
      weekdayFormat={weekdayFormat}
      fixedWeeks={fixedWeeks}
      className={cn("grid w-fit gap-1", className)}
      {...defined(props)}
    >
      <div className="flex items-center gap-controls ps-1">
        <CalendarHeading className="me-auto text-compact font-[550] whitespace-nowrap" />
        <CalendarPrevious aria-label="Previous month" className={step}>
          <ChevronLeftIcon aria-hidden className="rtl:rotate-180" />
        </CalendarPrevious>
        <CalendarNext aria-label="Next month" className={step}>
          <ChevronRightIcon aria-hidden className="rtl:rotate-180" />
        </CalendarNext>
      </div>
      <CalendarGrid className="border-collapse text-center text-meta">
        <CalendarWeekdays>
          {(index) => <CalendarWeekday index={index} className="py-1 text-[11px] font-[550] text-muted-foreground" />}
        </CalendarWeekdays>
        <CalendarWeeks>
          {(cell) => (
            <CalendarDay
              value={cell.date}
              className="group/day relative p-0 outline-none data-disabled:cursor-not-allowed"
            >
              {(day) => {
                const dot = day.today ? undefined : mark?.(day.date);
                return (
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
                    {dot && (
                      <span
                        aria-hidden
                        data-tint={dot.tint}
                        className={cn("absolute bottom-0.5 size-1 rounded-full bg-primary", dot.tint && "bg-(--tint-fg)", dot.className)}
                      />
                    )}
                  </span>
                );
              }}
            </CalendarDay>
          )}
        </CalendarWeeks>
      </CalendarGrid>
    </CalendarRoot>
  );
}
