import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import type { ComponentProps } from "react";
import { Button } from "#avenue/components/button";
import { defined, type Loose, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * ManyAve's EmptyState and SectionEmpty, ported from the app's app/ui/components/EmptyState.tsx and
 * SectionEmpty.tsx (e01cc90). Colours, type and order unchanged.
 * AVE-2 spacing: the page form's 64px top and bottom becomes 48 (the empty-state step); the description's 6px
 * gap becomes 8; SectionEmpty's 10px row gap becomes 12 (between blocks).
 *
 * Both are a root and parts, as ui-sdk composes (AVE-149):
 *
 *   EmptyState                  root: the centred column, its size and its order
 *   ├── EmptyStateIcon          the icon, decorative
 *   ├── EmptyStateTitle         an h3; `render={<h2 />}` for another level
 *   ├── EmptyStateDescription   the one line saying what fills it
 *   └── EmptyStateActions       the way out
 *       └── EmptyStateAction    a button (outline, sm), or a link with `render`
 *
 *   SectionEmpty                root: one row, wrapping on a phone
 *   ├── SectionEmptyIcon        the 40px tile
 *   ├── SectionEmptyContent     the text column
 *   │   ├── SectionEmptyTitle
 *   │   └── SectionEmptyDescription
 *   └── SectionEmptyAction      the next step (outline, sm)
 *
 * The order (icon, title, line, action) is a UX rule, not each screen's choice: the root draws its parts in that
 * order by their `data-slot`, whatever order they are written in. Anything else inside comes after them.
 */

/**
 * Draws each part in the fixed order whatever order it is written in; anything else (an extra line, a link out) comes
 * after them, in its own order. Flex `order`, so the boxes and their spacing are what source order gives.
 */
const emptyStateOrder =
  "*:order-last *:data-[slot=empty-state-icon]:order-1 *:data-[slot=empty-state-title]:order-2 *:data-[slot=empty-state-description]:order-3 *:data-[slot=empty-state-actions]:order-4";

/** No `title`: it was the slot prop for the title part (AVE-149); a tooltip in its place would hide a stale call. */
type EmptyStateProps = Omit<OwnPartProps<"div">, "title"> & {
  /** `compact` fits inside a card on a 390px phone (AVE-23, Neighbors' NEI-107): 24px top and bottom, 16px sides. */
  size?: "default" | "compact" | undefined;
};

/** A centred icon, title, one-line explanation and an action, written with parts. */
function EmptyState({ size = "default", className, render, ...props }: EmptyStateProps) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "empty-state",
        "data-size": size,
        className: cn(
          "flex flex-col items-center justify-center text-center text-compact",
          size === "compact" ? "px-4 py-6" : "px-6 py-12",
          emptyStateOrder,
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** The icon, 24px and muted. Decorative: the title says what is empty. Put the icon element inside. */
function EmptyStateIcon({ className, render, ...props }: OwnPartProps<"span">) {
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "empty-state-icon",
        "aria-hidden": true,
        className: cn("mb-3 flex text-muted-foreground [&_svg]:size-6", className),
      },
      defined(props),
    ),
    render,
  );
}

/**
 * What is empty, as an h3. Give it `render={<h2 />}` (or the level that fits the page) to change the level; the look
 * stays the same.
 */
function EmptyStateTitle({ className, render, ...props }: OwnPartProps<"h3">) {
  return renderElement(
    "h3",
    mergeProps({ "data-slot": "empty-state-title", className: cn("font-semibold", className) }, defined(props)),
    render,
  );
}

/** One line saying what fills it. */
function EmptyStateDescription({ className, render, ...props }: OwnPartProps<"p">) {
  return renderElement(
    "p",
    mergeProps(
      { "data-slot": "empty-state-description", className: cn("mt-2 text-muted-foreground", className) },
      defined(props),
    ),
    render,
  );
}

/**
 * The ways out, one under the other. They are tap targets, so they sit 8px apart with a mouse and 16px on a phone,
 * where their 44px tap areas meet but don't overlap (AVE-22).
 */
function EmptyStateActions({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "empty-state-actions",
        className: cn("mt-4 flex flex-col items-center gap-2 pointer-coarse:gap-4", className),
      },
      defined(props),
    ),
    render,
  );
}

/**
 * One way out: an outline sm Button. `variant="link"` for a quieter second one. An action that goes somewhere is a
 * link: `render={<a href="…" />}` or the app's router link, which keeps the button's look (AVE-139).
 */
function EmptyStateAction({ variant = "outline", size = "sm", ...props }: Loose<ComponentProps<typeof Button>>) {
  return <Button variant={variant} size={size} {...defined(props)} />;
}

const sectionEmptyOrder =
  "*:order-last *:data-[slot=section-empty-icon]:order-1 *:data-[slot=section-empty-content]:order-2 *:data-section-empty-action:order-3";

/**
 * An empty section inside a card: a small icon tile, a title saying what would be here, one line saying what
 * fills it, and the next step when there is one. One row tall, so an empty page doesn't become a stack of
 * blank boxes. While a section shows this, its header leaves out the same step, so it shows once.
 *
 * No `title`: it was the slot prop for the title part (AVE-149), and an HTML tooltip in its place would hide a
 * stale call.
 */
function SectionEmpty({ className, render, ...props }: Omit<OwnPartProps<"div">, "title">) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "section-empty",
        className: cn("flex flex-wrap items-center gap-x-3 gap-y-3", sectionEmptyOrder, className),
      },
      defined(props),
    ),
    render,
  );
}

/** The 40px muted tile with a 20px icon, as IconTile's `section` size. Decorative. Put the icon element inside. */
function SectionEmptyIcon({ className, render, ...props }: OwnPartProps<"span">) {
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "section-empty-icon",
        "aria-hidden": true,
        className: cn(
          "relative grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-5",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** The text column: the title and the line, taking the row's room and wrapping the action under it on a phone. */
function SectionEmptyContent({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps({ "data-slot": "section-empty-content", className: cn("min-w-0 flex-1 basis-56", className) }, defined(props)),
    render,
  );
}

/** What would be here. A `p`; give it `render={<h3 />}` where the section's heading doesn't already say it. */
function SectionEmptyTitle({ className, render, ...props }: OwnPartProps<"p">) {
  return renderElement(
    "p",
    mergeProps({ "data-slot": "section-empty-title", className: cn("font-emphasis", className) }, defined(props)),
    render,
  );
}

/** One line saying what fills it. */
function SectionEmptyDescription({ className, render, ...props }: OwnPartProps<"p">) {
  return renderElement(
    "p",
    mergeProps(
      { "data-slot": "section-empty-description", className: cn("text-meta text-muted-foreground", className) },
      defined(props),
    ),
    render,
  );
}

/**
 * The next step: an outline sm Button at the row's end, under the text on a phone (lined up with it, past the tile).
 * A link with `render`, as EmptyStateAction.
 */
function SectionEmptyAction({
  variant = "outline",
  size = "sm",
  className,
  ...props
}: Loose<ComponentProps<typeof Button>>) {
  return (
    <Button
      data-section-empty-action=""
      variant={variant}
      size={size}
      className={cn("shrink-0 max-phone:ml-13", className)}
      {...defined(props)}
    />
  );
}

export {
  EmptyState,
  EmptyStateAction,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  SectionEmpty,
  SectionEmptyAction,
  SectionEmptyContent,
  SectionEmptyDescription,
  SectionEmptyIcon,
  SectionEmptyTitle,
};
