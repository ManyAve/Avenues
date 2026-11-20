import { Check } from "lucide-react";
import { SegmentedControl, SegmentedControlItem } from "@ui-sdk/react/segmented-control";
import { Toggle, ToggleGroup as ToggleGroupPrimitive } from "@ui-sdk/react/toggle";
import type { VariantProps } from "#avenue/lib/cva";
import { createContext, useContext, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { toggleVariants } from "#avenue/components/toggle";
import { scaleStep } from "#avenue/lib/control";
import { cn } from "#avenue/lib/utils";
import { defined, type Loose, type NodeChildren } from "#avenue/lib/props";

/**
 * Ported from the app's app/ui/components/ui/toggle-group.tsx (e01cc90). `spacing` is in 4px steps (default 2,
 * 8px); `spacing={0}` joins the items into one segmented control whose outer corners follow the size (md for sm, lg
 * otherwise). Both kinds have one Tab stop. Sizes are Toggle's: sm, md (the default) and lg; `"default"` is deprecated
 * (use md), and `data-size` always carries the step's name.
 *
 * A single-choice group (the default) is a radio group, ui-sdk's SegmentedControl: `value` is one string, the
 * arrow keys move and select together, and Tab lands on the chosen item. Pass `multiple` for independent on/off
 * items, ui-sdk's ToggleGroup of pressed buttons: `value` is a list, arrows move and Space or Enter presses.
 * The parts keep ui-sdk's data-slot names: segmented-control(-item), or toggle-group and toggle.
 *
 * `variant="choice"` (AVE-37, AVE-50) is for choosing an answer: the chosen item takes the shared `chosen` look and a
 * leading 16px check, 4px before its label, so the state isn't shown by colour alone (WCAG 1.4.1, as Chip). The
 * check replaces an item's icon while it is chosen. The items are equal columns, as wide as the widest label plus
 * the check, and centre their contents, so choosing never changes a width or moves a label's neighbours. This
 * departs from Management, whose groups draw no check (parity allowance AVE-50).
 */
type GroupStyle = VariantProps<typeof toggleVariants> & {
  spacing?: number | undefined;
  orientation?: "horizontal" | "vertical" | undefined;
};

const ToggleGroupContext = createContext<GroupStyle & { multiple: boolean }>({
  size: "md",
  variant: "default",
  spacing: 2,
  orientation: "horizontal",
  multiple: false,
});

type SingleProps = { multiple?: false | undefined } & Loose<ComponentProps<typeof SegmentedControl>>;
type MultipleProps = { multiple: true } & Omit<Loose<ComponentProps<typeof ToggleGroupPrimitive>>, "multiple">;

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 2,
  orientation = "horizontal",
  children,
  ...props
}: NodeChildren<SingleProps | MultipleProps> & GroupStyle) {
  const shared = {
    "data-variant": variant,
    "data-size": size && scaleStep(size),
    "data-spacing": spacing,
    "data-orientation": orientation,
    orientation,
    style: { "--gap": spacing } as CSSProperties,
    className: cn(
      // On a phone, a spaced group wraps instead of running off the screen, and its items sit at least gap-controls
      // (16px) apart in both directions, so their 44px hit areas don't overlap (AVE-22).
      "group/toggle-group flex w-fit flex-row items-center pointer-coarse:not-data-[spacing=0]:flex-wrap pointer-coarse:not-data-[spacing=0]:gap-[max(calc(var(--spacing)*var(--gap)),var(--avenue-controls-gap))] gap-[--spacing(var(--gap))] rounded-lg data-[size=sm]:rounded-md data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
      // A choice group's items are equal columns (AVE-50): the widest sets them all. `1fr`, not `auto-cols-fr`
      // (minmax(0, 1fr)), so a column is never narrower than its item, and `min-w-max` so a parent sized to its
      // content (Display options) makes room for equal columns.
      "data-[variant=choice]:grid data-[variant=choice]:min-w-max data-[variant=choice]:auto-cols-[1fr] data-[variant=choice]:grid-flow-col data-[variant=choice]:data-[orientation=vertical]:grid-flow-row",
      className,
    ),
  };
  const items = (
    <ToggleGroupContext.Provider value={{ variant, size, spacing, orientation, multiple: !!props.multiple }}>
      {children}
    </ToggleGroupContext.Provider>
  );
  if (props.multiple) {
    return (
      <ToggleGroupPrimitive {...shared} {...defined(props)} multiple>
        {items}
      </ToggleGroupPrimitive>
    );
  }
  const { multiple: _single, ...single } = props;
  return (
    <SegmentedControl {...shared} {...defined(single)}>
      {items}
    </SegmentedControl>
  );
}

// 6px plus the item's 4px gap is 10px on each side: the check's 16px and its 4px gap, split.
const choiceSpace =
  "w-1.5 shrink-0 group-data-checked/toggle:hidden group-data-pressed/toggle:hidden group-has-[>svg:not([data-slot=toggle-check])]/toggle:hidden";

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "md",
  value,
  ...props
}: Omit<Loose<ComponentProps<typeof Toggle>>, "value" | "children"> & {
  value: string;
  children?: ReactNode;
} & VariantProps<typeof toggleVariants>) {
  const context = useContext(ToggleGroupContext);
  const choice = (context.variant || variant) === "choice";
  const content = choice ? (
    <>
      <Check aria-hidden data-slot="toggle-check" className="hidden size-4 group-data-checked/toggle:block group-data-pressed/toggle:block" />
      {/* An item with no icon keeps the check's 20px as 10px each side while unchosen, so its label stays centred
          and its width doesn't change when chosen. An item with an icon swaps the icon for the check instead. */}
      <span aria-hidden className={choiceSpace} />
      {children}
      <span aria-hidden className={choiceSpace} />
    </>
  ) : (
    children
  );
  const itemProps = {
    "data-variant": context.variant || variant,
    "data-size": scaleStep(context.size || size),
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
      // A choice item is never narrower than its label and check, so the equal columns hold the widest one; on a phone
      // too, where the group's 16px gap keeps its tap areas apart.
      choice && "min-w-max pointer-coarse:group-data-[orientation=horizontal]/toggle-group:min-w-max",
      choice && "data-checked:[&>svg:not([data-slot=toggle-check])]:hidden data-pressed:[&>svg:not([data-slot=toggle-check])]:hidden",
      "group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:first-of-type:border-l group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:first-of-type:border-t",
      className,
    ),
  };
  if (context.multiple) {
    return (
      <Toggle {...itemProps} {...defined(props)}>
        {content}
      </Toggle>
    );
  }
  return (
    <SegmentedControlItem {...itemProps} {...defined(props as Loose<ComponentProps<typeof SegmentedControlItem>>)}>
      {content}
    </SegmentedControlItem>
  );
}

export { ToggleGroup, ToggleGroupItem };
