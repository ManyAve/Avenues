import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { InfoIcon } from "lucide-react";
import { Children, isValidElement, type ReactNode } from "react";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

export type CalloutTone = "info" | "warning";

export interface CalloutProps extends OwnPartProps<"div"> {
  /** info (the default) for a note that helps; warning for one that changes what happens if they go on. */
  tone?: CalloutTone | undefined;
}

/**
 * The board's info or warning note (AVE-120), ported from the app's Callout in app/ui/components/dues.tsx: a tinted
 * block above or among a dialog's fields, such as "Households already at this amount are skipped." It is static
 * text, not a live region: something that appears in answer to an action belongs in an InlineMessage, which is
 * announced. Keep the icon with every tone, so colour never carries the meaning alone (WCAG 1.4.1).
 *
 * A root and parts, as ui-sdk composes (AVE-149); or one tag, whose children are the text and which draws the info
 * icon before it:
 *
 *   Callout            the tinted block, per `tone`
 *   ├── CalloutIcon    the icon (Info when empty)
 *   └── CalloutContent the text
 *
 * Callout takes parts when one is among its own children.
 *
 * AVE-2 spacing: the app's off-grid 10px top and bottom padding becomes 8px.
 */
export function Callout({ tone = "info", className, children, render, ...props }: CalloutProps) {
  const parts = Children.toArray(children).some(
    (child) => isValidElement(child) && (child.type === CalloutIcon || child.type === CalloutContent),
  );
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "callout",
        "data-tone": tone,
        className: cn(
          "flex gap-2 rounded-md px-3 py-2 text-meta",
          tone === "info" ? "bg-info-subtle text-info-subtle-foreground" : "bg-warning-subtle text-warning-subtle-foreground",
          className,
        ),
        children: parts ? (
          children
        ) : (
          <>
            <CalloutIcon />
            <CalloutContent>{children}</CalloutContent>
          </>
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** The leading icon, 14px, on the first line. Info when given no icon; put another icon element inside. Decorative. */
export function CalloutIcon({ className, children, render, ...props }: OwnPartProps<"span">) {
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "callout-icon",
        "aria-hidden": true,
        className: cn("mt-0.5 flex shrink-0 [&_svg]:size-3.5", className),
        children: (children ?? <InfoIcon aria-hidden />) as ReactNode,
      },
      defined(props),
    ),
    render,
  );
}

/** The note's text. */
export function CalloutContent({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps({ "data-slot": "callout-content", className: cn("min-w-0", className) }, defined(props)),
    render,
  );
}
