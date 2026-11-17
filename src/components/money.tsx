import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { formatMoney } from "#avenue/lib/format";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * ManyAve's Money, ported from the app's app/ui/components/Money.tsx (e01cc90): cents as tabular monospace
 * currency. It never truncates or wraps (UX.md), so give it room rather than a width.
 *
 * `cents` of null or undefined is a blank amount: a dash, read as "No amount". A sign is spoken as a word
 * ("minus $5.00"), because screen readers may drop a hyphen-minus and read a debt as a credit. `data-private`
 * marks it so session replays blur payment details.
 */
function Money({
  cents,
  signed = false,
  className,
  render,
  ...props
}: OwnPartProps<"span"> & { cents: number | null | undefined; signed?: boolean | undefined }) {
  const blank = cents === null || cents === undefined;
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "money",
        "data-private": "",
        "data-sign": blank ? undefined : cents < 0 ? "negative" : cents > 0 ? "positive" : "zero",
        className: cn("shrink-0 font-mono whitespace-nowrap tabular-nums", blank && "text-muted-foreground", className),
        children: blank ? (
        <>
          <span aria-hidden>—</span>
          <span className="sr-only">No amount</span>
        </>
      ) : cents < 0 || (signed && cents > 0) ? (
        <>
          <span aria-hidden>{formatMoney(cents, { signed })}</span>
          <span className="sr-only">{`${cents < 0 ? "minus" : "plus"} ${formatMoney(Math.abs(cents))}`}</span>
        </>
      ) : (
        formatMoney(cents, { signed })
      ),
      },
      defined(props),
    ),
    render,
  );
}

export { Money };
