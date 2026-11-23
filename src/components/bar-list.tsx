import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { createContext, use } from "react";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * A few amounts compared by length (AVE-219): where trials stopped, which features a board uses, the stages of a
 * funnel. Each row is a label, its value as text, and a bar as long as its share of `max`. The text carries every
 * number; the bars only make the comparison quick, and are hidden from screen readers.
 *
 *   BarList             the list; `max` is the amount a full bar stands for
 *   └── BarListItem     one row; `value` sets its bar's length
 *       ├── BarListLabel    what the row counts
 *       └── BarListValue    the amount, as people read it ("11", "45% of trials")
 *
 * Not Progress: a progress bar says how far one task has got and is announced as one; these bars compare amounts and
 * announce nothing. Not a chart either: no axis and no hover, so keep it to a handful of rows, sorted by what the
 * reader scans for (usually largest first; a funnel in stage order).
 *
 * The bar is `primary` on a `fill` track, Progress's own pair (AVE-129), so the empty part of a bar shows on a card in
 * light, dark and lifted. `tone="neutral"` on the list draws the bars in `muted-foreground`, for a second list beside
 * a primary one or where the page's one colour is spoken for.
 */
type BarListTone = "primary" | "neutral";

const BarListContext = createContext<{ max: number; tone: BarListTone }>({ max: 1, tone: "primary" });

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

/** One row: its label and value on a line, and under them a bar `value` of `max` long. */
function BarListItem({
  value,
  className,
  children,
  render,
  ...props
}: OwnPartProps<"li"> & {
  /** The row's amount, in the same unit as the list's `max`. Below zero draws no bar; above `max` draws a full one. */
  value: number;
}) {
  const { max, tone } = use(BarListContext);
  const share = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  return renderElement(
    "li",
    mergeProps(
      {
        "data-slot": "bar-list-item",
        className: cn("grid grid-cols-[1fr_auto] items-baseline gap-x-group gap-y-1", className),
        children: (
          <>
            {children}
            <span aria-hidden data-slot="bar-list-track" className="col-span-full h-2 overflow-hidden rounded-full bg-fill">
              <span
                data-slot="bar-list-bar"
                className={cn("block h-full rounded-full", bars[tone])}
                style={{ inlineSize: `${share * 100}%` }}
              />
            </span>
          </>
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** What the row counts. Wraps, so a long label never pushes the value off the row. */
function BarListLabel({ className, render, ...props }: OwnPartProps<"span">) {
  return renderElement(
    "span",
    mergeProps({ "data-slot": "bar-list-label", className: cn("min-w-0 wrap-break-word", className) }, defined(props)),
    render,
  );
}

/** The row's amount as people read it, at the end of the line. */
function BarListValue({ className, render, ...props }: OwnPartProps<"span">) {
  return renderElement(
    "span",
    mergeProps(
      { "data-slot": "bar-list-value", className: cn("font-emphasis whitespace-nowrap", className) },
      defined(props),
    ),
    render,
  );
}

export { BarList, BarListItem, BarListLabel, BarListValue, type BarListTone };
