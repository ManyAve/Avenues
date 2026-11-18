import { cva, type VariantProps } from "class-variance-authority";

/**
 * The field look every text-entry and value control shares: Input, Textarea, and the Select and Combobox
 * triggers. Border, background, focus ring, invalid ring and disabled state, copied from the app's input
 * (app/ui/components/ui/input.tsx at e01cc90). Height and corner come from `controlSize`.
 *
 * Text (AVE-29): 16px below 768px so iOS doesn't zoom on focus, then `text-control` (14px on both scales) so a field
 * shares one text size with the buttons and chips in its row. The app's `md:text-sm` gave 16px on the web scale.
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

/**
 * The field size: controlShape plus the field's side padding. Fields are never pills.
 *
 * On a phone (coarse pointer), text fields (Input, the Combobox input) grow to 44px, because an <input> can't carry
 * the invisible `hit-area`; Select triggers grow at md and keep their size with `hit-area` at sm (AVE-22). Each
 * component adds that itself.
 */
export function controlSize({ size = "md" }: { size?: ControlSize | undefined } = {}) {
  return `${controlShape({ size })} ${size === "lg" ? "px-3" : "px-2"}`;
}

/**
 * The one size scale (AVE-152). ui-sdk has no size props, so sizes are Avenue's own: every control that comes in
 * steps names them xs / sm / md / lg, the steps controlShape and the `h-control-*` tokens use, and `md` is the default.
 * Each component takes the steps it has. Sizes that name a place rather than a step (EmptyState `compact`, IconTile
 * `row | section`, FormDialog and Dock `width`) are not on the scale.
 *
 * `"default"` was the shadcn name for md. It is deprecated; removed once both apps have moved off it (AVE-154). Use md.
 */
export type ScaleStep = "xs" | "sm" | "md" | "lg";

/** A component's own steps, plus the deprecated `"default"` (use md). */
export type WithDefault<S extends ScaleStep> = S | "default";

/** The step a size names: `"default"` (deprecated) and no size are md. What `data-size` carries, so CSS reads one name. */
export function scaleStep<S extends ScaleStep>(size: S | "default" | null | undefined): S | "md" {
  return size == null || size === "default" ? "md" : size;
}
