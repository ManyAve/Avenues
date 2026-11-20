import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { Fragment } from "react";
import { Money } from "#avenue/components/money";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

export type StatusTotal = { label: string; cents: number };

/**
 * ManyAve's bottom status bar (the app's app/ui/components/StatusBar.tsx at e01cc90): the mode toggle, the
 * record count (`StatusBarCount`), a hint (`StatusBarHint`), and money totals (`StatusBarTotals`) at the end.
 * Below 900px the hint gives way, so the totals are never cut.
 *
 * Changes from the app: the totals are a list (`StatusBarTotals items`) instead of fixed Outstanding and Credit props, so other
 * screens can show their own; the dots between them are aria-hidden. AVE-2: the totals' off-grid 6px gap becomes
 * 8px. On a phone, where the toggle, count and totals can't share one line, the totals wrap onto a second line
 * instead of running off the screen. Otherwise the app's sizes: 44px tall, 16px sides.
 */
function StatusBar({ className, render, ...props }: OwnPartProps<"footer">) {
  return renderElement(
    "footer",
    mergeProps(
      {
        "data-slot": "status-bar",
        className: cn(
          "group/status-bar flex min-h-11 flex-wrap items-center gap-4 border-t bg-background px-4 text-meta max-sm:py-2 whitespace-nowrap text-muted-foreground",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

/**
 * How many records show. When the bar has a hint, a dot ends the count, with the bar's 16px on each side of it, so the
 * hint starts with its own words (AVE-91, as AVE-66's meta lines); the dot goes with the hint below 900px.
 */
function StatusBarCount({ className, children, render, ...props }: OwnPartProps<"span">) {
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "status-bar-count",
        className,
        children: (
          <>
            {children}
            <span
              aria-hidden
              className="ms-4 hidden opacity-45 desktop:group-has-data-[slot=status-bar-hint]/status-bar:inline"
            >
              ·
            </span>
          </>
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** A hint after the count, such as a keyboard shortcut. It gives way below 900px, so the totals are never cut. */
function StatusBarHint({ className, render, ...props }: OwnPartProps<"span">) {
  return renderElement(
    "span",
    mergeProps({ "data-slot": "status-bar-hint", className: cn("hidden desktop:inline", className) }, defined(props)),
    render,
  );
}

/** Money totals at the bar's end, dot-separated (the dots are hidden from screen readers). */
function StatusBarTotals({
  items,
  className,
  render,
  ...props
}: Omit<OwnPartProps<"span">, "children"> & { items: readonly StatusTotal[] }) {
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "status-bar-totals",
        className: cn("ms-auto flex gap-2", className),
        children: items.map((total, i) => (
          <Fragment key={total.label}>
            {i > 0 ? (
              <span aria-hidden className="opacity-45">
                ·
              </span>
            ) : null}
            <span>
              {total.label} <Money cents={total.cents} className="font-[550] text-foreground" />
            </span>
          </Fragment>
        )),
      },
      defined(props),
    ),
    render,
  );
}

export { StatusBar, StatusBarCount, StatusBarHint, StatusBarTotals };
