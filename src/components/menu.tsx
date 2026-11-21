import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import * as MenuPrimitive from "@ui-sdk/react/menu";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type ComponentProps,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { floatingEdge, popupMaxWidth, popupMotion } from "#avenue/lib/popup";
import { cn } from "#avenue/lib/utils";
import { defined, type Loose, type NodeChildren, type OwnPartProps } from "#avenue/lib/props";

/**
 * Ported from the app's app/ui/components/ui/dropdown-menu.tsx (e01cc90). The menu keeps the lg corner (10px) and
 * its 4px inset; items take the sm corner (6px, concentric with the menu: 10 - 4), and item padding and icon gaps
 * move from 6px to 8px (AVE-2). Keyboard (ui-sdk's menu): Enter, Space or ArrowDown opens on the first item; arrows
 * move, typing jumps to the item that starts with the typed letters, Enter or Space chooses, Esc closes and returns
 * focus to the trigger. A click opens it with focus inside, and no item looks chosen until the pointer or a key
 * highlights one. Parts carry ui-sdk's own data-slot names (menu-content, menu-item, ...), which its behavior reads.
 */
type Areas = { ids: readonly string[]; setIds: Dispatch<SetStateAction<readonly string[]>> };

/**
 * The ids of the areas that open this menu as a context menu (AVE-153), so `MenuContent` can take its width from its
 * items and, from a menu's only area, its name: ui-sdk 0.1 names an open context menu after nothing, and anchors it at
 * a point, so `--anchor-width` is 0 there. A menu shared by several areas can't say which one names it, so it takes
 * no name from them.
 */
const ContextAreas = createContext<Areas | null>(null);

function Menu(props: Loose<ComponentProps<typeof MenuPrimitive.Menu>>) {
  const [ids, setIds] = useState<readonly string[]>([]);
  const areas = useMemo(() => ({ ids, setIds }), [ids]);
  return (
    <ContextAreas.Provider value={areas}>
      <MenuPrimitive.Menu {...defined(props)} />
    </ContextAreas.Provider>
  );
}

function MenuTrigger(props: Loose<ComponentProps<typeof MenuPrimitive.MenuTrigger>>) {
  return <MenuPrimitive.MenuTrigger {...defined(props)} />;
}

/**
 * An area that opens the menu at the pointer: right-click, a long press on touch, or Shift+F10 and the context-menu key
 * from the keyboard (ui-sdk's MenuContextTrigger, AVE-153). Give the area a tab stop (`tabIndex={0}`, or render it as
 * something focusable) so a keyboard can reach it, and a name that says what it is, like the row's own text. One Menu
 * can serve many areas, like every row of a table: each passes its row as `payload`, which `MenuContent` reads from
 * its state; but give each row its own Menu where an agent should find it, since the open menu takes its name from
 * the one area it has. Keep `MenuContent` beside the area, not inside it (a right-click inside the open menu would
 * move it); for a table row, pass it `container={document.body}`. A context menu is always a popover, never a sheet,
 * on phones too (ui-sdk). `disabled` leaves the browser's own menu there. While its menu is open the area keeps the
 * muted fill, so it's clear which row it acts on.
 */
function MenuContextTrigger({ className, id, ...props }: Loose<ComponentProps<typeof MenuPrimitive.MenuContextTrigger>>) {
  const ownId = useId();
  const areaId = id ?? ownId;
  const setIds = useContext(ContextAreas)?.setIds;
  useLayoutEffect(() => {
    setIds?.((ids) => [...ids, areaId]);
    return () => setIds?.((ids) => ids.filter((other) => other !== areaId));
  }, [setIds, areaId]);
  return (
    <MenuPrimitive.MenuContextTrigger
      id={areaId}
      className={cn(
        "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring data-open:bg-muted",
        className,
      )}
      {...defined(props)}
    />
  );
}

const menuSurface = `max-h-(--available-height) min-w-32 overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-popover outline-none ${floatingEdge}`;

function MenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: Loose<ComponentProps<typeof MenuPrimitive.MenuContent>>) {
  // Opened from a context area: named by the area, as a trigger names its menu, and as wide as its items, since it
  // opens at a point (AVE-153). A dropdown keeps its trigger's width.
  const areas = useContext(ContextAreas)?.ids ?? [];
  const contextual = areas.length > 0;
  const named = props["aria-label"] !== undefined || props["aria-labelledby"] !== undefined;
  return (
    <MenuPrimitive.MenuContent
      {...(areas.length === 1 && !named ? { "aria-labelledby": areas[0] } : {})}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      className={cn(menuSurface, contextual ? "w-max" : "w-(--anchor-width)", popupMaxWidth, popupMotion, className)}
      {...defined(props)}
    />
  );
}

function MenuGroup(props: Loose<ComponentProps<typeof MenuPrimitive.MenuGroup>>) {
  return <MenuPrimitive.MenuGroup {...defined(props)} />;
}

function MenuGroupLabel({
  className,
  inset,
  ...props
}: Loose<ComponentProps<typeof MenuPrimitive.MenuGroupLabel>> & { inset?: boolean | undefined }) {
  return (
    <MenuPrimitive.MenuGroupLabel
      data-inset={inset}
      className={cn("px-2 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7", className)}
      {...defined(props)}
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
 * A menu action. `destructive` for delete and similar: ui-sdk's prop, which sets `data-destructive` (AVE-151). A
 * disabled item can carry `disabledReason`, as Button, Composer and FileField do: one muted line under the label,
 * read with the item by screen readers, so nobody has to guess why it's unavailable.
 *
 * The action goes on `onSelect`, which ui-sdk runs for a pointer click, Enter, Space and an agent alike. `onClick` is
 * the same action under the name shadcn and Base UI items use (AVE-111): ui-sdk's own `onClick` fires for a pointer
 * click only, so an item wired to it did nothing from the keyboard. Here it is routed through `onSelect`, gets the
 * DOM event that selected the item (a `MouseEvent`, a `KeyboardEvent`, or a plain `select` Event), and runs once.
 */
function MenuItem({
  className,
  inset,
  destructive,
  disabledReason,
  children,
  onSelect,
  onClick,
  ...props
}: NodeChildren<Omit<Loose<ComponentProps<typeof MenuPrimitive.MenuItem>>, "onClick">> & {
  inset?: boolean | undefined;
  /** Styles the item as dangerous, like Delete. ui-sdk's prop; sets `data-destructive`. */
  destructive?: boolean | undefined;
  /** Why a disabled item is unavailable: one muted line under the label, read with the item. */
  disabledReason?: ReactNode | undefined;
  /** The item's action, by pointer, keyboard or agent: the same as `onSelect`, which runs first when both are set. */
  onClick?: SelectHandler | undefined;
}) {
  const reasonId = useId();
  const select = runSelect(onSelect, onClick);
  return (
    <MenuPrimitive.MenuItem
      {...(select ? { onSelect: select } : {})}
      data-inset={inset}
      destructive={destructive ?? false}
      aria-describedby={disabledReason ? reasonId : undefined}
      className={cn(
        "group/dropdown-menu-item",
        itemClass,
        "not-data-destructive:data-highlighted:**:text-accent-foreground data-destructive:text-destructive-subtle-foreground data-destructive:data-highlighted:bg-destructive/10 data-destructive:data-highlighted:text-destructive-subtle-foreground dark:data-destructive:data-highlighted:bg-destructive/20 data-destructive:*:[svg]:text-destructive-subtle-foreground",
        disabledReason && "flex-wrap data-disabled:opacity-100 data-disabled:*:not-data-[slot=dropdown-menu-item-reason]:opacity-50",
        className,
      )}
      {...defined(props)}
    >
      {children}
      {disabledReason && (
        <span
          id={reasonId}
          data-slot="dropdown-menu-item-reason"
          className="basis-full text-meta text-muted-foreground"
        >
          {disabledReason}
        </span>
      )}
    </MenuPrimitive.MenuItem>
  );
}

function MenuSub(props: Loose<ComponentProps<typeof MenuPrimitive.MenuSub>>) {
  return <MenuPrimitive.MenuSub {...defined(props)} />;
}

function MenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: NodeChildren<Loose<ComponentProps<typeof MenuPrimitive.MenuSubTrigger>>> & { inset?: boolean | undefined }) {
  return (
    <MenuPrimitive.MenuSubTrigger
      data-inset={inset}
      className={cn(itemClass, "data-open:bg-accent data-open:text-accent-foreground", className)}
      {...defined(props)}
    >
      {children}
      <ChevronRightIcon aria-hidden className="ml-auto" />
    </MenuPrimitive.MenuSubTrigger>
  );
}

function MenuSubContent({
  align = "start",
  alignOffset = -4,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: NodeChildren<Loose<ComponentProps<typeof MenuPrimitive.MenuSubContent>>>) {
  return (
    <MenuPrimitive.MenuSubContent
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      className={cn(menuSurface, "w-auto min-w-24", popupMaxWidth, popupMotion, className)}
      {...defined(props)}
    />
  );
}

const indicatorClass = "pointer-events-none absolute right-2 flex items-center justify-center";

function MenuCheckboxItem({
  className,
  children,
  inset,
  ...props
}: NodeChildren<Loose<ComponentProps<typeof MenuPrimitive.MenuCheckboxItem>>> & { inset?: boolean | undefined }) {
  return (
    <MenuPrimitive.MenuCheckboxItem
      data-inset={inset}
      className={cn(itemClass, "pr-8 data-highlighted:**:text-accent-foreground", className)}
      {...defined(props)}
    >
      <MenuPrimitive.MenuItemIndicator className={indicatorClass}>
        <CheckIcon aria-hidden />
      </MenuPrimitive.MenuItemIndicator>
      {children}
    </MenuPrimitive.MenuCheckboxItem>
  );
}

function MenuRadioGroup(props: Loose<ComponentProps<typeof MenuPrimitive.MenuRadioGroup>>) {
  return <MenuPrimitive.MenuRadioGroup {...defined(props)} />;
}

function MenuRadioItem({
  className,
  children,
  inset,
  ...props
}: NodeChildren<Loose<ComponentProps<typeof MenuPrimitive.MenuRadioItem>>> & { inset?: boolean | undefined }) {
  return (
    <MenuPrimitive.MenuRadioItem
      data-inset={inset}
      className={cn(itemClass, "pr-8 data-highlighted:**:text-accent-foreground", className)}
      {...defined(props)}
    >
      <MenuPrimitive.MenuItemIndicator className={indicatorClass}>
        <CheckIcon aria-hidden />
      </MenuPrimitive.MenuItemIndicator>
      {children}
    </MenuPrimitive.MenuRadioItem>
  );
}

function MenuSeparator({ className, ...props }: Loose<ComponentProps<typeof MenuPrimitive.MenuSeparator>>) {
  return (
    <MenuPrimitive.MenuSeparator
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...defined(props)}
    />
  );
}

function MenuShortcut({ className, render, ...props }: OwnPartProps<"span">) {
  return renderElement(
    "span",
    mergeProps(
      {
        className: cn(
          "ml-auto text-xs tracking-widest text-muted-foreground group-data-highlighted/dropdown-menu-item:text-accent-foreground",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

export {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuContextTrigger,
  MenuGroup,
  MenuItem,
  MenuGroupLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
};

;
