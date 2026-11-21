"use client";

import { createParts, usePart, usePrimitive, type PartProps } from "@ui-sdk/react/primitive";
import { Ellipsis } from "lucide-react";
import { createContext, use, useCallback, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  createConfirm,
} from "#avenue/components/alert-dialog";
import { Button } from "#avenue/components/button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "#avenue/components/menu";
import { useToast, type UndoToastOptions } from "#avenue/components/toast";
import { sourceOf, type ChangeSource } from "#avenue/lib/change";
import { defined, type Loose } from "#avenue/lib/props";
import { swipeList, type SwipeSide } from "#avenue/lib/swipe-list";
import { cn } from "#avenue/lib/utils";

// ui-sdk 0.1 beta types definePrimitive's `options` as `Record | undefined`, which createParts' `Primitive` refuses
// under exactOptionalPropertyTypes; this list always has options, so narrow it. Remove when ui-sdk fixes the type.
const typed = swipeList as typeof swipeList & { options: NonNullable<typeof swipeList.options> };
const parts = createParts(typed, { row: "li", content: "div", actions: "div" });

/** What an action that asks first says, in Avenue's AlertDialog. */
export type SwipeRowConfirm = {
  /** The question: "Delete this notice?" */
  title: string;
  /** What happens, in a sentence: "It's gone for everyone, and can't be restored." */
  description?: string | undefined;
  /** The answer that does it, in words the action's own label doesn't use: "Delete forever" for "Delete". */
  action: string;
  /** What an agent must ask the person before pressing it (`data-agent-confirm`): "Deletes the notice for everyone". */
  agent: string;
};

type SwipeRowItemBase = {
  /** Keys the action in the row. */
  value: string;
  /** Its words, on the revealed button and in the row's menu: "Archive". */
  label: string;
  /** An icon beside the label, drawn `aria-hidden`. */
  icon?: ReactNode | undefined;
  /** Which side of the row it waits behind: `end` (revealed by a swipe toward the start, the default) or `start`. */
  side?: SwipeSide | undefined;
  /**
   * Does it, from the revealed button, the menu or a full swipe. A Promise keeps the Undo toast (or the menu item)
   * waiting until it settles; what it changes after an await goes in `withSource(source, …)`.
   */
  onAction: (details: { source: ChangeSource }) => unknown;
};

/**
 * One action behind a row. Each is one of three kinds, and the type allows no other:
 *
 * - `undo`: reversible (archive, mark read). Done at once, then the Undo toast (AVE-198). Only this kind can be a
 *   side's full-swipe action, and only as the side's first.
 * - `confirm`: delete, send, anything with no way back. Asks first in an AlertDialog whose answer carries
 *   `data-agent-confirm`. Never runs on a full swipe: first on its side, a long swipe only opens the row. `destructive` draws it in the destructive colours.
 * - neither: an action that changes nothing by itself, like Reply, which opens a composer. Never runs on a full swipe.
 */
export type SwipeRowItem = SwipeRowItemBase &
  (
    | { undo: UndoToastOptions; confirm?: undefined; destructive?: undefined }
    | { confirm: SwipeRowConfirm; destructive?: boolean | undefined; undo?: undefined }
    | { undo?: undefined; confirm?: undefined; destructive?: undefined }
  );

type ListContext = {
  run: (item: SwipeRowItem, source: ChangeSource) => Promise<void>;
  register: (row: string, items: readonly SwipeRowItem[]) => () => void;
  close: () => void;
};

const SwipeListContext = createContext<ListContext | null>(null);

function useList(part: string): ListContext {
  const list = use(SwipeListContext);
  if (!list) throw new Error(`Avenue: <${part}> must sit inside a <SwipeList>.`);
  return list;
}

const sideOf = (item: SwipeRowItem): SwipeSide => item.side ?? "end";

export type SwipeListProps = Loose<Omit<PartProps<"ul">, "children">> & {
  /** The list's name, unique on the page: "Notices". Or name it with `aria-labelledby`. */
  "aria-label"?: string | undefined;
  "aria-labelledby"?: string | undefined;
  /** The `SwipeRow`s. */
  children?: ReactNode | undefined;
};

/**
 * A list whose rows slide aside on a phone to show actions behind them, as in Mail (AVE-199). The behavior is the
 * `swipe-list` primitive (src/lib/swipe-list.ts) on ui-sdk's `createSwipeActions`: one row open at a time, a vertical
 * scroll still scrolls, a press elsewhere closes the open row, and hidden actions are inert so Tab and a screen reader
 * skip them.
 *
 * The UX Engineer's verdict on AVE-199 is built into the types and the parts:
 *
 * - Only a finger swipes. With a mouse or pen the row doesn't move. Every row has a menu button (`SwipeRowMenu`) with
 *   the same actions, on every pointer: it is the way for a keyboard, a screen reader (whose own swipes a row must not
 *   fight) and an agent, so it stays on phones too.
 * - A full swipe runs only a reversible action: the side's first item, when it is an `undo` item, then its Undo toast. An item
 *   that asks first (`confirm`: delete, send) is only ever a button behind the row, or a menu item, and opens the
 *   question; its answer carries `data-agent-confirm`.
 * - Revealed actions are Avenue Buttons, so each has the shared 44px tap area on a phone, `gap-controls` apart.
 * - Under reduced motion the row still follows the finger but doesn't slide back or open by itself: it jumps.
 *
 * Needs a `ToastProvider` above it for the Undo toast.
 */
export function SwipeList({ className, children, ...props }: SwipeListProps) {
  const toast = useToast();
  const rows = useRef(new Map<string, readonly SwipeRowItem[]>());
  const [confirm] = useState(() => createConfirm());
  const [asking, setAsking] = useState<SwipeRowConfirm | null>(null);

  const run = useCallback(
    async (item: SwipeRowItem, source: ChangeSource) => {
      if (item.confirm) {
        setAsking(item.confirm);
        if (!(await confirm())) return;
      }
      await item.onAction({ source });
      if (item.undo) toast.undo(item.undo);
    },
    [confirm, toast],
  );

  const handle = usePrimitive(typed, {
    onFullSwipe: (row, side, { event }) => {
      const first = rows.current.get(row)?.find((item) => sideOf(item) === side);
      if (!first?.undo) return false;
      void run(first, sourceOf(event));
      return true;
    },
  });

  const register = useCallback((row: string, items: readonly SwipeRowItem[]) => {
    rows.current.set(row, items);
    return () => {
      if (rows.current.get(row) === items) rows.current.delete(row);
    };
  }, []);

  // One context for the list's life, reading the latest run and instance, so rows don't render again with each list.
  const latest = useRef({ run, close: () => handle.api.close() });
  useLayoutEffect(() => {
    latest.current = { run, close: () => handle.api.close() };
  });
  const [context] = useState<ListContext>(() => ({
    run: (item, source) => latest.current.run(item, source),
    register,
    close: () => latest.current.close(),
  }));

  return (
    <SwipeListContext value={context}>
      {usePart(
        handle,
        "root",
        {},
        { ...defined(props), className: cn("flex flex-col", className), children },
        "ul",
      )}
      <AlertDialog controller={confirm.controller}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{asking?.title}</AlertDialogTitle>
            {asking?.description && <AlertDialogDescription>{asking.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
            <AlertDialogClose
              value="confirm"
              data-agent-confirm={asking?.agent}
              render={<Button variant="destructive" />}
            >
              {asking?.action}
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SwipeListContext>
  );
}

export type SwipeRowProps = Loose<Omit<PartProps<"li">, "children" | "value">> & {
  /** Keys the row in the list: the notice's or message's id. */
  value: string;
  /** What the row is, for its menu button's name: "Actions for <label>". Unique in the list. */
  label: string;
  /** The actions behind the row, and in its menu, in order. Leave it empty for a row with nothing to do. */
  items: readonly SwipeRowItem[];
  /** The row's own content, drawn above the actions. Its last column is the menu button. */
  children?: ReactNode | undefined;
  /** Classes for the moving content, such as its surface (`bg-card` in a card; `bg-background` by default). */
  contentClassName?: string | undefined;
};

/**
 * One row of a `SwipeList`: its content, the actions on each side behind it, and its menu button, built from
 * `SwipeRowContent`, `SwipeRowActions`, `SwipeRowAction` and `SwipeRowMenu`, which a row with its own layout can
 * compose itself inside `SwipeRowRoot`.
 */
export function SwipeRow({ value, label, items, children, contentClassName, ...props }: SwipeRowProps) {
  const start = items.filter((item) => sideOf(item) === "start");
  const end = items.filter((item) => sideOf(item) === "end");
  return (
    <SwipeRowRoot value={value} items={items} {...defined(props)}>
      {start.length > 0 && (
        <SwipeRowActions row={value} side="start">
          {start.map((item) => (
            <SwipeRowAction key={item.value} item={item} />
          ))}
        </SwipeRowActions>
      )}
      {end.length > 0 && (
        <SwipeRowActions row={value} side="end">
          {end.map((item) => (
            <SwipeRowAction key={item.value} item={item} />
          ))}
        </SwipeRowActions>
      )}
      <SwipeRowContent value={value} className={contentClassName}>
        <div className="min-w-0 flex-1">{children}</div>
        {items.length > 0 && <SwipeRowMenu label={label} items={items} />}
      </SwipeRowContent>
    </SwipeRowRoot>
  );
}

export type SwipeRowRootProps = Loose<Omit<PartProps<"li">, "value">> & {
  value: string;
  /** The row's actions, which a full swipe reads: a side's first item runs when it is an `undo` item. */
  items: readonly SwipeRowItem[];
};

/**
 * The row: positioned, clipped, and `touch-action: pan-y`, so a finger moving across it swipes and one moving down
 * scrolls the page. Put `SwipeRowActions` before `SwipeRowContent`, so the content covers them.
 */
export function SwipeRowRoot({ value, items, className, ...props }: SwipeRowRootProps) {
  const { register } = useList("SwipeRowRoot");
  useLayoutEffect(() => register(value, items), [register, value, items]);
  return (
    <parts.Row
      value={value}
      className={cn("relative touch-pan-y overflow-hidden bg-muted", className)}
      {...defined(props)}
    />
  );
}

export type SwipeRowContentProps = Loose<Omit<PartProps<"div">, "value">> & { value: string };

/** The row's content, which moves with the finger. Opaque, so the actions behind it only show as it moves aside. */
export function SwipeRowContent({ value, className, ...props }: SwipeRowContentProps) {
  return (
    <parts.Content
      value={value}
      className={cn(
        "relative flex translate-x-(--swipe-x) items-center gap-controls bg-background py-2 ps-4 pe-2 transition-[translate] duration-moderate ease-out select-none data-swiping:transition-none motion-reduce:transition-none",
        className,
      )}
      {...defined(props)}
    />
  );
}

export type SwipeRowActionsProps = Loose<Omit<PartProps<"div">, "id">> & {
  /** The row's `value`. */
  row: string;
  side: SwipeSide;
  id?: string | undefined;
};

/** The actions on one side, behind the content. Inert until the row opens on that side. */
export function SwipeRowActions({ row, side, id, className, ...props }: SwipeRowActionsProps) {
  const ownId = useId();
  return (
    <parts.Actions
      id={id ?? ownId}
      row={row}
      side={side}
      className={cn(
        "absolute inset-y-0 flex items-center gap-controls px-3 data-[side=end]:end-0 data-[side=start]:start-0",
        className,
      )}
      {...defined(props)}
    />
  );
}

/** One revealed action: an Avenue Button that closes the row and runs the item, asking first when it should. */
export function SwipeRowAction({ item }: { item: SwipeRowItem }) {
  const { run, close } = useList("SwipeRowAction");
  return (
    <Button
      variant={item.destructive ? "destructive" : "secondary"}
      onClick={(_event, { source }) => {
        close();
        return run(item, source);
      }}
    >
      {item.icon && (
        <span aria-hidden className="contents">
          {item.icon}
        </span>
      )}
      {item.label}
    </Button>
  );
}

/**
 * The row's menu button, with every action in order: the way for a mouse, a keyboard, a screen reader and an agent.
 * Named "Actions for <label>", so each row's menu is its own to an agent.
 */
export function SwipeRowMenu({ label, items }: { label: string; items: readonly SwipeRowItem[] }) {
  const { run } = useList("SwipeRowMenu");
  return (
    <Menu>
      <MenuTrigger aria-label={`Actions for ${label}`} render={<Button variant="ghost" size="icon-sm" />}>
        <Ellipsis aria-hidden />
      </MenuTrigger>
      <MenuContent align="end" className="w-48">
        {items.map((item) => (
          <MenuItem
            key={item.value}
            destructive={item.destructive}
            onClick={(event) => run(item, sourceOf(event))}
          >
            {item.icon && (
              <span aria-hidden className="contents">
                {item.icon}
              </span>
            )}
            {item.label}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
