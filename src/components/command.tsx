import * as Ui from "@ui-sdk/react/command";
import { createDialogController, DialogShortcut } from "@ui-sdk/react/dialog";
import { withSource } from "@ui-sdk/react/observe";
import { LoaderCircleIcon, SearchIcon } from "lucide-react";
import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ComponentProps } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "#avenue/components/dialog";
import { sourceOf } from "#avenue/lib/change";
import { listSeparator } from "#avenue/lib/picker";
import { defined, type Loose, type NodeChildren } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * A searchable list of commands (AVE-197): ui-sdk's Command, styled from Avenue's tokens. On its own it is an inline
 * list with a search field; inside `CommandDialogContent` it is the ⌘K palette. Focus stays in the field, which points
 * at the highlighted command; arrows move, Enter runs, Escape clears the search and then goes back a page, Backspace in
 * an empty field goes back. Each app wires its own commands, through `onAction` or an item's `onSelect`.
 *
 * The palette is a shortcut, never the only way: every command must also be reachable from the visible navigation or
 * a menu (UX Engineer, AVE-197). A command that sends or moves money, or deletes, opens its own confirm dialog
 * (PendingConfirmDialog) from `onAction` rather than running there, and carries `data-agent-confirm`.
 */
type CommandDialogState = { close: (event?: Event) => void };
const CommandDialogContext = createContext<CommandDialogState | null>(null);

/**
 * Inside a `CommandDialog`, a command that runs closes the palette, once its Promise resolves if it returns one; a
 * rejection keeps it open, with the command in ui-sdk's error state. A command that opens a page doesn't close it,
 * and an item's `onSelect` that calls `event.preventDefault()` skips `onAction` and keeps it open.
 */
function Command({ className, onAction, ...props }: Loose<ComponentProps<typeof Ui.Command>>) {
  const dialog = useContext(CommandDialogContext);
  const run = (value: string, details: Ui.CommandActionDetails): unknown => {
    const result = onAction?.(value, details);
    if (!dialog) return result;
    if (result instanceof Promise) {
      const source = sourceOf(details.event);
      return result.then((settled: unknown) => {
        withSource(source, () => dialog.close(details.event));
        return settled;
      });
    }
    dialog.close(details.event);
    return result;
  };
  return (
    <Ui.Command
      onAction={run}
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground ring-1 ring-border",
        "in-data-command-dialog:rounded-none in-data-command-dialog:ring-0",
        className,
      )}
      {...defined(props)}
    />
  );
}

/**
 * The search field, with a search glass before it, on a line ruled off from the list. Name it (`aria-label`): the list
 * takes its name from the field. 16px text on phones, so iOS doesn't zoom in (the `text-field` utility).
 */
function CommandInput({ className, ...props }: Loose<ComponentProps<typeof Ui.CommandInput>>) {
  return (
    <div data-slot="command-input-wrapper" className="flex items-center gap-2 border-b px-3 text-muted-foreground">
      <SearchIcon aria-hidden className="size-4 shrink-0" />
      <Ui.CommandInput
        className={cn(
          "h-10 w-full min-w-0 bg-transparent text-field text-foreground outline-none pointer-coarse:h-11 placeholder:text-placeholder disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...defined(props)}
      />
    </div>
  );
}

/**
 * Holds the commands, and scrolls past about nine rows; the highlighted command scrolls into view. In the palette on a
 * phone it takes the screen's height instead, so a row isn't left half under the edge at 44px rows.
 */
function CommandList({ className, ...props }: Loose<ComponentProps<typeof Ui.CommandList>>) {
  return (
    <Ui.CommandList
      className={cn("max-h-80 min-h-0 scroll-py-1 overflow-x-hidden overflow-y-auto overscroll-contain p-1 outline-none empty:p-0 in-data-command-dialog:pointer-coarse:max-h-none", className)}
      {...defined(props)}
    />
  );
}

/** Shows while nothing matches the search. Keep it outside `CommandList`. */
function CommandEmpty({ className, ...props }: Loose<ComponentProps<typeof Ui.CommandEmpty>>) {
  return (
    <Ui.CommandEmpty
      className={cn("px-3 py-6 text-center text-sm text-muted-foreground not-data-empty:hidden", className)}
      {...defined(props)}
    />
  );
}

/** Says results are loading, how many there are, or that loading failed, for async results. Keep it outside the list. */
function CommandStatus({ className, ...props }: Loose<ComponentProps<typeof Ui.CommandStatus>>) {
  return (
    <Ui.CommandStatus
      className={cn("px-3 pt-2 text-meta text-muted-foreground empty:hidden", className)}
      {...defined(props)}
    />
  );
}

/** A page of commands that a command's `page` opens; leave `value` out for the first page. */
function CommandPage(props: Loose<ComponentProps<typeof Ui.CommandPage>>) {
  return <Ui.CommandPage {...defined(props)} />;
}

/** Commands that belong together, named by a `CommandGroupLabel`. A search hides a group once none of it matches. */
function CommandGroup({ className, ...props }: Loose<ComponentProps<typeof Ui.CommandGroup>>) {
  return <Ui.CommandGroup className={cn("not-first:mt-1", className)} {...defined(props)} />;
}

function CommandGroupLabel({ className, ...props }: Loose<ComponentProps<typeof Ui.CommandGroupLabel>>) {
  return (
    <Ui.CommandGroupLabel
      className={cn("px-2 py-1 text-xs font-medium text-muted-foreground", className)}
      {...defined(props)}
    />
  );
}

function CommandSeparator({ className, ...props }: Loose<ComponentProps<typeof Ui.CommandSeparator>>) {
  return <Ui.CommandSeparator className={cn(listSeparator, className)} {...defined(props)} />;
}

const pendingIcon = (
  <LoaderCircleIcon
    aria-hidden
    data-slot="command-item-spinner"
    className="ms-auto animate-spin text-muted-foreground motion-reduce:animate-none"
  />
);

/**
 * A command. The highlighted one wears `bg-accent`, the brand-tinted highlight every list uses (AVE-209). `destructive`
 * draws it in the destructive colour, as Menu's destructive item, for delete and the like; give it
 * `data-agent-confirm="<what it does>"` too, and have it open a confirm dialog rather than act. While the Promise its
 * action returned runs, it shows a spinner at the end and doesn't run again (ui-sdk's pending state).
 */
function CommandItem({
  className,
  destructive,
  children,
  ...props
}: Loose<ComponentProps<typeof Ui.CommandItem>> & {
  /** Styles the command as dangerous, like Remove household. Sets `data-destructive`. */
  destructive?: boolean | undefined;
}) {
  return (
    <Ui.CommandItem
      data-destructive={destructive ? "" : undefined}
      className={cn(
        "group/command-item relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1 text-control outline-hidden select-none pointer-coarse:min-h-11",
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 data-pending:cursor-progress",
        "data-destructive:text-destructive-subtle-foreground data-destructive:data-highlighted:bg-destructive/10 data-destructive:data-highlighted:text-destructive-subtle-foreground dark:data-destructive:data-highlighted:bg-destructive/20",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...defined(props)}
    >
      {(state) => (
        <>
          {typeof children === "function" ? children(state) : children}
          {state.pending && pendingIcon}
        </>
      )}
    </Ui.CommandItem>
  );
}

/** The command's icon, muted until the command is highlighted. `mirror` flips an arrow in right-to-left text. */
function CommandItemIcon({ className, ...props }: Loose<ComponentProps<typeof Ui.CommandItemIcon>>) {
  return (
    <Ui.CommandItemIcon
      className={cn(
        "flex shrink-0 items-center text-muted-foreground group-data-highlighted/command-item:text-accent-foreground group-data-destructive/command-item:text-destructive-subtle-foreground data-mirror:rtl:-scale-x-100",
        className,
      )}
      {...defined(props)}
    />
  );
}

/** The command's label, with the letters the search matched in a heavier weight. */
function CommandItemText({ className, ...props }: Loose<ComponentProps<typeof Ui.CommandItemText>>) {
  return (
    <Ui.CommandItemText
      className={cn("min-w-0 truncate [&_mark]:bg-transparent [&_mark]:font-emphasis [&_mark]:text-current", className)}
      {...defined(props)}
    />
  );
}

/**
 * The command's shortcut, written the way the computer writes it (⌘P on a Mac, Ctrl+P elsewhere; ui-sdk formats it),
 * at the end of the row. Hidden from screen readers, which hear the item's `aria-keyshortcuts`.
 */
function CommandShortcut({ className, ...props }: Loose<ComponentProps<typeof Ui.CommandShortcut>>) {
  return (
    <Ui.CommandShortcut
      className={cn(
        "ms-auto text-xs tracking-widest text-muted-foreground group-data-highlighted/command-item:text-accent-foreground",
        className,
      )}
      {...defined(props)}
    />
  );
}

const coarse = "(pointer: coarse)";
function subscribe(onChange: () => void) {
  const query = window.matchMedia(coarse);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
function useCoarsePointer() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(coarse).matches,
    () => false,
  );
}

/**
 * The palette: Avenue's Dialog, which a command that runs closes (see `Command`). Open, close and `onOpenChange`
 * work as Dialog's; pass `controller` (ui-sdk's `createDialogController()`) to open it from elsewhere.
 */
function CommandDialog({ controller, ...props }: Loose<ComponentProps<typeof Dialog>>) {
  const [own] = useState(() => createDialogController());
  const dialog = controller ?? own;
  const state = useMemo<CommandDialogState>(
    () => ({ close: (event) => dialog.close(event ? { reason: "action", event } : { reason: "action" }) }),
    [dialog],
  );
  return (
    <CommandDialogContext.Provider value={state}>
      <Dialog controller={dialog} {...defined(props)} />
    </CommandDialogContext.Provider>
  );
}

/**
 * What opens the palette, with ⌘K (Ctrl+K off a Mac) as its shortcut: a modifier shortcut, so WCAG 2.1.4 doesn't ask
 * for a way to turn it off. Not bound on touch-first devices, where it would only be a hidden binding (UX Engineer,
 * AVE-197). Put a `CommandDialogShortcut` in it to show the keys.
 */
function CommandDialogTrigger({ shortcut = "mod+k", ...props }: Loose<ComponentProps<typeof DialogTrigger>>) {
  const touch = useCoarsePointer();
  return <DialogTrigger {...(touch ? {} : { shortcut })} {...defined(props)} />;
}

/** The trigger's keys, like ⌘K, as a key cap. Hidden from screen readers, which hear `aria-keyshortcuts`, and on phones. */
function CommandDialogShortcut({ className, ...props }: Loose<ComponentProps<typeof DialogShortcut>>) {
  return (
    <DialogShortcut
      className={cn("ms-auto rounded-xs border px-1 text-meta text-muted-foreground pointer-coarse:hidden", className)}
      {...defined(props)}
    />
  );
}

/**
 * The palette's surface: near the top of the screen rather than centred, so it doesn't jump as results come and go,
 * edge to edge for the `Command` inside, and without a close button (Escape, an outside press or a command close it).
 * Give it a title: a `CommandDialogTitle`, which screen readers hear and sighted people don't see.
 */
function CommandDialogContent({ className, children, ...props }: NodeChildren<Loose<ComponentProps<typeof DialogContent>>>) {
  return (
    <DialogContent
      data-command-dialog=""
      showCloseButton={false}
      className={cn(
        "top-[15dvh] flex max-h-[calc(85dvh-1rem)] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-lg",
        className,
      )}
      {...defined(props)}
    >
      {children}
    </DialogContent>
  );
}

/** The palette's name, for screen readers only. */
function CommandDialogTitle({ className, ...props }: Loose<ComponentProps<typeof DialogTitle>>) {
  return <DialogTitle className={cn("sr-only", className)} {...defined(props)} />;
}

export type { CommandData, CommandDataItem } from "@ui-sdk/react/command";
export { createCommandController } from "@ui-sdk/react/command";

export {
  Command,
  CommandDialog,
  CommandDialogContent,
  CommandDialogShortcut,
  CommandDialogTitle,
  CommandDialogTrigger,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandItemIcon,
  CommandItemText,
  CommandList,
  CommandPage,
  CommandSeparator,
  CommandShortcut,
  CommandStatus,
};
