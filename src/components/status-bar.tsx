import { Fragment, type ComponentProps, type ReactNode } from "react";
import { Money } from "#avenue/components/money";
import { cn } from "#avenue/lib/utils";

export type StatusTotal = { label: string; cents: number };

/**
 * ManyAve's bottom status bar (the app's app/ui/components/StatusBar.tsx at e01cc90): the mode toggle as
 * `children`, the record count, a hint, and money totals at the end. Below 900px the hint gives way, so the totals
 * are never cut.
 *
 * Changes from the app: the totals are a list (`totals`) instead of fixed Outstanding and Credit props, so other
 * screens can show their own; the dots between them are aria-hidden. AVE-2: the totals' off-grid 6px gap becomes
 * 8px. On a phone, where the toggle, count and totals can't share one line, the totals wrap onto a second line
 * instead of running off the screen. Otherwise the app's sizes: 44px tall, 16px sides.
 */
function StatusBar({
  count,
  hint,
  totals,
  children,
  className,
  ...props
}: ComponentProps<"footer"> & {
  count: ReactNode;
  hint?: ReactNode;
  totals?: readonly StatusTotal[] | undefined;
}) {
  return (
    <footer
      data-slot="status-bar"
      className={cn(
        "flex min-h-11 flex-wrap items-center gap-4 border-t bg-background px-4 text-meta max-sm:py-2 whitespace-nowrap text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
      {/* The dot ends the count, with the bar's 16px on each side of it, so the hint starts with its own words
          (AVE-91, as AVE-66's meta lines). It goes with the hint below 900px. */}
      <span data-slot="status-bar-count">
        {count}
        {hint ? (
          <span aria-hidden className="ms-4 hidden opacity-45 desktop:inline">
            ·
          </span>
        ) : null}
      </span>
      {hint ? (
        <span data-slot="status-bar-hint" className="hidden desktop:inline">
          {hint}
        </span>
      ) : null}
      {totals?.length ? (
        <span data-slot="status-bar-totals" className="ms-auto flex gap-2">
          {totals.map((total, i) => (
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
          ))}
        </span>
      ) : null}
    </footer>
  );
}

export { StatusBar };
