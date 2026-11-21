"use client";

import { SlidersHorizontal } from "lucide-react";
import type { SegmentedControlValueChangeReason } from "@ui-sdk/react/segmented-control";
import type { ChangeDetails } from "#avenue/lib/change";
import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Button } from "#avenue/components/button";
import { Checkbox } from "#avenue/components/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "#avenue/components/popover";
import type { Density } from "#avenue/components/register";
import { ToggleGroup, ToggleGroupItem } from "#avenue/components/toggle-group";
import { ToolbarItem } from "#avenue/components/toolbar";
import { ToolbarButton } from "#avenue/components/toolbar-button";
import { defined, type Loose, type NodeChildren, type OwnPartProps } from "#avenue/lib/props";
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
function DisplayOptions({
  children,
  className,
  ...props
}: NodeChildren<Omit<Loose<ComponentProps<typeof PopoverContent>>, "align">>) {
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
        // Other props (a ref, an id, data-*) go to the popover, like className: it is what the parts below fill
        // (AVE-138). The trigger is the toolbar's, named by its label.
        {...props}
        align="end"
        aria-label="Display options"
        // 320px, or wider when Row height's equal columns need it (AVE-50: each holds the widest label and the check).
        // Never wider than the screen's room, as every popover (AVE-112): a minimum would otherwise beat that maximum.
        // On a phone (under 640px) it takes all the room there is, so Row height's three heights share one row (AVE-176).
        className={cn("w-min min-w-[min(--spacing(80),var(--available-width))] gap-0 text-meta max-sm:w-(--available-width)", className)}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

function DisplayOptionsSection({
  title,
  children,
  className,
  render,
  ...props
}: Omit<OwnPartProps<"section">, "title"> & { title: string }) {
  return renderElement(
    "section",
    mergeProps(defined(props), {
      "data-slot": "display-options-section",
      className: cn("not-first:mt-3", className),
      children: (
        <>
          <h3 className="mb-1 text-meta font-normal text-muted-foreground">{title}</h3>
          {children}
        </>
      ),
    }),
    render,
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
  className,
  ...props
}: Omit<
  // The single-choice group's props: Row height is one choice of three.
  Extract<ComponentProps<typeof ToggleGroup>, { multiple?: false | undefined }>,
  "value" | "defaultValue" | "onValueChange" | "multiple" | "controller" | "variant" | "size" | "spacing" | "orientation" | "children"
> & {
  value: Density;
  /** Gets the new height and ui-sdk SegmentedControl's details, passed on unchanged (AVE-145). */
  onValueChange?: ((density: Density, details: ChangeDetails<SegmentedControlValueChangeReason>) => void) | undefined;
}) {
  return (
    <ToggleGroup
      // Other props (a ref, an id, data-*) land on the group; its value, look and name stay Avenue's (AVE-138).
      {...props}
      value={value}
      onValueChange={(next, details) => {
        const density = densities.find(([key]) => key === next)?.[0];
        if (density) onValueChange?.(density, details);
      }}
      // The shared chosen segment (AVE-50, AVE-91): equal columns, and the chosen height carries a check. The app
      // hand-writes the chosen colours on outline items and draws no check.
      variant="choice"
      size="sm"
      aria-label="Row height"
      // On a phone (under 640px) the three equal columns don't fit the screen (AVE-176): the heights share the row
      // instead, each at least as wide as its label and check, and wrap if even that is too wide (a 320px phone).
      className={cn("w-full max-sm:flex! max-sm:min-w-0! max-sm:flex-wrap", className)}
    >
      {densities.map(([key, label]) => (
        <ToggleGroupItem key={key} value={key} className="text-control max-sm:flex-auto">
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** A full-width row in the panel, like a menu item, so it doesn't press (AVE-212): it fades its colours only. */
function DisplayOptionsAction({ className, ...props }: ComponentProps<typeof Button>) {
  return <Button variant="ghost" size="sm" className={cn("w-full justify-start transition-colors pointer-coarse:h-11", className)} {...props} />;
}

export { DisplayOptions, DisplayOptionsAction, DisplayOptionsCheckbox, DisplayOptionsDensity, DisplayOptionsSection };
