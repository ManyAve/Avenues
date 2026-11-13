import type { ComponentProps } from "react";
import { cn } from "#avenue/lib/utils";

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const signedDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  signDisplay: "exceptZero",
});

/** Cents as US dollars: 12345 → "$123.45", -500 → "-$5.00"; `signed` adds "+" to amounts above zero. */
function formatMoney(cents: number, { signed = false }: { signed?: boolean } = {}) {
  return (signed ? signedDollars : dollars).format(cents / 100);
}

/**
 * ManyAve's Money, ported from the app's app/ui/components/Money.tsx (e01cc90): cents as tabular monospace
 * currency. It never truncates or wraps (UX.md), so give it room rather than a width.
 *
 * `cents` of null or undefined is a blank amount: a dash, read as "No amount". `data-private` marks it so
 * session replays blur payment details.
 */
function Money({
  cents,
  signed = false,
  className,
  ...props
}: ComponentProps<"span"> & { cents: number | null | undefined; signed?: boolean | undefined }) {
  const blank = cents === null || cents === undefined;
  return (
    <span
      data-slot="money"
      data-private=""
      data-sign={blank ? undefined : cents < 0 ? "negative" : cents > 0 ? "positive" : "zero"}
      className={cn("shrink-0 font-mono whitespace-nowrap tabular-nums", blank && "text-muted-foreground", className)}
      {...props}
    >
      {blank ? (
        <>
          <span aria-hidden>—</span>
          <span className="sr-only">No amount</span>
        </>
      ) : (
        formatMoney(cents, { signed })
      )}
    </span>
  );
}

export { Money, formatMoney };
