import { byCell, createGridFocus, definePrimitive, selects, type GridCell } from "@ui-sdk/core";
import { addDays, daysBetween } from "@ui-sdk/core/date";

/**
 * The month grid's behavior (AVE-121): the board's month view, weeks of seven days in one scroll, with a day's items
 * in a popover. ui-sdk's Calendar is a date picker that pages a month at a time, so it can't hold an endless run of
 * weeks or a popover per day; this is ui-sdk's grid focus, like the Register's.
 *
 * - One Tab stop for the whole month. The arrows move by day and week, Home and End to the week's ends, Control+Home
 *   and Control+End (Command on a Mac) to the first and last day shown, Page Up and Down by four weeks.
 * - Left and Right run on across weeks, as a date picker's do: Right on Saturday is the next Sunday.
 * - Past the first or last week, `onExtend` asks the app for more weeks, and focus lands on the day it was going to
 *   once that week renders. Weeks added above keep the focused day: the stop follows its date, not its row.
 * - A day that holds one control (the popover trigger over its items) passes focus to it, so the arrows reach the
 *   trigger and Enter opens it, while only the active day is in the tab order. Keys inside the open popover are its own.
 */

export type MonthGridOptions = {
  /** The first week's first day, as an ISO date. */
  start: string;
  weeks: number;
  onExtend?: ((direction: "earlier" | "later") => void) | undefined;
};

type State = { active: GridCell | null };

const gridKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "mod+Home", "mod+End", "PageUp", "PageDown"];

/** The one control a day passes focus to. */
const controlSelector = "a[href], button, [role=button]";
const controls = new WeakMap<HTMLElement, HTMLElement>();

type CellProps = { id?: string | undefined; row: number; col: number; control?: boolean | undefined };

export const monthGrid = definePrimitive({
  name: "month-grid",
  options: { start: "string", weeks: "number", onExtend: "callback" },
  state: (_options: MonthGridOptions): State => ({ active: null }),
  api: (context) => {
    const grid = createGridFocus(context, {
      key: "active",
      rows: () => context.options().weeks,
      cols: () => 7,
      pageSize: () => 4,
    });
    const dateOf = (cell: GridCell) => addDays(context.options().start, cell.row * 7 + cell.col);
    const cellOf = (date: string): GridCell | null => {
      const { start, weeks } = context.options();
      const days = daysBetween(start, date);
      if (days < 0 || days >= weeks * 7) return null;
      return { row: Math.floor(days / 7), col: days % 7 };
    };
    // The date focus is on its way to while the app adds the week that holds it.
    let pending: string | null = null;
    let start = context.options().start;
    context.onOptions((options) => {
      const active = context.store.get().active;
      if (active && options.start !== start) {
        const kept = cellOf(addDays(start, active.row * 7 + active.col));
        context.store.set({ active: kept });
      }
      start = options.start;
      if (pending && cellOf(pending)) {
        const date = pending;
        pending = null;
        // Options change while the app renders; the added week's days bind after it commits, so wait a frame.
        requestAnimationFrame(() => {
          const target = cellOf(date);
          if (target) grid.focus(target, { reason: "list-navigation" });
        });
      }
    });
    /** Moves focus `days` from the active day, asking for more weeks when that day isn't shown. */
    const moveBy = (active: GridCell, days: number, event: KeyboardEvent) => {
      const date = addDays(dateOf(active), days);
      const target = cellOf(date);
      event.preventDefault();
      if (target) {
        grid.focus(target, { reason: "list-navigation", event });
        return;
      }
      pending = date;
      context.options().onExtend?.(days < 0 ? "earlier" : "later");
    };
    return {
      grid,
      follow(cell: GridCell) {
        const active = context.store.get().active;
        if (active?.row !== cell.row || active.col !== cell.col) context.store.set({ active: { row: cell.row, col: cell.col } });
      },
      keydown(event: KeyboardEvent, el: HTMLElement) {
        if (event.defaultPrevented) return;
        const control = controls.get(el);
        if (event.target !== el && event.target !== control) return;
        if (control?.getAttribute("aria-expanded") === "true" && event.target === control) return;
        const active = context.store.get().active;
        if (!active || event.altKey || event.shiftKey) {
          grid.keydown(event);
          return;
        }
        const rtl = getComputedStyle(el).direction === "rtl";
        const { weeks } = context.options();
        const forward = rtl ? "ArrowLeft" : "ArrowRight";
        const back = rtl ? "ArrowRight" : "ArrowLeft";
        if (event.key === forward && active.col === 6) return moveBy(active, 1, event);
        if (event.key === back && active.col === 0) return moveBy(active, -1, event);
        if (event.key === "ArrowDown" && active.row === weeks - 1) return moveBy(active, 7, event);
        if (event.key === "ArrowUp" && active.row === 0) return moveBy(active, -7, event);
        grid.keydown(event);
      },
    };
  },
  slots: (slot) => ({
    root: slot({
      role: "grid",
      keys: { none: "Focus stays on a day or its control, whose keydown handles them." },
    }),
    row: slot<{ id?: string | undefined }>({
      role: "row",
      props: { id: "id" },
    }),
    columnheader: slot<{ id?: string | undefined }>({
      role: "columnheader",
      props: { id: "id" },
      focus: { none: "Weekday headers name the columns; only the days take focus." },
    }),
    cell: slot<CellProps>({
      role: "gridcell",
      props: { id: "id", row: "number", col: "number", control: "boolean" },
      focus: (_state, { props }) => (props.control ? { none: "The one control inside it takes focus." } : "roving"),
      keys: gridKeys,
      selects: selects({ active: byCell }),
      attrs: (state, { props, api }) => ({
        // A week the app just added can render before the grid reads the new count; it still takes focus.
        tabindex: props.control ? undefined : (api.grid.tabIndex(state, props) ?? "-1"),
        "data-active": api.grid.isActive(state, props) ? "" : undefined,
      }),
      on: {
        keydown: (event, { api, el }) => el && api.keydown(event as KeyboardEvent, el),
        focusin: (event, { api, props, el }) => {
          if (el && (event.target === el || event.target === controls.get(el))) api.follow(props);
        },
      },
      bind: (el, part) => {
        const cell = { row: part.props.row, col: part.props.col };
        const control = part.props.control ? el.querySelector<HTMLElement>(controlSelector) : null;
        if (!control) return part.api.grid.bind(el, cell);
        controls.set(el, control);
        const sync = () => {
          const want = part.api.grid.tabIndex(part.store.get(), cell);
          if (control.getAttribute("tabindex") !== want) control.setAttribute("tabindex", want);
        };
        sync();
        const unsubscribe = part.store.subscribe(sync);
        // A trigger that writes its own tabindex when it renders is put back in line.
        const watch = new MutationObserver(sync);
        watch.observe(control, { attributes: true, attributeFilter: ["tabindex"] });
        const unbind = part.api.grid.bind(control, cell);
        return () => {
          unsubscribe();
          watch.disconnect();
          unbind();
          controls.delete(el);
        };
      },
    }),
  }),
  // The grid has nothing for an agent to do: the arrows only move focus. A day's items open from its Popover trigger,
  // which has its own `setOpen`; the Month grid / Agent story is the agent test.
  agent: { actions: [] },
});
