"use client";

import {
  Toolbar as ToolbarPrimitive,
  ToolbarButton as ToolbarItemPrimitive,
  ToolbarInput,
} from "@ui-sdk/react/toolbar";
import { ChevronDown, Ellipsis } from "lucide-react";
import { useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { Button } from "#avenue/components/button";
import { ChipRow } from "#avenue/components/chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#avenue/components/dropdown-menu";
import { SearchInput } from "#avenue/components/search-input";
import { cn } from "#avenue/lib/utils";

/**
 * ManyAve's page toolbar (the app's app/ui/components/Toolbar.tsx and the phone's MobileToolbar in mobile.tsx, at
 * e01cc90), on ui-sdk's toolbar: one Tab stop for the whole bar, the arrows move between its chips, search field,
 * view controls and actions, the search field keeps its caret keys, and Down opens a menu.
 *
 * Every control inside joins the toolbar's focus order. Chips (ui-sdk toggles) join on their own; anything else goes
 * through `ToolbarItem`, which takes the control to draw as `render`:
 * `<ToolbarItem render={<ToolbarButton aria-label="Display options" />}>`, or for a menu,
 * `<ToolbarItem render={<DropdownMenuTrigger render={<ToolbarButton />} />}>`.
 *
 * Changes from the app (AVE-2): the bar is 56px tall (was 54): 12px above and below 32px controls. Its sides take the
 * page inset and its gaps between controls take gap-controls (8px, 16px on a phone; the app's 4 and 6px). Controls
 * share the md height and line up along their tops, so a disabled action's reason line hangs under its button and
 * the bar grows to hold it, instead of lifting the button off the row.
 */
function Toolbar({ className, ...props }: ComponentProps<typeof ToolbarPrimitive>) {
  return (
    <ToolbarPrimitive
      className={cn("flex flex-wrap items-start justify-between gap-3 px-page py-3", className)}
      {...props}
    />
  );
}

/** The left side: the page's filter chips. They wrap onto more lines on a narrow window. */
function ToolbarFilters({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="toolbar-filters" className={cn("flex flex-wrap items-center gap-controls", className)} {...props} />;
}

/** The right side: search, view controls and the page's actions. */
function ToolbarControls({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="toolbar-controls" className={cn("ms-auto flex items-start gap-controls", className)} {...props} />;
}

/** A control in the toolbar's focus order. Pass the Avenue control to draw as `render`. */
function ToolbarItem(props: ComponentProps<typeof ToolbarItemPrimitive>) {
  return <ToolbarItemPrimitive {...props} />;
}

/**
 * The toolbar's search field: Avenue's SearchInput in the toolbar's focus order. It keeps Home, End and the arrows
 * while they move its caret; at the matching end an arrow moves on.
 */
function ToolbarSearch({ className, ...props }: ComponentProps<typeof SearchInput>) {
  return <SearchInput filled className={cn("min-w-60", className)} render={<ToolbarInput />} {...props} />;
}

export type ToolbarAction = {
  /** Unique within the toolbar; it keys the button and its More item. */
  id: string;
  label: string;
  icon?: ReactNode;
  /** Why the action is unavailable. Shown under the button, and under its item in More. */
  disabledReason?: ReactNode;
  onSelect?: (() => void) | undefined;
  /**
   * What the action does, for an agent to ask a person before it runs: a send, a payment, a delete ("Sends 42 dues
   * notices"). Rendered as `data-agent-confirm` on the button and on its More item.
   */
  confirm?: string | undefined;
};

/**
 * The `wide` breakpoint from avenue.css (`--breakpoint-wide`, 1100px), the same value the `wide:` variant uses. The
 * fallback only applies before Avenue's stylesheet loads.
 */
function wideQuery() {
  const width = getComputedStyle(document.documentElement).getPropertyValue("--breakpoint-wide").trim();
  return `(min-width: ${width || "68.75rem"})`;
}
function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(wideQuery());
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
/** True from the `wide` breakpoint (1100px) up, where the page's actions fit as buttons. */
function useWide() {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(wideQuery()).matches,
    () => true,
  );
}

/**
 * A page's create and send actions at the toolbar's end. `primary` always shows as a button. From `wide` (1100px) up the
 * other `actions` are outlined buttons; below it they fold into a More menu, so the toolbar fits the 900px desktop
 * minimum. A folded action keeps its disabled reason, as a muted line under its item.
 *
 * The fold renders one or the other rather than hiding with CSS, so the toolbar's arrow keys never land on a hidden
 * button.
 */
function ToolbarActions({ actions, primary }: { actions: readonly ToolbarAction[]; primary: ToolbarAction }) {
  const wide = useWide();
  return (
    <span data-slot="toolbar-actions" className="ms-2 flex items-start gap-controls">
      {wide ? (
        actions.map((action) => (
          <ToolbarItem
            key={action.id}
            disabled={!!action.disabledReason}
            onClick={action.disabledReason ? undefined : action.onSelect}
            render={
              <Button variant="outline" disabledReason={action.disabledReason} data-agent-confirm={action.confirm} />
            }
          >
            {action.icon}
            {action.label}
          </ToolbarItem>
        ))
      ) : actions.length > 0 ? (
        <DropdownMenu>
          <ToolbarItem
            aria-label="More actions"
            render={<DropdownMenuTrigger render={<Button variant="outline" size="icon" />} />}
          >
            <Ellipsis />
          </ToolbarItem>
          <DropdownMenuContent align="end" className="w-60">
            {actions.map((action) => (
              <DropdownMenuItem
                key={action.id}
                disabled={!!action.disabledReason}
                reason={action.disabledReason}
                data-agent-confirm={action.confirm}
                {...(action.onSelect ? { onSelect: action.onSelect } : {})}
              >
                {action.icon}
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <ToolbarItem
        disabled={!!primary.disabledReason}
        onClick={primary.disabledReason ? undefined : primary.onSelect}
        render={<Button disabledReason={primary.disabledReason} data-agent-confirm={primary.confirm} />}
      >
        {primary.icon}
        {primary.label}
      </ToolbarItem>
    </span>
  );
}

/**
 * The phone toolbar (the app's MobileToolbar): search with New and More beside it, then the filter chips as one
 * scrolling strip. A view with nothing to create or nothing more passes neither, and shows no dead button.
 * `newMenu` and `moreMenu` are DropdownMenuItems.
 */
function PhoneToolbar({
  filters,
  searchProps,
  newMenu,
  moreMenu,
  className,
  ...props
}: ComponentProps<typeof ToolbarPrimitive> & {
  filters?: ReactNode;
  searchProps?: ComponentProps<typeof SearchInput> | undefined;
  newMenu?: ReactNode;
  moreMenu?: ReactNode;
}) {
  return (
    <ToolbarPrimitive className={cn("grid gap-2 px-page py-2", className)} {...props}>
      <div data-slot="toolbar-controls" className="flex items-center gap-controls">
        <SearchInput filled placeholder="Search…" className="min-w-0 flex-1" render={<ToolbarInput />} {...searchProps} />
        {newMenu ? (
          <DropdownMenu>
            <ToolbarItem render={<DropdownMenuTrigger render={<Button variant="outline" />} />}>
              New <ChevronDown />
            </ToolbarItem>
            <DropdownMenuContent align="end" className="w-52">
              {newMenu}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {moreMenu ? (
          <DropdownMenu>
            <ToolbarItem
              aria-label="More"
              render={<DropdownMenuTrigger render={<Button variant="outline" size="icon" />} />}
            >
              <Ellipsis />
            </ToolbarItem>
            <DropdownMenuContent align="end" className="w-60">
              {moreMenu}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      {filters ? (
        <ChipRow overflow="scroll" className="-mx-page px-page">
          {filters}
        </ChipRow>
      ) : null}
    </ToolbarPrimitive>
  );
}

export { PhoneToolbar, Toolbar, ToolbarActions, ToolbarControls, ToolbarFilters, ToolbarItem, ToolbarSearch };
