import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * A key number that leads a page or a card (AVE-210): "$4,280 collected", "34 of 52 paid", "3 open requests". The
 * figure is big, a unit may sit beside it, and a short label says what it counts.
 *
 *   Stat            the root; `size="lg"` on a page's hero figure
 *   ├── StatValue   the figure's line: the number (or a Money), then a StatUnit
 *   │   └── StatUnit    "of 52", "GB": smaller and muted, on the figure's baseline
 *   └── StatLabel   what the figure counts, below it
 *
 * The figure uses the type scale's top two steps only: `text-display`, or `text-hero` with `size="lg"`, which phones
 * draw at `text-display` (AVE-189). Both are tracked a little tighter, as large figures read better that way. Digits
 * are tabular, so stats in a row keep their widths as the numbers change.
 *
 * A money figure is a `Money` inside StatValue, so it keeps its sign and its spoken name ("minus $120.00"). Here it
 * draws in the text face (`font-sans`): the figure gets its presence from size, weight and tracking, and one sans is the only text
 * face at display sizes (AVE-210's verdict). Elsewhere Money stays mono.
 *
 * The label follows the figure in the markup, so a screen reader hears "4,280 collected" in reading order.
 */
type StatSize = "md" | "lg";

function Stat({ size = "md", className, render, ...props }: OwnPartProps<"div"> & { size?: StatSize | undefined }) {
  return renderElement(
    "div",
    mergeProps(
      { "data-slot": "stat", "data-size": size, className: cn("group/stat flex min-w-0 flex-col gap-1", className) },
      defined(props),
    ),
    render,
  );
}

function StatValue({ className, render, ...props }: OwnPartProps<"p">) {
  return renderElement(
    "p",
    mergeProps(
      {
        "data-slot": "stat-value",
        className: cn(
          // -0.02em: the verdict's tracking for the figure, at these two steps only. One part draws it: a literal, not
          // a token (docs/tokens.md).
          "flex flex-wrap items-baseline gap-x-1 text-display font-heading tracking-[-0.02em] text-foreground tabular-nums",
          "group-data-[size=lg]/stat:sm:text-hero",
          "[&_[data-slot=money]]:font-sans",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

function StatUnit({ className, render, ...props }: OwnPartProps<"span">) {
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "stat-unit",
        className: cn("text-compact font-normal tracking-normal text-muted-foreground", className),
      },
      defined(props),
    ),
    render,
  );
}

function StatLabel({ className, render, ...props }: OwnPartProps<"p">) {
  return renderElement(
    "p",
    mergeProps(
      { "data-slot": "stat-label", className: cn("text-meta text-muted-foreground", className) },
      defined(props),
    ),
    render,
  );
}

export { Stat, StatLabel, StatUnit, StatValue, type StatSize };
