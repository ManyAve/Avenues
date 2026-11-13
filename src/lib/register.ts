import { byCell, createGridFocus, definePrimitive, selects, type GridCell } from "@ui-sdk/core";

/**
 * The Register's behavior (AVE-9): a data grid built from ui-sdk's grid focus, because ui-sdk 0.1 ships no data
 * grid (AVE-16 coverage map). One Tab stop for the whole table; the arrows move between cells. A cell that holds
 * one control (a checkbox, a sort button, a link, a row action) passes focus to that control, so the arrows reach
 * it while only the active one is in the tab order. The control keeps its own element and role: links stay links.
 *
 * The rules the UX Engineer and Architect set on AVE-9:
 * - The stop follows focus from anywhere: a click, a dialog returning focus to its trigger, a popover closing.
 * - Never zero stops: when rows go away (deleted, filtered, collapsed), the stop moves to the nearest cell left,
 *   and focus that was on a removed row moves there too.
 * - A text field keeps its own keys while you type in it; a control whose popup is open keeps them too.
 *
 * Leaving and re-entering a text field (AVE-80, UX Engineer, after the WAI-ARIA APG grid's editing keys):
 * - Escape in a cell's text field moves focus to the cell itself, keeping the value. From there the arrows move on.
 * - Enter or F2 on that cell puts focus back in its field. The arrows still reach the field directly, so typing
 *   straight away keeps working.
 * - A field whose popup is open (a combobox's list) keeps Escape to close it first; the next Escape goes to the cell.
 */

export type RegisterOptions = {
  /** Rows, the header row (row 0) included. */
  rowCount: number;
  colCount: number;
  /** Rows that hold one cell spanning every column, like a street's group bar or the add row. Only their column 0 exists. */
  spanningRows?: readonly number[] | undefined;
};

type State = { active: GridCell | null };

/** Keys that belong to the element being typed in, or to an open popup, not to the grid. */
const ownKeys =
  "input:not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable=true], [role=combobox], [aria-haspopup][aria-expanded=true]";

/** Controls you type in. Escape leaves them for their cell, and Enter or F2 on the cell goes back in. */
const editable = "input:not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable=true], [role=combobox]";

/** The one control a cell passes focus to. */
const controlSelector = "a[href], button, input, select, textarea, [role=checkbox], [role=button]";

function exists(options: RegisterOptions, cell: GridCell) {
  if (cell.row < 0 || cell.col < 0 || cell.row >= options.rowCount || cell.col >= options.colCount) return false;
  return cell.col === 0 || !(options.spanningRows ?? []).includes(cell.row);
}

/** The cell nearest to `cell` that still exists: same column below, then above, then column 0 of the same rows. */
export function nearestCell(options: RegisterOptions, cell: GridCell): GridCell | null {
  for (const col of [cell.col, 0]) {
    for (let d = 0; d < options.rowCount; d++) {
      for (const row of [cell.row + d, cell.row - d]) {
        const next = { row: Math.min(row, options.rowCount - 1), col };
        if (exists(options, next)) return next;
      }
    }
  }
  return null;
}

/** The last cell that exists: the last row's last column it has. */
function lastCell(options: RegisterOptions): GridCell | null {
  for (let row = options.rowCount - 1; row >= 0; row--) {
    for (let col = options.colCount - 1; col >= 0; col--) if (exists(options, { row, col })) return { row, col };
  }
  return null;
}

/** Each bound cell's one control, so its keys count as the cell's. */
const controls = new WeakMap<HTMLElement, HTMLElement>();

const gridKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "mod+Home", "mod+End", "PageUp", "PageDown"];

/** `id` keys the part: "row:col", so each cell is its own part. */
type CellProps = { id?: string | undefined; row: number; col: number; control?: boolean | undefined };

export const register = definePrimitive({
  name: "register",
  options: { rowCount: "number", colCount: "number", spanningRows: "value" },
  state: (_options: RegisterOptions): State => ({ active: null }),
  api: (context) => {
    const grid = createGridFocus(context, {
      key: "active",
      rows: () => context.options().rowCount,
      cols: () => context.options().colCount,
      disabled: (cell) => !exists(context.options(), cell),
    });
    // Rows went away under the active cell: give the stop to the nearest cell that's left.
    context.onOptions((options) => {
      const active = context.store.get().active;
      if (active && !exists(options, active)) context.store.set({ active: nearestCell(options, active) });
    });
    return {
      grid,
      /** Focus arrived on a cell by any route: it becomes the stop, without moving focus again. */
      follow(cell: GridCell) {
        const active = context.store.get().active;
        if (active?.row !== cell.row || active.col !== cell.col) context.store.set({ active: { row: cell.row, col: cell.col } });
      },
      keydown(event: KeyboardEvent, el: HTMLElement) {
        if (event.defaultPrevented) return;
        // Only keys pressed on the cell or its one control are the grid's. Not keys from inside a popup the control
        // opened, whether it renders in the cell or elsewhere (React passes those up its own tree).
        const control = controls.get(el);
        if (event.target !== el && event.target !== control) return;
        // Escape leaves a text field for its cell, unless the field's popup is open: that Escape closes the popup.
        if (
          event.key === "Escape" &&
          control &&
          event.target === control &&
          control.matches(editable) &&
          control.getAttribute("aria-expanded") !== "true"
        ) {
          event.preventDefault();
          el.setAttribute("tabindex", "-1");
          el.focus();
          return;
        }
        // Enter or F2 on that cell goes back into its field.
        if ((event.key === "Enter" || event.key === "F2") && control && event.target === el && control.matches(editable)) {
          event.preventDefault();
          control.focus();
          return;
        }
        if (event.target instanceof Element && event.target.closest(ownKeys)) return;
        // Control+End (Command+End on a Mac) goes to the last cell that exists, like the add row's button, where the
        // grid's own corner may be a column a spanning row doesn't have.
        if ((event.ctrlKey || event.metaKey) && event.key === "End") {
          const last = lastCell(context.options());
          if (last) {
            event.preventDefault();
            grid.focus(last, { reason: "list-navigation", event });
          }
          return;
        }
        grid.keydown(event);
      },
      /** Puts focus back in the grid when the focused row was removed, so the table is never left behind. */
      recover() {
        const active = context.store.get().active;
        if (active) grid.focus(active, { reason: "imperative" });
      },
    };
  },
  slots: (slot) => {
    // A cell or column header: the cell takes focus itself, or passes it to its control.
    const cellBind = (el: HTMLElement, part: { api: { grid: { bind: (el: HTMLElement, cell: GridCell) => () => void; tabIndex: (state: State, cell: GridCell) => "0" | "-1" } }; props: CellProps; store: { get: () => State; subscribe: (listener: () => void) => () => void } }) => {
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
      // A control that writes its own tabindex when it renders, like a popover trigger, is put back in line.
      const watch = new MutationObserver(sync);
      watch.observe(control, { attributes: true, attributeFilter: ["tabindex"] });
      const unbind = part.api.grid.bind(control, cell);
      return () => {
        unsubscribe();
        watch.disconnect();
        unbind();
      };
    };
    return {
      root: slot({
        role: "grid",
        keys: { none: "Focus stays on a cell or its control, whose keydown handles them." },
        bind: (el, { api }) => {
          let last: Element | null = null;
          const track = (event: FocusEvent) => {
            last = event.target as Element;
          };
          el.addEventListener("focusin", track);
          const observer = new MutationObserver(() => {
            if (last && !last.isConnected && (document.activeElement === document.body || document.activeElement === null)) {
              last = null;
              api.recover();
            }
          });
          observer.observe(el, { childList: true, subtree: true });
          return () => {
            el.removeEventListener("focusin", track);
            observer.disconnect();
          };
        },
      }),
      row: slot<{ id?: string | undefined; row: number }>({
        role: "row",
        props: { id: "id", row: "number" },
        attrs: (_state, { props }) => ({ "aria-rowindex": String(props.row + 1) }),
      }),
      columnheader: slot<CellProps & { sort?: "ascending" | "descending" | undefined }>({
        role: "columnheader",
        props: { id: "id", row: "number", col: "number", sort: "string", control: "boolean" },
        focus: (_state, { props }) => (props.control ? { none: "Its one control, like the sort button, takes focus." } : "roving"),
        keys: gridKeys,
        selects: selects({ active: byCell }),
        attrs: (state, { props, api }) => ({
          "aria-colindex": String(props.col + 1),
          "aria-sort": props.sort ?? "none",
          tabindex: props.control ? undefined : api.grid.tabIndex(state, props),
          "data-active": api.grid.isActive(state, props) ? "" : undefined,
        }),
        on: {
          keydown: (event, { api, el }) => el && api.keydown(event as KeyboardEvent, el),
          focusin: (event, { api, props, el }) => {
            if (el && (event.target === el || event.target === controls.get(el))) api.follow(props);
          },
        },
        bind: (el, part) => cellBind(el, part),
      }),
      cell: slot<CellProps>({
        role: "gridcell",
        props: { id: "id", row: "number", col: "number", control: "boolean" },
        focus: (_state, { props }) => (props.control ? { none: "The one control inside it takes focus." } : "roving"),
        keys: gridKeys,
        selects: selects({ active: byCell }),
        attrs: (state, { props, api }) => ({
          "aria-colindex": String(props.col + 1),
          tabindex: props.control ? undefined : api.grid.tabIndex(state, props),
          "data-active": api.grid.isActive(state, props) ? "" : undefined,
        }),
        on: {
          keydown: (event, { api, el }) => el && api.keydown(event as KeyboardEvent, el),
          focusin: (event, { api, props, el }) => {
            if (el && (event.target === el || event.target === controls.get(el))) api.follow(props);
          },
        },
        bind: (el, part) => cellBind(el, part),
      }),
    };
  },
  // The grid itself has nothing for an agent to do: arrow keys only move focus. What changes data lives in its
  // parts, each a ui-sdk component with its own agent actions: a street bar and the add row are Buttons (`press`),
  // a column's sort is a Popover (`setOpen`) holding Buttons, the selection is Checkboxes (`setChecked`). The
  // Register / Agent expands and sorts story is the agent test (AVE-79).
  agent: { actions: [] },
});
