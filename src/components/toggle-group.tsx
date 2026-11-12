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
    "data-slot": "toggle-group",
    "data-variant": variant,
    "data-size": size,
    "data-spacing": spacing,
    "data-orientation": orientation,
    orientation,
    style: { "--gap": spacing } as CSSProperties,
    className: cn(
      "group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] rounded-lg data-[size=sm]:rounded-md data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
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
    "data-slot": "toggle-group-item",
    "data-variant": context.variant || variant,
    "data-size": context.size || size,
    "data-spacing": context.spacing,
    value,
    className: cn(
      "shrink-0 focus:z-10 focus-visible:z-10",
      toggleVariants({ variant: context.variant || variant, size: context.size || size }),
      // Joined (spacing 0): square inner corners, outer corners match the group, shared borders.
      "group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-2",
      "group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:first:rounded-l-lg group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:last:rounded-r-lg group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:first:rounded-t-lg group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:last:rounded-b-lg",
      "group-data-[size=sm]/toggle-group:group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:first:rounded-l-md group-data-[size=sm]/toggle-group:group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:last:rounded-r-md group-data-[size=sm]/toggle-group:group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:first:rounded-t-md group-data-[size=sm]/toggle-group:group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:last:rounded-b-md",
      "group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
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
