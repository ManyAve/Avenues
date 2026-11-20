import type { ComponentProps } from "react";
import { Avatar, AvatarFallback } from "#avenue/components/avatar";
import { initials, tintFor } from "#avenue/lib/format";
import { cn } from "#avenue/lib/utils";

/**
 * ManyAve's tinted-initials avatar, ported from the app's app/ui/components/Avatar.tsx (e01cc90): sm 28 and
 * md 32, no border ring. Colours unchanged.
 *
 * `tintKey` picks the tint. Pass the person's stable id so one person keeps one colour on every screen, even
 * when their name is written differently (Neighbors' NEI-105, via AVE-23); it falls back to the name, as the
 * app does today.
 *
 * Screen readers and agents get the name (the avatar's label), not the initials. When the name is shown beside the avatar, pass `decorative`
 * so it is read once.
 */
function InitialsAvatar({
  name,
  tintKey,
  decorative = false,
  size = "sm",
  className,
  ...props
}: Omit<ComponentProps<typeof Avatar>, "children" | "size"> & {
  name: string;
  tintKey?: string | undefined;
  decorative?: boolean | undefined;
  /** `sm` 28 (the default here) or `md` 32. */
  size?: "sm" | "md" | undefined;
}) {
  return (
    <Avatar
      size={size}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": name })}
      className={cn("after:hidden data-[size=md]:size-8 data-[size=sm]:size-7", className)}
      {...props}
    >
      <AvatarFallback
        data-tint={tintFor(tintKey ?? name)}
        className="bg-(--tint-bg) text-meta font-[550] tracking-[0.2px] text-(--tint-fg)"
      >
        <span aria-hidden>{initials(name)}</span>
      </AvatarFallback>
    </Avatar>
  );
}

export { InitialsAvatar };
