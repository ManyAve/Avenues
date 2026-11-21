"use client";

import { Toolbar as ToolbarPrimitive, ToolbarButton as ToolbarItem } from "@ui-sdk/react/toolbar";
import { X } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from "react";
import { Button } from "#avenue/components/button";
import { cn } from "#avenue/lib/utils";
import { defined, type Loose } from "#avenue/lib/props";
import { reasonRuns, runAt } from "#avenue/lib/reason-runs";

export type SelectionAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  /** The main action is filled; the others are outlined. */
  primary?: boolean | undefined;
  /** Why the action is unavailable: one muted line under the button, read with it. */
  disabledReason?: ReactNode;
  onSelect?: (() => void) | undefined;
  /**
   * What the action does, for an agent to ask a person before it runs: a send, a payment, a delete ("Deletes 3
   * households"). Rendered as `data-agent-confirm` on the button (AVE-85), as ToolbarAction's `confirm` is.
   */
  confirm?: string | undefined;
};

/**
 * ManyAve's floating selection bar (the app's app/ui/components/SelectionBar.tsx at e01cc90): while rows are
 * selected it floats over the bottom of the list with the count, the bulk actions and Clear selection. Place it in a
 * positioned container (`relative`), as the app's list is.
 *
 * The bar is a ui-sdk toolbar: one Tab stop, arrows between the actions. A disabled action stays reachable and shows
 * its reason under it (the app hid it in a title), described by it for a screen reader. The bar is a grid: the count,
 * the actions and Clear on the first line, then one line per reason. A reason starts under its button and runs on
 * under the actions after it to the bar's end, wrapping there; a second disabled action's reason takes the next line,
 * so two reasons never print over each other (AVE-162), and a short button's long reason stays one line instead of a
 * narrow column that grows the floating bar over the list. It takes no width of its own, so it never spreads the actions apart
 * (AVE-91), and it never sits under the count, where it would read as the count's caption (AVE-96). Neighbouring
 * actions that share a reason share one line, as the page toolbar's do (AVE-160). The count is announced whenever it changes, from a status
 * region that stays mounted while the bar comes and goes, so the first selection is announced too, and clearing says
 * so.
 *
 * When the selection empties, focus goes back to `returnFocus`, the list's own stop (AVE-90). The bar goes away with
 * the selection, after Clear selection or an action that empties it (Archive, a send that clears it), and focus in it
 * would otherwise fall to the page. Under the story tests' strict mode, a bar that loses focus with no `returnFocus`
 * throws, as ui-sdk's own development warnings do.
 *
 * Changes from the app (AVE-2): the corner is lg (10px, was a 9px literal), actions sit gap-controls apart and it
 * floats 48px above the bottom (was 51px).
 */
function SelectionBar({
  count,
  label = (n) => `${n} selected`,
  actions,
  onClear,
  returnFocus,
  className,
  onFocus,
  onBlur,
  ...props
}: Omit<Loose<ComponentProps<typeof ToolbarPrimitive>>, "children"> & {
  count: number;
  /** The count's words, such as "3 households selected". */
  label?: ((count: number) => string) | undefined;
  actions: readonly SelectionAction[];
  onClear?: (() => void) | undefined;
  /** Where focus goes when the selection empties while focus is in the bar: the list's own stop. */
  returnFocus?: RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined) | undefined;
}) {
  // Whether focus is in the bar, read as the bar unmounts: by then the element may already be out of the page.
  const focusInside = useRef(false);
  // Say "Selection cleared" only after something was selected, so an empty list carries no stray text.
  const [selectedOnce, setSelectedOnce] = useState(false);
  if (count > 0 && !selectedOnce) setSelectedOnce(true);
  const baseId = useId();
  // Grid columns: the count is column 1, action i is column i + 2 and Clear comes last.
  const runs = reasonRuns(actions);
  const clearIndex = actions.length;
  return (
    <>
      <output aria-live="polite" className="sr-only">
        {count > 0 ? label(count) : selectedOnce ? "Selection cleared" : ""}
      </output>
      {count > 0 ? (
        <ToolbarPrimitive
          aria-label="Selection actions"
          className={cn(
            "absolute bottom-12 start-1/2 z-10 grid -translate-x-1/2 items-start gap-x-controls gap-y-1 rounded-lg border border-border-floating bg-popover p-2 text-control whitespace-nowrap text-popover-foreground shadow-popover rtl:translate-x-1/2",
            className,
          )}
          {...defined(props)}
          onFocus={(event) => {
            focusInside.current = true;
            onFocus?.(event);
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) focusInside.current = false;
            onBlur?.(event);
          }}
        >
          <ReturnFocus focusInside={focusInside} to={returnFocus} />
          <span
            data-slot="selection-bar-count"
            className="col-start-1 row-start-1 flex h-control-sm items-center border-e px-2 font-emphasis"
          >
            {label(count)}
          </span>
          {actions.map((action, index) => {
            const run = runAt(runs, index);
            return (
              <ToolbarItem
                key={action.id}
                disabled={!!action.disabledReason}
                onClick={action.disabledReason ? undefined : action.onSelect}
                style={{ gridColumn: index + 2 }}
                className="row-start-1"
                render={
                  <Button
                    size="sm"
                    variant={action.primary ? "default" : "outline"}
                    data-agent-confirm={action.confirm}
                    {...(run
                      ? { disabled: true, focusableWhenDisabled: true, "aria-describedby": `${baseId}-${run.key}` }
                      : {})}
                  />
                }
              >
                {action.icon}
                {action.label}
              </ToolbarItem>
            );
          })}
          <ToolbarItem
            aria-label="Clear selection"
            onClick={onClear}
            style={{ gridColumn: clearIndex + 2 }}
            className="row-start-1"
            render={<Button variant="ghost" size="icon-sm" />}
          >
            <X aria-hidden />
          </ToolbarItem>
          {runs.map((run, i) => (
            <span
              key={run.key}
              id={`${baseId}-${run.key}`}
              data-slot="selection-bar-reason"
              // Its own line, from its first button through Clear. contain-inline-size: the line takes no width of its
              // own, so it never widens the bar and wraps at its end.
              className="contain-inline-size text-meta whitespace-normal text-muted-foreground"
              style={{ gridRow: i + 2, gridColumn: `${run.from + 2} / span ${clearIndex + 1 - run.from}` }}
            >
              {run.reason}
            </span>
          ))}
        </ToolbarPrimitive>
      ) : null}
    </>
  );
}

/** Renders nothing; its cleanup runs before the bar leaves the page, while focus is still known to be in it. */
function ReturnFocus({
  focusInside,
  to,
}: {
  focusInside: RefObject<boolean>;
  to: RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined) | undefined;
}) {
  const target = useRef(to);
  useLayoutEffect(() => {
    target.current = to;
  });
  useLayoutEffect(
    () => () => {
      if (!focusInside.current) return;
      focusInside.current = false;
      const where = target.current;
      const element = typeof where === "function" ? where() : where?.current;
      if (element) {
        element.focus();
      } else if (Reflect.get(globalThis, "__UI_SDK_STRICT__")) {
        queueMicrotask(() => {
          throw new Error("SelectionBar: the selection emptied while focus was in the bar, and no returnFocus says where it goes.");
        });
      }
    },
    [focusInside],
  );
  return null;
}

export { SelectionBar };
