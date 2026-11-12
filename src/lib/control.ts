import { cva } from "class-variance-authority";

/**
 * The field look every text-entry and value control shares: Input, Textarea, and the Select and Combobox
 * triggers. Border, background, focus ring, invalid ring and disabled state, copied from the app's input
 * (app/ui/components/ui/input.tsx at e01cc90). Height and corner come from `controlSize`.
 *
 * Invalid styling keys off aria-invalid, which Base UI's Field sets on its control, so a screen never
 * styles an error by hand.
 */
export const controlSurface =
  "w-full min-w-0 border border-input bg-transparent text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 data-disabled:cursor-not-allowed data-disabled:bg-input/50 data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:data-disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

/**
 * AVE-2 section 2: four control heights, each with its corner. xs and sm (24, 28) take the md corner (8px);
 * md and lg (32, 40) take the lg corner (10px). Controls that share a row share a size. Fields are never pills.
 */
export const controlSize = cva("", {
  variants: {
    size: {
      xs: "h-control-xs rounded-md px-2",
      sm: "h-control-sm rounded-md px-2",
      md: "h-control-md rounded-lg px-2",
      lg: "h-control-lg rounded-lg px-3",
    },
  },
  defaultVariants: { size: "md" },
});

export type ControlSize = "xs" | "sm" | "md" | "lg";
