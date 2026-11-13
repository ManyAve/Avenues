import { cva, type VariantProps } from "class-variance-authority";

/**
 * The field look every text-entry and value control shares: Input, Textarea, and the Select and Combobox
 * triggers. Border, background, focus ring, invalid ring and disabled state, copied from the app's input
 * (app/ui/components/ui/input.tsx at e01cc90). Height and corner come from `controlSize`.
 *
 * Text is 16px below 768px, so iOS doesn't zoom a focused field, and text-control (14px) from 768px, like every
 * other control label (AVE-29).
 *
 * Invalid styling keys off aria-invalid, which ui-sdk's Field sets on its control, so a screen never
 * styles an error by hand.
 */
export const controlSurface =
  "w-full min-w-0 border border-input bg-transparent text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 data-disabled:cursor-not-allowed data-disabled:bg-input/50 data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-control dark:bg-input/30 dark:disabled:bg-input/80 dark:data-disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

/**
 * AVE-2 section 2: a control's height decides its corner. xs and sm (24, 28) take the md corner (8px); md and lg
 * (32, 40) take the lg corner (10px). The one place that pairing lives: fields (controlSize), Button and Toggle all
 * compose it with their own padding, so a corner change happens here only. Controls that share a row share a size.
 */
export const controlShape = cva("", {
  variants: {
    size: {
      xs: "h-control-xs rounded-md",
      sm: "h-control-sm rounded-md",
      md: "h-control-md rounded-lg",
      lg: "h-control-lg rounded-lg",
    },
  },
  defaultVariants: { size: "md" },
});

export type ControlSize = NonNullable<VariantProps<typeof controlShape>["size"]>;

/** The field size: controlShape plus the field's side padding. Fields are never pills. */
export function controlSize({ size = "md" }: { size?: ControlSize | undefined } = {}) {
  return `${controlShape({ size })} ${size === "lg" ? "px-3" : "px-2"}`;
}
