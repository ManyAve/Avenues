import { Switch as SwitchPrimitive, SwitchThumb } from "@ui-sdk/react/switch";
import type { ComponentProps } from "react";
import { cn } from "#avenue/lib/utils";

/**
 * Ported from the app's app/ui/components/ui/switch.tsx (e01cc90), unchanged: track and thumb are pills (AVE-2
 * section 5 allows them for switches), default 32 x 18.4px, sm 24 x 14px (28px wide on phones, AVE-22). Its invisible hit area
 * is the shared `hit-area`: 12px left and right and 8px up and down with a mouse, at least 44px on phones. Inside a Field it is labelled by FieldLabel.
 * Off, the track carries a `muted-foreground` border, because the `input` track alone measures under 3:1 against the page
 * (WCAG 1.4.11; a named departure from the app, AVE-38).
 */
function Switch({
  className,
  size = "default",
  ...props
}: ComponentProps<typeof SwitchPrimitive> & { size?: "sm" | "default" | undefined }) {
  return (
    <SwitchPrimitive
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none group-has-[:focus-visible]/field-label:border-transparent group-has-[:focus-visible]/field-label:ring-0 hit-area [--hit-area-x:--spacing(3)] [--hit-area-y:--spacing(2)] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-[18.4px] data-[size=default]:w-[32px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] pointer-coarse:data-[size=sm]:w-7 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:bg-primary data-unchecked:bg-input data-unchecked:not-aria-invalid:not-focus-visible:border-muted-foreground dark:data-unchecked:bg-input/80 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchThumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] pointer-coarse:group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%+2px)] dark:data-checked:bg-primary-foreground group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 dark:data-unchecked:bg-foreground"
      />
    </SwitchPrimitive>
  );
}

export { Switch };
