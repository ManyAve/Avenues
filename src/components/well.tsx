import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { createContext, use, useEffect } from "react";
import { DEVELOPMENT, devError } from "#avenue/lib/dev";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/** Whether a part sits inside a Well already. */
const InWell = createContext(false);

/**
 * A soft well that groups related settings (AVE-211): Quiet hours and its times, or a set of notice switches, as rows
 * on one quiet fill, split by dividers, with no outline. A well groups; it doesn't box. Put it in a Card's content (a
 * SectionCard), a Dialog or Drawer body, a Popover, or on the page.
 *
 *   Well           the fill, its corner and the dividers
 *   └── (rows)     each child is one row, padded 16px across and 12px down: a horizontal Field with a Switch,
 *                  a ListItem, a line of text
 *
 * The fill is `fill`, a quiet shape a step off its surface: `muted` is the card's own colour on a default dark card,
 * where a muted well would vanish. Its corner is lg, nested (`rounded-nested-lg`, src/lib/corners.ts): lg in a card,
 * dialog, drawer or popover, xs in a small card, whose 12px inset leaves room for no more.
 *
 * One depth only: a Well inside a Well is a development error. Split the group, or use a FieldSeparator inside it.
 */
function Well({ className, render, ...props }: OwnPartProps<"div">) {
  const nested = use(InWell);
  useEffect(() => {
    if (DEVELOPMENT && nested)
      devError("Avenue: a Well inside a Well. Wells are one depth only (AVE-211); split the group instead.");
  }, [nested]);
  return (
    <InWell value>
      {renderElement(
        "div",
        mergeProps(
          {
            "data-slot": "well",
            className: cn(
              "flex flex-col divide-y divide-border rounded-nested-lg bg-fill *:px-inset *:py-row-y",
              className,
            ),
          },
          defined(props),
        ),
        render,
      )}
    </InWell>
  );
}

export { Well };
