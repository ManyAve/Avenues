import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button, buttonVariants } from "#avenue/components/button";
import { IconTile } from "#avenue/components/icon-tile";
import { cn } from "#avenue/lib/utils";

/**
 * ManyAve's EmptyState and SectionEmpty, ported from the app's app/ui/components/EmptyState.tsx and
 * SectionEmpty.tsx (e01cc90). Colours, type and order unchanged.
 * AVE-2 spacing: the page form's 64px top and bottom becomes 48 (the empty-state step); the description's 6px
 * gap becomes 8; SectionEmpty's 10px row gap becomes 12 (between blocks).
 */

type EmptyAction = { label: string; onClick?: (() => void) | undefined; disabled?: boolean | undefined };

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
          {...(action.onClick ? { onClick: action.onClick } : {})}
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
          {...(secondaryAction.onClick ? { onClick: secondaryAction.onClick } : {})}
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
  action?: { label: string; icon?: LucideIcon | undefined; onClick: () => void } | undefined;
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
        <Button variant="outline" size="sm" className="shrink-0 max-phone:ml-13" onClick={action.onClick}>
          {action.icon && <action.icon aria-hidden />} {action.label}
        </Button>
      )}
    </div>
  );
}

export { EmptyState, SectionEmpty };
