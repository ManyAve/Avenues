import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { Button, buttonVariants } from "#avenue/components/button";
import { IconTile } from "#avenue/components/icon-tile";
import { cn } from "#avenue/lib/utils";

/**
 * ManyAve's EmptyState and SectionEmpty, ported from the app's app/ui/components/EmptyState.tsx and
 * SectionEmpty.tsx (e01cc90). Colours, type and order unchanged.
 * AVE-2 spacing: the page form's 64px top and bottom becomes 48 (the empty-state step); the description's 6px
 * gap becomes 8; SectionEmpty's 10px row gap becomes 12 (between blocks).
 */

/**
 * What an empty state's action does (AVE-139). A button by default (`onClick`). An action that goes somewhere is a
 * link: `href` draws a plain `a`, `render` takes the app's own router link (`render={<Link to="/households/new" />}`)
 * so navigation stays client-side. Either way it keeps the button's look, and ui-sdk's Button keeps the link a link:
 * its role, its address, opening in a new tab. `render` wins over `href`; give the router link its own address.
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
 * A centered icon, title, one-line explanation, an action, and optional extra content (such as a second
 * action). `size="compact"` fits inside a card on a 390px phone (AVE-23, Neighbors' NEI-107): 24px top and
 * bottom, 16px sides.
 *
 * `externalLink` is a page outside the app, opened in the browser: "{lead} {label}". It stays a real link
 * (an `a` with an href, styled as the link button), never a button, so it opens in a new tab and reads as a
 * link (the app's MAN-954).
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
  ...props
}: ComponentProps<"div"> & {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  action?: EmptyAction | undefined;
  /** A quieter way out under the action, drawn as a link (e.g. "Use a different email"). */
  secondaryAction?: Omit<EmptyAction, "disabled"> | undefined;
  externalLink?: { lead: string; label: string; href: string } | undefined;
  size?: "default" | "compact" | undefined;
  headingLevel?: 2 | 3 | 4 | undefined;
}) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      data-slot="empty-state"
      data-size={size}
      className={cn(
        "flex flex-col items-center justify-center text-center text-compact",
        size === "compact" ? "px-4 py-6" : "px-6 py-12",
        className,
      )}
      {...props}
    >
      <Icon className="mb-3 size-6 text-muted-foreground" aria-hidden />
      <Heading className="font-semibold">{title}</Heading>
      <p className="mt-2 text-muted-foreground">{description}</p>
      {action && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          disabled={action.disabled ?? false}
          {...actionProps(action)}
        >
          {action.label}
        </Button>
      )}
      {secondaryAction && (
        <Button
          variant="link"
          size="sm"
          // 16px on a phone, so the two buttons' 44px tap areas meet but don't overlap (AVE-22).
          className="mt-2 pointer-coarse:mt-4"
          {...actionProps(secondaryAction)}
        >
          {secondaryAction.label}
        </Button>
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
    </div>
  );
}

/**
 * An empty section inside a card: a small icon tile, a title saying what would be here, one line saying what
 * fills it, and the next step when there is one. One row tall, so an empty page doesn't become a stack of
 * blank boxes. While a section shows this, its header leaves out the same step, so it shows once.
 */
function SectionEmpty({
  icon: Icon,
  title,
  line,
  action,
  className,
  ...props
}: Omit<ComponentProps<"div">, "title"> & {
  icon: LucideIcon;
  title: string;
  line: ReactNode;
  /** The next step: a button (`onClick`) or, for one that goes somewhere, a link (`href` or `render`; see EmptyAction). */
  action?: (Omit<EmptyAction, "disabled"> & { icon?: LucideIcon | undefined }) | undefined;
}) {
  return (
    <div
      data-slot="section-empty"
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-3", className)}
      {...props}
    >
      <IconTile icon={Icon} size="section" />
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-[550]">{title}</p>
        <p className="text-meta text-muted-foreground">{line}</p>
      </div>
      {action && (
        <Button variant="outline" size="sm" className="shrink-0 max-phone:ml-13" {...actionProps(action)}>
          {action.icon && <action.icon aria-hidden />} {action.label}
        </Button>
      )}
    </div>
  );
}

export { EmptyState, SectionEmpty };
