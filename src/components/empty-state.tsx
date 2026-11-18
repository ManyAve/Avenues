import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { Button, buttonVariants } from "#avenue/components/button";
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
 * What an empty state's action does (AVE-139), for the one-tag form's `action` props. A button by default (`onClick`).
 * An action that goes somewhere is a link: `href` draws a plain `a`, `render` takes the app's own router link
 * (`render={<Link to="/households/new" />}`) so navigation stays client-side. Either way it keeps the button's look,
 * and ui-sdk's Button keeps the link a link: its role, its address, opening in a new tab. `render` wins over `href`.
 */
type EmptyAction = {
  label: string;
  onClick?: (() => void) | undefined;
  /** A page inside the app, drawn as a link styled as the button. */
  href?: string | undefined;
  /** The element to draw instead of a button, such as the app's router `Link`. */
  render?: ReactElement | undefined;
  disabled?: boolean | undefined;
  /** What the action does, for an action an agent must not take alone. Rendered as `data-agent-confirm`. */
  confirm?: string | undefined;
};

/** The Button props one action gives: its element, its click, and the agent's confirm. */
function actionProps(action: Omit<EmptyAction, "label">) {
  // oxlint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label -- the Button that renders it gives it the label.
  const render = action.render ?? (action.href ? <a href={action.href} /> : undefined);
  return {
    ...(render ? { render } : {}),
    ...(action.onClick ? { onClick: action.onClick } : {}),
    ...(action.confirm ? { "data-agent-confirm": action.confirm } : {}),
  };
}

/**
 * Draws each part in the fixed order whatever order it is written in; anything else (an extra line, a link out) comes
 * after them, in its own order. Flex `order`, so the boxes and their spacing are what source order gives.
 */
const emptyStateOrder =
  "*:order-last *:data-[slot=empty-state-icon]:order-1 *:data-[slot=empty-state-title]:order-2 *:data-[slot=empty-state-description]:order-3 *:data-[slot=empty-state-actions]:order-4";

type EmptyStateProps = OwnPartProps<"div"> & {
  /** `compact` fits inside a card on a 390px phone (AVE-23, Neighbors' NEI-107): 24px top and bottom, 16px sides. */
  size?: "default" | "compact" | undefined;
  /** @deprecated Use `<EmptyStateIcon><Icon /></EmptyStateIcon>` (v0.30.0, AVE-149). */
  icon?: LucideIcon | undefined;
  /** @deprecated Use `<EmptyStateTitle>` (v0.30.0, AVE-149). */
  title?: string | undefined;
  /** @deprecated Use `<EmptyStateDescription>` (v0.30.0, AVE-149). */
  description?: ReactNode;
  /** @deprecated Use `<EmptyStateActions><EmptyStateAction>` (v0.30.0, AVE-149). */
  action?: EmptyAction | undefined;
  /**
   * A quieter way out under the action, drawn as a link (e.g. "Use a different email").
   * @deprecated Use a second `<EmptyStateAction variant="link">` (v0.30.0, AVE-149).
   */
  secondaryAction?: Omit<EmptyAction, "disabled"> | undefined;
  /**
   * A page outside the app, opened in the browser: "{lead} {label}". It stays a real link (an `a` with an href,
   * styled as the link button), never a button, so it opens in a new tab and reads as a link (the app's MAN-954).
   * @deprecated Write the line as a child (v0.30.0, AVE-149); the root draws it after the parts.
   */
  externalLink?: { lead: string; label: string; href: string } | undefined;
  /** @deprecated Use `<EmptyStateTitle render={<h2 />}>` (v0.30.0, AVE-149). */
  headingLevel?: 2 | 3 | 4 | undefined;
};

/**
 * A centred icon, title, one-line explanation and an action. Written with parts, or in one tag with today's props,
 * which builds the same parts.
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  externalLink,
  size = "default",
  headingLevel = 3,
  children,
  className,
  render,
  ...props
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  const actions = action || secondaryAction;
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
        children: (
          <>
            {Icon && (
              <EmptyStateIcon>
                <Icon />
              </EmptyStateIcon>
            )}
            {title !== undefined && (
              <EmptyStateTitle render={headingLevel === 3 ? undefined : <Heading />}>{title}</EmptyStateTitle>
            )}
            {description !== undefined && <EmptyStateDescription>{description}</EmptyStateDescription>}
            {actions && (
              // With only the quieter action, it sits 8px under the line (16px on a phone), as it did on its own.
              <EmptyStateActions className={action ? undefined : "mt-2 pointer-coarse:mt-4"}>
                {action && (
                  <EmptyStateAction disabled={action.disabled ?? false} {...actionProps(action)}>
                    {action.label}
                  </EmptyStateAction>
                )}
                {secondaryAction && (
                  <EmptyStateAction variant="link" {...actionProps(secondaryAction)}>
                    {secondaryAction.label}
                  </EmptyStateAction>
                )}
              </EmptyStateActions>
            )}
            {externalLink && (
              <p className="mt-3 text-muted-foreground">
                {externalLink.lead}{" "}
                <a
                  href={externalLink.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto px-0")}
                >
                  {externalLink.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
            )}
            {children}
          </>
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

type SectionEmptyProps = Omit<OwnPartProps<"div">, "title"> & {
  /** @deprecated Use `<SectionEmptyIcon><Icon /></SectionEmptyIcon>` (v0.30.0, AVE-149). */
  icon?: LucideIcon | undefined;
  /** @deprecated Use `<SectionEmptyContent><SectionEmptyTitle>` (v0.30.0, AVE-149). */
  title?: string | undefined;
  /** @deprecated Use `<SectionEmptyDescription>` inside `SectionEmptyContent` (v0.30.0, AVE-149). */
  line?: ReactNode;
  /**
   * The next step: a button (`onClick`) or, for one that goes somewhere, a link (`href` or `render`; see EmptyAction).
   * @deprecated Use `<SectionEmptyAction>` (v0.30.0, AVE-149).
   */
  action?: (Omit<EmptyAction, "disabled"> & { icon?: LucideIcon | undefined }) | undefined;
};

/**
 * An empty section inside a card: a small icon tile, a title saying what would be here, one line saying what
 * fills it, and the next step when there is one. One row tall, so an empty page doesn't become a stack of
 * blank boxes. While a section shows this, its header leaves out the same step, so it shows once.
 */
function SectionEmpty({ icon: Icon, title, line, action, children, className, render, ...props }: SectionEmptyProps) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "section-empty",
        className: cn("flex flex-wrap items-center gap-x-3 gap-y-3", sectionEmptyOrder, className),
        children: (
          <>
            {Icon && (
              <SectionEmptyIcon>
                <Icon />
              </SectionEmptyIcon>
            )}
            {(title !== undefined || line !== undefined) && (
              <SectionEmptyContent>
                {title !== undefined && <SectionEmptyTitle>{title}</SectionEmptyTitle>}
                {line !== undefined && <SectionEmptyDescription>{line}</SectionEmptyDescription>}
              </SectionEmptyContent>
            )}
            {action && (
              <SectionEmptyAction {...actionProps(action)}>
                {action.icon && <action.icon aria-hidden />} {action.label}
              </SectionEmptyAction>
            )}
            {children}
          </>
        ),
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
    mergeProps({ "data-slot": "section-empty-title", className: cn("font-[550]", className) }, defined(props)),
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
