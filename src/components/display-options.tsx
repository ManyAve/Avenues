"use client";

import { SlidersHorizontal } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Button } from "#avenue/components/button";
import { Checkbox } from "#avenue/components/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "#avenue/components/popover";
import type { Density } from "#avenue/components/register";
import { ToggleGroup, ToggleGroupItem } from "#avenue/components/toggle-group";
import { ToolbarItem } from "#avenue/components/toolbar";
import { ToolbarButton } from "#avenue/components/toolbar-button";
import { cn } from "#avenue/lib/utils";

/**
 * ManyAve's Display options (the app's app/ui/components/DisplayOptions.tsx at e01cc90): a toolbar button that opens
 * a popover of view settings for the list under it. Put it inside a Toolbar; its button joins the toolbar's arrow
 * keys. Fill it with the parts below, in sections:
 *
 * - `DisplayOptionsSection`: a muted heading over related options.
 * - `DisplayOptionsCheckbox`: a labelled on/off option, with an optional hint read with it.
 * - `DisplayOptionsDensity`: the Register's row height, one choice of three.
 * - `DisplayOptionsAction`: a rare task such as Export, which shows why when it's unavailable.
 *
 * Changes from the app (AVE-2): the popover's padding is --space-inset (16px, was 12px), option rows have 8px above
 * and below (was 6px), and the trigger is Avenue's ToolbarButton. Its label shows from 1280px, as in the app. On a phone,
 * option rows and actions are 44px tall, so neighbouring tap areas don't overlap (AVE-22).
 */
function DisplayOptions({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return (
    <Popover>
      <ToolbarItem
        aria-label="Display options"
        render={<PopoverTrigger render={<ToolbarButton />} />}
      >
        <SlidersHorizontal aria-hidden />
        <span aria-hidden className="hidden xl:inline">
          Display
        </span>
      </ToolbarItem>
      <PopoverContent
        align="end"
        aria-label="Display options"
        // 320px, or wider when Row height's equal columns need it (AVE-50: each holds the widest label and the check).
        className={cn("w-min min-w-80 gap-0 text-meta", className)}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

function DisplayOptionsSection({ title, children, className }: { title: string; children: ReactNode; className?: string | undefined }) {
  return (
    <section data-slot="display-options-section" className={cn("not-first:mt-3", className)}>
      <h3 className="mb-1 text-meta font-normal text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function DisplayOptionsCheckbox({
  label,
  hint,
  ...props
}: Omit<ComponentProps<typeof Checkbox>, "id"> & { label: ReactNode; hint?: ReactNode }) {
  const id = useId();
  return (
    <label htmlFor={id} data-slot="display-options-checkbox" className="flex items-center justify-between gap-3 py-2 pointer-coarse:min-h-11">
      <span>
        {label}
        {hint ? (
          <span id={`${id}-hint`} className="block text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
      <Checkbox id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...props} />
    </label>
  );
}

const densities: [Density, string][] = [
  ["compact", "Compact"],
  ["normal", "Normal"],
  ["comfortable", "Comfortable"],
];

function DisplayOptionsDensity({
  value,
  onValueChange,
}: {
  value: Density;
  onValueChange?: ((density: Density) => void) | undefined;
}) {
  return (
    <ToggleGroup
      value={value}
      onValueChange={(next) => {
        const density = densities.find(([key]) => key === next)?.[0];
        if (density) onValueChange?.(density);
      }}
      // The shared chosen segment (AVE-50, AVE-91): equal columns, and the chosen height carries a check. The app
      // hand-writes the chosen colours on outline items and draws no check.
      variant="choice"
      size="sm"
      aria-label="Row height"
      className="w-full"
    >
      {densities.map(([key, label]) => (
        <ToggleGroupItem key={key} value={key} className="text-control">
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function DisplayOptionsAction({ className, ...props }: ComponentProps<typeof Button>) {
  return <Button variant="ghost" size="sm" className={cn("w-full justify-start pointer-coarse:h-11", className)} {...props} />;
}

export { DisplayOptions, DisplayOptionsAction, DisplayOptionsCheckbox, DisplayOptionsDensity, DisplayOptionsSection };
