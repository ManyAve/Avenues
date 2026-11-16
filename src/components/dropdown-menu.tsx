import * as MenuPrimitive from "@ui-sdk/react/menu";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { popupMotion } from "#avenue/lib/popup";
import { cn } from "#avenue/lib/utils";

/**
 * Ported from the app's app/ui/components/ui/dropdown-menu.tsx (e01cc90). The menu keeps the lg corner (10px) and
 * its 4px inset; items take the sm corner (6px, concentric with the menu: 10 - 4), and item padding and icon gaps
 * move from 6px to 8px (AVE-2). Keyboard (ui-sdk's menu): Enter, Space or ArrowDown opens on the first item; arrows
 * move, typing jumps to the item that starts with the typed letters, Enter or Space chooses, Esc closes and returns
 * focus to the trigger. A click opens it with focus inside, and no item looks chosen until the pointer or a key
 * highlights one. Parts carry ui-sdk's own data-slot names (menu-content, menu-item, ...), which its behavior reads.
 */
function DropdownMenu(props: ComponentProps<typeof MenuPrimitive.Menu>) {
  return <MenuPrimitive.Menu {...props} />;
}

function DropdownMenuTrigger(props: ComponentProps<typeof MenuPrimitive.MenuTrigger>) {
  return <MenuPrimitive.MenuTrigger {...props} />;
}

const menuSurface =
  "max-h-(--available-height) min-w-32 overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none";

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.MenuContent>) {
  return (
    <MenuPrimitive.MenuContent
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      className={cn(menuSurface, "w-(--anchor-width)", popupMotion, className)}
      {...props}
    />
  );
}

function DropdownMenuGroup(props: ComponentProps<typeof MenuPrimitive.MenuGroup>) {
  return <MenuPrimitive.MenuGroup {...props} />;
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: ComponentProps<typeof MenuPrimitive.MenuGroupLabel> & { inset?: boolean | undefined }) {
  return (
    <MenuPrimitive.MenuGroupLabel
      data-inset={inset}
      className={cn("px-2 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7", className)}
      {...props}
    />
  );
}

const itemClass =
  "relative flex pointer-coarse:min-h-11 cursor-default items-center gap-2 rounded-sm px-2 py-1 text-control outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

type SelectHandler = (event: Event) => unknown;

/** Runs `onSelect`, then `onClick`, with the one event; a Promise from either keeps the item pending until both settle. */
function runSelect(onSelect: SelectHandler | undefined, onClick: SelectHandler | undefined): SelectHandler | undefined {
  if (!onClick) return onSelect;
  return (event) => {
    const results = [onSelect?.(event), onClick(event)].filter((result) => result instanceof Promise);
    return results.length > 0 ? Promise.all(results) : undefined;
  };
}

/**
 * A menu action. `variant="destructive"` for delete and similar. A disabled item can carry `reason`: one muted line
 * under the label, read with the item by screen readers, so nobody has to guess why it's unavailable.
 *
 * The action goes on `onSelect`, which ui-sdk runs for a pointer click, Enter, Space and an agent alike. `onClick` is
 * the same action under the name shadcn and Base UI items use (AVE-111): ui-sdk's own `onClick` fires for a pointer
 * click only, so an item wired to it did nothing from the keyboard. Here it is routed through `onSelect`, gets the
 * DOM event that selected the item (a `MouseEvent`, a `KeyboardEvent`, or a plain `select` Event), and runs once.
 */
function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  reason,
  children,
  onSelect,
  onClick,
  ...props
}: Omit<ComponentProps<typeof MenuPrimitive.MenuItem>, "onClick"> & {
  inset?: boolean | undefined;
  variant?: "default" | "destructive" | undefined;
  reason?: ReactNode | undefined;
  /** The item's action, by pointer, keyboard or agent: the same as `onSelect`, which runs first when both are set. */
  onClick?: SelectHandler | undefined;
}) {
  const reasonId = useId();
  const select = runSelect(onSelect, onClick);
  return (
    <MenuPrimitive.MenuItem
      {...(select ? { onSelect: select } : {})}
      data-inset={inset}
      data-variant={variant}
      destructive={variant === "destructive"}
      aria-describedby={reason ? reasonId : undefined}
      className={cn(
        "group/dropdown-menu-item",
        itemClass,
        "not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-[variant=destructive]:text-destructive-subtle-foreground data-[variant=destructive]:data-highlighted:bg-destructive/10 data-[variant=destructive]:data-highlighted:text-destructive-subtle-foreground dark:data-[variant=destructive]:data-highlighted:bg-destructive/20 data-[variant=destructive]:*:[svg]:text-destructive-subtle-foreground",
        reason && "flex-wrap data-disabled:opacity-100 data-disabled:*:not-data-[slot=dropdown-menu-item-reason]:opacity-50",
        className,
      )}
      {...props}
    >
      {children as ReactNode}
      {reason && (
        <span
          id={reasonId}
          data-slot="dropdown-menu-item-reason"
          className="basis-full text-meta text-muted-foreground"
        >
          {reason}
        </span>
      )}
    </MenuPrimitive.MenuItem>
  );
}

function DropdownMenuSub(props: ComponentProps<typeof MenuPrimitive.MenuSub>) {
  return <MenuPrimitive.MenuSub {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.MenuSubTrigger> & { inset?: boolean | undefined }) {
  return (
    <MenuPrimitive.MenuSubTrigger
      data-inset={inset}
      className={cn(itemClass, "data-open:bg-accent data-open:text-accent-foreground", className)}
      {...props}
    >
      {children as ReactNode}
      <ChevronRightIcon aria-hidden className="ml-auto" />
    </MenuPrimitive.MenuSubTrigger>
  );
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -4,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.MenuSubContent>) {
  return (
    <MenuPrimitive.MenuSubContent
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      className={cn(menuSurface, "w-auto min-w-24 shadow-lg", popupMotion, className)}
      {...props}
    />
  );
}

const indicatorClass = "pointer-events-none absolute right-2 flex items-center justify-center";

function DropdownMenuCheckboxItem({
  className,
  children,
  inset,
  ...props
}: ComponentProps<typeof MenuPrimitive.MenuCheckboxItem> & { inset?: boolean | undefined }) {
  return (
    <MenuPrimitive.MenuCheckboxItem
      data-inset={inset}
      className={cn(itemClass, "pr-8 data-highlighted:**:text-accent-foreground", className)}
      {...props}
    >
      <MenuPrimitive.MenuItemIndicator className={indicatorClass}>
        <CheckIcon aria-hidden />
      </MenuPrimitive.MenuItemIndicator>
      {children as ReactNode}
    </MenuPrimitive.MenuCheckboxItem>
  );
}

function DropdownMenuRadioGroup(props: ComponentProps<typeof MenuPrimitive.MenuRadioGroup>) {
  return <MenuPrimitive.MenuRadioGroup {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: ComponentProps<typeof MenuPrimitive.MenuRadioItem> & { inset?: boolean | undefined }) {
  return (
    <MenuPrimitive.MenuRadioItem
      data-inset={inset}
      className={cn(itemClass, "pr-8 data-highlighted:**:text-accent-foreground", className)}
      {...props}
    >
      <MenuPrimitive.MenuItemIndicator className={indicatorClass}>
        <CheckIcon aria-hidden />
      </MenuPrimitive.MenuItemIndicator>
      {children as ReactNode}
    </MenuPrimitive.MenuRadioItem>
  );
}

function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof MenuPrimitive.MenuSeparator>) {
  return (
    <MenuPrimitive.MenuSeparator
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-data-highlighted/dropdown-menu-item:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
