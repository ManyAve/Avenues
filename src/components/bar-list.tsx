import {
  Meter as MeterPrimitive,
  MeterIndicator as MeterIndicatorPrimitive,
  MeterLabel as MeterLabelPrimitive,
  MeterTrack as MeterTrackPrimitive,
  MeterValue as MeterValuePrimitive,
} from "@ui-sdk/react/meter";
import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { createContext, use, type ComponentProps } from "react";
import { defined, type Loose, type NodeChildren, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * A few amounts compared by length (AVE-219): where trials stopped, which features a board uses, the stages of a
 * funnel. Each row is ui-sdk's Meter: a label, its value as text, and a bar as long as its share of the list's `max`.
 * A screen reader hears each row as a meter named by its label, with the row's value.
 *
 *   BarList             the list; `max` is the amount a full bar stands for
 *   └── BarListItem     one row, a meter; `value` sets its bar's length
 *       ├── BarListLabel    what the row counts
 *       ├── BarListValue    the amount, as people read it ("11", "45% of trials")
 *       └── BarListDescription   optional: a muted line under the bar ("3.1% of clicks")
 *
 * `valueText` on a row is what a screen reader hears for its value; it defaults to the number. Pass it whenever
 * BarListValue shows more than the number ("17, 45% of trials"), so everyone gets the same reading.
 *
 * Not Progress: a progress bar says how far one task has got. Not a chart either: no axis and no hover, so keep it to
 * a handful of rows, sorted by what the reader scans for (usually largest first; a funnel in stage order). For values
 * over time, or more than a handful of rows, use Chart.
 *
 * The bar is `primary` on a `fill` track, Progress's own pair (AVE-129), so the empty part of a bar shows on a card in
 * light, dark and lifted. `tone="neutral"` on the list draws the bars in `muted-foreground`, for a second list beside
 * a primary one or where the page's one colour is spoken for.
 */
type BarListTone = "primary" | "neutral";

const BarListContext = createContext<{ max: number; tone: BarListTone }>({ max: 100, tone: "primary" });

const bars: Record<BarListTone, string> = {
  primary: "bg-primary",
  neutral: "bg-muted-foreground",
};

function BarList({
  max,
  tone = "primary",
  className,
  render,
  ...props
}: OwnPartProps<"ul"> & {
  /** The amount a full bar stands for: the largest value, or the whole the values are parts of. */
  max: number;
  tone?: BarListTone | undefined;
}) {
  return (
    <BarListContext.Provider value={{ max, tone }}>
      {renderElement(
        "ul",
        mergeProps(
          { "data-slot": "bar-list", "data-tone": tone, className: cn("grid gap-3 text-compact tabular-nums", className) },
          defined(props),
        ),
        render,
      )}
    </BarListContext.Provider>
  );
}

/** One row: a meter with its label and value on a line, and under them a bar `value` of `max` long. */
function BarListItem({
  value,
  valueText,
  className,
  children,
  ...props
}: NodeChildren<Omit<Loose<ComponentProps<typeof MeterPrimitive>>, "min" | "max" | "format" | "getValueLabel">> & {
  /** What a screen reader hears for the value, when BarListValue shows more than the number. */
  valueText?: string | undefined;
}) {
  const { max, tone } = use(BarListContext);
  return (
    <li data-slot="bar-list-item">
      <MeterPrimitive
        value={value}
        min={0}
        // A meter needs a range: a list whose max is nothing draws empty bars.
        max={max > 0 ? max : 1}
        format={{ style: "decimal" }}
        {...(valueText === undefined ? {} : { getValueLabel: () => valueText })}
        className={cn("grid grid-cols-[1fr_auto] items-baseline gap-x-group gap-y-1", className)}
        {...defined(props)}
      >
        {children}
        <MeterTrackPrimitive className="col-span-full h-2 overflow-hidden rounded-full bg-fill">
          <MeterIndicatorPrimitive className={cn("block h-full rounded-full", bars[tone])} />
        </MeterTrackPrimitive>
      </MeterPrimitive>
    </li>
  );
}

/** What the row counts, and the meter's name. Wraps, so a long label never pushes the value off the row. */
function BarListLabel({ className, ...props }: Loose<ComponentProps<typeof MeterLabelPrimitive>>) {
  return <MeterLabelPrimitive className={cn("min-w-0 wrap-break-word", className)} {...defined(props)} />;
}

/** The row's amount as people read it, at the end of the line. Leave it empty to show the number. */
function BarListValue({ className, ...props }: Loose<ComponentProps<typeof MeterValuePrimitive>>) {
  return <MeterValuePrimitive className={cn("font-emphasis whitespace-nowrap", className)} {...defined(props)} />;
}

/**
 * A muted line under the row's bar: what the amount is a share of, or where it was read. Drawn after the bar
 * whatever its place among the row's children.
 */
function BarListDescription({ className, render, ...props }: OwnPartProps<"span">) {
  return renderElement(
    "span",
    mergeProps(
      { "data-slot": "bar-list-description", className: cn("order-last col-span-full text-meta text-muted-foreground", className) },
      defined(props),
    ),
    render,
  );
}

export { BarList, BarListDescription, BarListItem, BarListLabel, BarListValue, type BarListTone };
