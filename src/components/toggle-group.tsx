import { SegmentedControl, SegmentedControlItem } from "@ui-sdk/react/segmented-control";
import { Toggle, ToggleGroup as ToggleGroupPrimitive } from "@ui-sdk/react/toggle";
import type { VariantProps } from "class-variance-authority";
import { createContext, useContext, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { toggleVariants } from "#avenue/components/toggle";
import { cn } from "#avenue/lib/utils";

/**
 * Ported from the app's app/ui/components/ui/toggle-group.tsx (e01cc90). `spacing` is in 4px steps (default 2,
 * 8px); `spacing={0}` joins the items into one segmented control whose outer corners follow the size (md for sm, lg
 * otherwise). Both kinds have one Tab stop.
 *
 * A single-choice group (the default) is a radio group, ui-sdk's SegmentedControl: `value` is one string, the
 * arrow keys move and select together, and Tab lands on the chosen item. Pass `multiple` for independent on/off
 * items, ui-sdk's ToggleGroup of pressed buttons: `value` is a list, arrows move and Space or Enter presses.
 * The parts keep ui-sdk's data-slot names: segmented-control(-item), or toggle-group and toggle.
 */
type GroupStyle = VariantProps<typeof toggleVariants> & {
  spacing?: number | undefined;
  orientation?: "horizontal" | "vertical" | undefined;
};

const ToggleGroupContext = createContext<GroupStyle & { multiple: boolean }>({
  size: "default",
  variant: "default",
  spacing: 2,
  orientation: "horizontal",
  multiple: false,
});

type SingleProps = { multiple?: false | undefined } & ComponentProps<typeof SegmentedControl>;
type MultipleProps = { multiple: true } & Omit<ComponentProps<typeof ToggleGroupPrimitive>, "multiple">;

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 2,
  orientation = "horizontal",
  children,
  ...props
}: (SingleProps | MultipleProps) & GroupStyle) {
  const shared = {
    "data-variant": variant,
    "data-size": size,
    "data-spacing": spacing,
    "data-orientation": orientation,
    orientation,
    style: { "--gap": spacing } as CSSProperties,
    className: cn(
      // On a phone, a spaced group wraps instead of running off the screen, and its items sit at least gap-controls
      // (16px) apart in both directions, so their 44px hit areas don't overlap (AVE-22).
      "group/toggle-group flex w-fit flex-row items-center pointer-coarse:not-data-[spacing=0]:flex-wrap pointer-coarse:not-data-[spacing=0]:gap-[max(calc(var(--spacing)*var(--gap)),var(--avenue-controls-gap))] gap-[--spacing(var(--gap))] rounded-lg data-[size=sm]:rounded-md data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
      className,
    ),
  };
  const items = (
    <ToggleGroupContext.Provider value={{ variant, size, spacing, orientation, multiple: !!props.multiple }}>
      {children as ReactNode}
    </ToggleGroupContext.Provider>
  );
  if (props.multiple) {
    return (
      <ToggleGroupPrimitive {...shared} {...props} multiple>
        {items}
      </ToggleGroupPrimitive>
    );
  }
  const { multiple: _single, ...single } = props;
  return (
    <SegmentedControl {...shared} {...single}>
      {items}
    </SegmentedControl>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  value,
  ...props
}: Omit<ComponentProps<typeof Toggle>, "value" | "children"> & {
  value: string;
  children?: ReactNode;
} & VariantProps<typeof toggleVariants>) {
  const context = useContext(ToggleGroupContext);
  const itemProps = {
    "data-variant": context.variant || variant,
    "data-size": context.size || size,
    "data-spacing": context.spacing,
    value,
    className: cn(
      "shrink-0 focus:z-10 focus-visible:z-10",
      // On a phone, items sit closer than their 44px hit areas allow (joined, or 8px apart), so each grows to 44px
      // along the group's axis instead (AVE-22). Desktop is unchanged.
      "pointer-coarse:group-data-[orientation=horizontal]/toggle-group:min-w-11 pointer-coarse:group-data-[orientation=vertical]/toggle-group:min-h-11",
      toggleVariants({ variant: context.variant || variant, size: context.size || size }),
      // Joined (spacing 0): square inner corners, outer corners match the group, shared borders. first/last-of-type,
      // because a single-choice group also holds ui-sdk's hidden native input.
      "group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-2",
      "group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:first-of-type:rounded-l-lg group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:last-of-type:rounded-r-lg group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:first-of-type:rounded-t-lg group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:last-of-type:rounded-b-lg",
      "group-data-[size=sm]/toggle-group:group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:first-of-type:rounded-l-md group-data-[size=sm]/toggle-group:group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:last-of-type:rounded-r-md group-data-[size=sm]/toggle-group:group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:first-of-type:rounded-t-md group-data-[size=sm]/toggle-group:group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:last-of-type:rounded-b-md",
      "group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:first-of-type:border-l group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:first-of-type:border-t",
      className,
    ),
  };
  if (context.multiple) {
    return (
      <Toggle {...itemProps} {...props}>
        {children}
      </Toggle>
    );
  }
  return (
    <SegmentedControlItem {...itemProps} {...(props as ComponentProps<typeof SegmentedControlItem>)}>
      {children}
    </SegmentedControlItem>
  );
}

export { ToggleGroup, ToggleGroupItem };
