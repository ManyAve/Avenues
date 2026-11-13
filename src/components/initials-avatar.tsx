import type { ComponentProps } from "react";
import { Avatar, AvatarFallback } from "#avenue/components/avatar";
import { cn } from "#avenue/lib/utils";

const tints = ["teal", "plum", "stone", "iris"] as const;
type Tint = (typeof tints)[number];

/**
 * The tint for a key, by a stable FNV-1a hash (the app's tintFor, e01cc90), so sorting or filtering never
 * recolours a person. Teal, plum, iris and stone carry no status meaning.
 */
function tintFor(key: string): Tint {
  let h = 2166136261;
  for (const c of key) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return tints[h % tints.length]!;
}

/** First letter of the first two words that start with a letter, in any script. */
function initials(name: string): string {
  return (name.match(/(?<=^|\s)\p{L}/gu) ?? []).slice(0, 2).join("").toUpperCase();
}

/**
 * ManyAve's tinted-initials avatar, ported from the app's app/ui/components/Avatar.tsx (e01cc90): sm 28 and
 * default 32, no border ring. Colours unchanged.
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
  size?: "sm" | "default" | undefined;
}) {
  return (
    <Avatar
      size={size}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": name })}
      className={cn("after:hidden data-[size=default]:size-8 data-[size=sm]:size-7", className)}
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

export { InitialsAvatar, initials, tintFor, type Tint };
