import * as React from "react"
import * as AvatarPrimitive from "@ui-sdk/react/avatar"
import { mergeProps, renderElement } from "@ui-sdk/react/primitive"
import { defined, type Loose, type OwnPartProps } from "#avenue/lib/props";
import { scaleStep, type WithDefault } from "#avenue/lib/control";
import { cn } from "#avenue/lib/utils";

/**
 * Ported from the app's app/ui/components/ui/avatar.tsx (e01cc90), unchanged but for the group (AVE-99, below): circles at 24, 32 and 40px (avatars
 * may be pills, AVE-2 section 5). ManyAve's tinted-initials Avatar (AVE-8) wraps this. When a name is shown beside
 * the avatar, hide the initials from screen readers (aria-hidden on AvatarFallback) so the name isn't read twice.
 */

function Avatar({
  className,
  size,
  ...props
}: Loose<React.ComponentProps<typeof AvatarPrimitive.Avatar>> & {
  /** `sm` 24, `md` 32 (the default) or `lg` 40. `"default"` is deprecated: use md (AVE-152). */
  size?: WithDefault<"sm" | "md" | "lg"> | undefined
}) {
  return (
    <AvatarPrimitive.Avatar
      data-slot="avatar"
      data-size={scaleStep(size)}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
        className
      )}
      {...defined(props)}
    />
  )
}

function AvatarImage({ className, ...props }: Loose<React.ComponentProps<typeof AvatarPrimitive.AvatarImage>>) {
  return (
    <AvatarPrimitive.AvatarImage
      data-slot="avatar-image"
      className={cn(
        "aspect-square size-full rounded-full object-cover",
        className
      )}
      {...defined(props)}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: Loose<React.ComponentProps<typeof AvatarPrimitive.AvatarFallback>>) {
  return (
    <AvatarPrimitive.AvatarFallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs",
        className
      )}
      {...defined(props)}
    />
  )
}

function AvatarBadge({ className, render, ...props }: OwnPartProps<"span">) {
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "avatar-badge",
        className: cn(
          "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none",
          "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
          "group-data-[size=md]/avatar:size-2.5 group-data-[size=md]/avatar:[&>svg]:size-2",
          "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

function AvatarGroup({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "avatar-group",
        className: cn(
          // AVE-99: the initials stay readable. Each avatar covers at most a quarter of the one before (4px at md,
          // 8px at lg; sm avatars only meet, as 14px web initials fill a 24px circle). The 2px ring is the card's colour,
          // since groups sit on cards. A covered avatar centres its initials in the part that shows (end padding), and
          // md initials use the meta size, as sm already does.
          "group/avatar-group flex -space-x-1 has-data-[size=sm]:space-x-0 has-data-[size=lg]:-space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-card",
          "[&>[data-slot=avatar][data-size=md]>[data-slot=avatar-fallback]]:text-xs",
          "[&>[data-slot=avatar]:not(:last-child)>[data-slot=avatar-fallback]]:pe-1 [&>[data-slot=avatar][data-size=lg]:not(:last-child)>[data-slot=avatar-fallback]]:pe-2 [&>[data-slot=avatar][data-size=sm]:not(:last-child)>[data-slot=avatar-fallback]]:pe-0.5",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

function AvatarGroupCount({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "avatar-group-count",
        className: cn(
          "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-card group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
