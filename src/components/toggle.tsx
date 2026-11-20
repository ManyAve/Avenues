import { Toggle as TogglePrimitive } from "@ui-sdk/react/toggle";
import type { ComponentProps } from "react";
import { controlShape } from "#avenue/lib/control";
import { cva, type VariantProps } from "#avenue/lib/cva";
import { defined, type Loose } from "#avenue/lib/props";

/**
 * Ported from the app's app/ui/components/ui/toggle.tsx (e01cc90). Colours and pressed state unchanged.
 * AVE-2 sizes: sm 28 (md corner), md 32 (the default) and lg 40 (lg corner); the app's lg was 36.
 * Side padding 10px to 8px.
 * `choice` is the chosen-segment look for a ToggleGroup (AVE-37). A toggle acts, so it is never a pill; a filter chip (a pill) is ManyAve's Chip, built on this in AVE-8.
 */
const toggleVariants = cva({
  base: "group/toggle relative hit-area inline-flex items-center justify-center gap-1 text-control font-medium whitespace-nowrap transition-all outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-pressed:bg-muted data-pressed:bg-muted data-checked:bg-muted dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  variants: {
    variant: {
      default: "bg-transparent",
      outline: "border border-input bg-transparent hover:bg-muted",
      // The chosen segment (AVE-37): outline items, and the chosen one takes the shared `chosen` look (AVE-50).
      // Management hand-writes it on four groups (DisplayOptions, forms, two in lob-mail). In a ToggleGroup the
      // chosen item also draws a check (toggle-group.tsx).
      choice: "border border-input bg-transparent hover:bg-muted data-checked:chosen data-pressed:chosen",
    },
    size: {
      sm: `${controlShape({ size: "sm" })} min-w-control-sm px-2 [&_svg:not([class*='size-'])]:size-3.5`,
      md: `${controlShape({ size: "md" })} min-w-control-md px-2`,
      lg: `${controlShape({ size: "lg" })} min-w-control-lg px-2`,
    },
  },
  defaultVariants: { variant: "default", size: "md" },
});

function Toggle({
  className,
  variant = "default",
  size = "md",
  ...props
}: Loose<ComponentProps<typeof TogglePrimitive>> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive data-slot="toggle" className={toggleVariants({ variant, size, className })} {...defined(props)} />
  );
}

export { Toggle, toggleVariants };
