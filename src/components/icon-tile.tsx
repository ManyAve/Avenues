import { ClockIcon, type LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import type { Tint } from "#avenue/lib/format";
import { cn } from "#avenue/lib/utils";

/**
 * Status tones carry meaning (success = money in, warning = a complaint); `tint` is a decorative colour with none,
 * for a kind of thing (announcements), picked by name with `tint`.
 */
export type IconTileTone = "muted" | "primary" | "success" | "info" | "warning" | "slate" | "tint";

const tones: Record<IconTileTone, string> = {
  muted: "bg-muted text-muted-foreground",
  primary: "bg-primary-subtle text-primary-subtle-foreground",
  success: "bg-success-subtle text-success-subtle-foreground",
  info: "bg-info-subtle text-info-subtle-foreground",
  warning: "bg-warning-subtle text-warning-subtle-foreground",
  slate: "bg-slate-subtle text-slate-subtle-foreground",
  tint: "bg-(--tint-bg) text-(--tint-fg)",
};

/**
 * A small square with an icon that says what kind of thing a row is (AVE-9, from AVE-23): the activity feed's tiles
 * (the app's ActivityIconTile, 36px with an 18px icon) and an empty section's tile (SectionEmpty, 40px with a 20px
 * icon). Both take the lg corner (10px). Decorative: the row's text says what it is, so the tile is hidden from
 * screen readers, except the `automatic` mark, which is the only place that fact appears.
 */
export function IconTile({
  icon: Icon,
  size = "row",
  tone = "muted",
  tint,
  automatic = false,
  className,
  ...props
}: Omit<ComponentProps<"span">, "children"> & {
  icon: LucideIcon;
  /** row: 36px, for a list or feed row. section: 40px, for an empty section. */
  size?: "row" | "section" | undefined;
  tone?: IconTileTone | undefined;
  /** With tone "tint": which decorative tint. */
  tint?: Tint | undefined;
  /** A step ManyAve took by itself: a small clock mark at the corner, read as "Automatic". */
  automatic?: boolean | undefined;
}) {
  return (
    <span
      data-slot="icon-tile"
      data-size={size}
      data-tint={tone === "tint" ? (tint ?? "teal") : undefined}
      className={cn(
        "relative grid shrink-0 place-items-center rounded-lg data-[size=row]:size-9 data-[size=section]:size-10",
        tones[tone],
        className,
      )}
      {...props}
    >
      <Icon aria-hidden className={size === "row" ? "size-4.5" : "size-5"} />
      {automatic && (
        <span
          className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full bg-background text-primary-subtle-foreground ring-1 ring-border"
        >
          <ClockIcon aria-hidden className="size-2.5" />
          <span className="sr-only">Automatic</span>
        </span>
      )}
    </span>
  );
}
