import { controlSize, controlSurface, type ControlSize } from "#avenue/lib/control";
import { cn } from "#avenue/lib/utils";

// Internal to Avenue: the shared look of Select and Combobox. lib/ is not a package export, so none of this is
// public API.

/** Select and Combobox come in md (32px, lg corner, the default) and sm (28px, md corner, for a card or dialog header). */
export type PickerSize = Extract<ControlSize, "sm" | "md">;

/**
 * The closed field every value picker shares (Select trigger, native Select, Combobox input group): Avenue's control
 * surface and size (#avenue/lib/control), plus the states a wrapper needs. Base UI's Field marks an invalid Select
 * trigger with data-invalid, and a Combobox's invalid input sits inside the group, so both show the invalid ring.
 * sm text is 14px on wider screens to sit beside a header's 14px line; it stays 16px on phones so iOS doesn't zoom.
 */
export function fieldControl({ size = "md" }: { size?: PickerSize | null | undefined } = {}) {
  return cn(
    controlSurface,
    controlSize({ size: size ?? "md" }),
    "flex items-center gap-2 text-foreground",
    "data-invalid:border-destructive data-invalid:ring-3 data-invalid:ring-destructive/20 dark:data-invalid:border-destructive/50 dark:data-invalid:ring-destructive/40",
    "has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50",
    "has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40",
    size === "sm" && "md:text-control",
  );
}

/**
 * The open list's frame: the app's menu look (lg corner, popover colours, ring). As wide as its field, never narrower
 * than 192px (UI Designer, AVE-7); long options wrap.
 */
export const listPopup =
  "max-h-[min(20rem,var(--available-height))] w-(--anchor-width) min-w-48 max-w-(--available-width) origin-(--transform-origin) overflow-y-auto overscroll-contain rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none " +
  "duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";

/** One row in that list: sm corner, inset 4px inside the lg frame (AVE-2 section 4). */
export const listItem =
  "grid cursor-default grid-cols-[1rem_1fr] items-center gap-x-2 rounded-sm px-2 py-1 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50";
