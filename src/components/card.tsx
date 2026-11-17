import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * Ported from the app's app/ui/components/ui/card.tsx (e01cc90). xl corner (14px), 16px inset (12px for `sm`).
 *
 * Header with an action (AVE-2 sections 4 and 6): the action sits on the title's line, vertically centred on it,
 * a full inset (16px) from the top and right edges, instead of top-aligned across the title and description.
 * Controls in a card header use the sm size (28px, 8px corner) and are never pills, so nothing is rounder than the
 * card or jammed into its corner.
 *
 * The header keeps 8px between the title and its action where the app has 4px (AVE-57): AVE-2 section 1 keeps 4px
 * for an icon beside its own label, and separate things in a row sit 8px apart.
 */
function Card({
  className,
  size = "default",
  render,
  ...props
}: OwnPartProps<"div"> & { size?: "default" | "sm" | undefined }) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "card",
        "data-size": size,
        className: cn(
          "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

function CardHeader({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "card-header",
        className: cn(
          "group/card-header @container/card-header grid auto-rows-min items-start gap-x-2 gap-y-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-(--card-spacing)",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

/**
 * text-compact, as every card title on the app's screens sets it (detail.tsx): 16px on a 24px line on the web
 * scale, 14px on 20px at desktop scale (AVE-55). The app's base primitive says text-base; its screens all override.
 *
 * A `div` by default, as the app draws it. Give it `render={<h3 />}` (or the level that fits the page) so screen
 * reader users can move between cards by heading (AVE-136); the look stays the same. A linter's heading-has-content
 * rule can't see that CardTitle passes its children into that element, so it may need a disable comment.
 */
function CardTitle({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "card-title",
        className: cn("self-center text-compact font-medium group-data-[size=sm]/card:text-sm", className),
      },
      defined(props),
    ),
    render,
  );
}

function CardDescription({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      { "data-slot": "card-description", className: cn("col-start-1 text-sm text-muted-foreground", className) },
      defined(props),
    ),
    render,
  );
}

/** The header's control (a select, a button). Sits on the title's line, centred on it, 16px from the corner. */
function CardAction({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "card-action",
        className: cn("col-start-2 row-start-1 flex items-center gap-controls self-center justify-self-end", className),
      },
      defined(props),
    ),
    render,
  );
}

function CardContent({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps({ "data-slot": "card-content", className: cn("px-(--card-spacing)", className) }, defined(props)),
    render,
  );
}

function CardFooter({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "card-footer",
        className: cn("flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)", className),
      },
      defined(props),
    ),
    render,
  );
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
