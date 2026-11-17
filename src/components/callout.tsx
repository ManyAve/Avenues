import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { InfoIcon, type LucideIcon } from "lucide-react";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

export type CalloutTone = "info" | "warning";

export interface CalloutProps extends OwnPartProps<"div"> {
  /** info (the default) for a note that helps; warning for one that changes what happens if they go on. */
  tone?: CalloutTone | undefined;
  /** The leading icon. Info by default; pass TriangleAlert with a warning, or Clock for something still processing. */
  icon?: LucideIcon | undefined;
}

/**
 * The board's info or warning note (AVE-120), ported from the app's Callout in app/ui/components/dues.tsx: a tinted
 * block above or among a dialog's fields, such as "Households already at this amount are skipped." It is static
 * text, not a live region: something that appears in answer to an action belongs in an InlineMessage, which is
 * announced. The icon stays with every tone, so colour never carries the meaning alone (WCAG 1.4.1).
 *
 * AVE-2 spacing: the app's off-grid 10px top and bottom padding becomes 8px.
 */
export function Callout({ tone = "info", icon: Icon = InfoIcon, className, children, render, ...props }: CalloutProps) {
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
        children: (
          <>
            <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <div className="min-w-0">{children}</div>
          </>
        ),
      },
      defined(props),
    ),
    render,
  );
}
