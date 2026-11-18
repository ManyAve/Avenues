"use client";

import type { CheckboxCheckedChangeReason } from "@ui-sdk/react/checkbox";
import { createComboboxController } from "@ui-sdk/react/combobox";
import type { ComboboxOpenChangeReason, ComboboxValueChangeReason } from "@ui-sdk/react/combobox";
import type { InputValueChangeReason } from "@ui-sdk/react/input";
import type { PopoverOpenChangeReason } from "@ui-sdk/react/popover";
import type { SelectValueChangeReason } from "@ui-sdk/react/select";
import { ListFilterIcon, XIcon } from "lucide-react";
import { useMemo, useRef, useState, type ReactElement, type ReactNode, type RefObject } from "react";
import { Checkbox } from "#avenue/components/checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "#avenue/components/combobox";
import { Menu, MenuContent, MenuItem, MenuGroupLabel, MenuGroup, MenuTrigger } from "#avenue/components/menu";
import { Input } from "#avenue/components/input";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "#avenue/components/popover";
import { Select } from "#avenue/components/select";
import { ToolbarItem } from "#avenue/components/toolbar";
import { ToolbarButton } from "#avenue/components/toolbar-button";
import { report, type ChangeDetails } from "#avenue/lib/change";
import { filterOps, isComplete, opLabel, opNeedsValue, type FilterKind, type FilterOp, type TableFilter } from "#avenue/lib/table-filters";
import { cn } from "#avenue/lib/utils";

export type { FilterKind, FilterOp, TableFilter };

/**
 * Why the filters changed. Inside a pill, the details are ui-sdk's own: a value's checkbox or text field, a long
 * list's combobox, or the operator's select. Adding a filter from the Filter menu reports "item-press", and its × "remove-press".
 */
export type TableFiltersChangeDetails = ChangeDetails<
  | CheckboxCheckedChangeReason
  | ComboboxValueChangeReason
  | InputValueChangeReason
  | SelectValueChangeReason
  | "item-press"
  | "remove-press"
>;

/**
 * A choice field with more values than this gets a search field above them (AVE-155): 30 streets or every household
 * is too many to scan. Eight or fewer stay a plain list of checkboxes, as before.
 */
const SEARCH_AFTER = 8;

/** One column the table can filter on (Linear's attribute). A `choice` lists its `items`. */
export type FilterField = {
  key: string;
  label: string;
  kind: FilterKind;
  /** A `choice` field's values, in ui-sdk's item shape: `{ value, label }`. */
  items?: readonly { value: string; label: string }[] | undefined;
  /** @deprecated Use `items`, which takes the same `{ value, label }` entries (AVE-146). */
  options?: readonly { value: string; label: string }[] | undefined;
};

/** A choice field's values, under either name. */
const choicesOf = (field: FilterField) => field.items ?? field.options ?? [];

const emptyValue = (kind: FilterKind): string | string[] => (kind === "choice" ? [] : "");

const typedValue = (filter: TableFilter) => (Array.isArray(filter.value) ? (filter.value[0] ?? "") : filter.value);

const countOf = (filter: TableFilter) => (Array.isArray(filter.value) ? filter.value.length : 1);

function valueWords(field: FilterField, filter: TableFilter) {
  if (!opNeedsValue(filter.op)) return "";
  if (field.kind === "choice") {
    const chosen = Array.isArray(filter.value) ? filter.value : [filter.value];
    const names = chosen.map((v) => choicesOf(field).find((o) => o.value === v)?.label ?? v);
    return names.length > 2 ? `${names.length} selected` : names.join(", ");
  }
  const typed = typedValue(filter);
  return field.kind === "money" && typed ? `$${typed.replace(/^\$/, "")}` : typed;
}

/** The filter's sentence, like "Dues status is Owing, Partial": the words its pill shows and is named by. */
export function filterSummary(field: FilterField, filter: TableFilter): string {
  return [field.label, opLabel(field.kind, filter.op, countOf(filter)), valueWords(field, filter)].filter(Boolean).join(" ");
}

function ValueEditor({
  field,
  filter,
  onValueChange,
}: {
  field: FilterField;
  filter: TableFilter;
  onValueChange: (value: string | string[], details: TableFiltersChangeDetails) => void;
}) {
  if (!opNeedsValue(filter.op)) return null;
  if (field.kind === "choice") {
    const chosen = Array.isArray(filter.value) ? filter.value : [filter.value];
    return (
      <fieldset aria-label={`${field.label} values`} className="flex min-w-0 flex-col gap-0.5">
        {choicesOf(field).map((option, i) => (
          // On a touch screen each option is 44px tall, so the checkboxes' 44px taps never overlap (AVE-22).
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-control hover:bg-muted pointer-coarse:min-h-11"
          >
            <Checkbox
              data-autofocus={i === 0 ? "" : undefined}
              checked={chosen.includes(option.value)}
              onCheckedChange={(on, details) =>
                onValueChange(on === true ? [...chosen, option.value] : chosen.filter((v) => v !== option.value), details)
              }
            />
            {option.label}
          </label>
        ))}
      </fieldset>
    );
  }
  const typed = typedValue(filter);
  const invalid = typed !== "" && !isComplete(field.kind, filter);
  return (
    <Input
      data-autofocus=""
      aria-label={`${field.label} value`}
      aria-invalid={invalid || undefined}
      inputMode={field.kind === "text" ? "text" : "decimal"}
      placeholder={field.kind === "money" ? "Amount in dollars" : field.kind === "number" ? "Number" : "Text"}
      value={typed}
      onValueChange={(next, details) => onValueChange(next, details)}
    />
  );
}

/** The operator's select, at the top of a pill's editor. */
function OperatorSelect({
  field,
  filter,
  onValueChange,
}: {
  field: FilterField;
  filter: TableFilter;
  onValueChange: (next: TableFilter, details: TableFiltersChangeDetails) => void;
}) {
  return (
    <Select
      aria-label={`${field.label} operator`}
      value={filter.op}
      items={filterOps[field.kind].map((op) => ({ value: op, label: opLabel(field.kind, op) }))}
      onValueChange={(op: FilterOp, details) =>
        onValueChange({ ...filter, op, value: opNeedsValue(op) ? filter.value : emptyValue(field.kind) }, details)
      }
    />
  );
}

/** What a pill's open and close report: the popover's reasons for a short list, the combobox's for a long one. */
type PillOpenChangeDetails = ChangeDetails<PopoverOpenChangeReason | ComboboxOpenChangeReason>;

type PillProps = {
  field: FilterField;
  filter: TableFilter;
  /** The second or later pill reading the same words, numbered in its name so an agent can tell them apart. */
  repeat?: number | undefined;
  open: boolean;
  onOpenChange: (open: boolean, details: PillOpenChangeDetails) => void;
  onValueChange: (next: TableFilter, details: TableFiltersChangeDetails) => void;
  onRemove: (event: MouseEvent) => void;
};

/** A filter's pill: press it to change its operator or value; × removes it. Dashed while it has no value yet. */
function FilterPill(props: PillProps) {
  const { field, filter, repeat, onRemove } = props;
  const complete = isComplete(field.kind, filter);
  const summary = filterSummary(field, filter) + (repeat ? ` (${repeat})` : "");
  const pill = useRef<HTMLSpanElement>(null);
  const button = (
    <ToolbarButton
      data-table-filter-pill=""
      data-incomplete={complete ? undefined : ""}
      // On a touch screen the pill and its × are 44px tall, side by side, so their taps meet but never overlap; with
      // a mouse both stay 32px (AVE-22).
      className="rounded-e-none pointer-coarse:h-11 data-incomplete:border-dashed"
    />
  );
  const words = (
    <>
      {/* The spaces keep the visible words those of its name, "Dues status is Owing", not "Dues statusisOwing". */}
      <span className="font-medium text-foreground">{field.label}</span>{" "}
      <span>{opLabel(field.kind, filter.op, countOf(filter))}</span>{" "}
      <span className="font-medium text-foreground">{valueWords(field, filter)}</span>
    </>
  );
  const searchable = field.kind === "choice" && choicesOf(field).length > SEARCH_AFTER;
  return (
    <span ref={pill} data-slot="table-filter" className="inline-flex items-center">
      {searchable ? (
        <SearchablePill {...props} summary={summary} button={button} pill={pill}>
          {words}
        </SearchablePill>
      ) : (
        <Popover open={props.open} onOpenChange={props.onOpenChange}>
          <ToolbarItem aria-label={`Filter: ${summary}`} render={<PopoverTrigger render={button} />}>
            {words}
          </ToolbarItem>
          <PopoverContent
            align="start"
            initialFocus="[data-autofocus]"
            // Opened from the Filter menu, the pill was never pressed, so ui-sdk would return focus to the menu's button.
            finalFocus={() => pill.current?.querySelector<HTMLElement>("[data-table-filter-pill]") ?? null}
            className="w-64 gap-2 p-2"
          >
            <PopoverTitle className="sr-only">{field.label} filter</PopoverTitle>
            <OperatorSelect {...props} />
            <ValueEditor
              field={field}
              filter={filter}
              onValueChange={(value, details) => props.onValueChange({ ...filter, value }, details)}
            />
          </PopoverContent>
        </Popover>
      )}
      <ToolbarItem
        aria-label={`Remove filter: ${summary}`}
        onClick={(event) => onRemove(event.nativeEvent)}
        render={<ToolbarButton className="rounded-s-none border-s-0 px-2 pointer-coarse:h-11 pointer-coarse:min-w-11" />}
      >
        <XIcon aria-hidden />
      </ToolbarItem>
    </span>
  );
}

/**
 * The pill of a choice field with a long list (AVE-155): its editor is Avenue's Combobox with `multiple` (AVE-156),
 * the search field inside the popup under the operator (ui-sdk's "Input in the Popup"), so typing narrows the values,
 * the arrows move through them, Enter toggles one, and an agent sets them with `setValue`. Each value reads as the
 * short list's checkbox row, but it is a combobox option (`aria-selected`), not a checkbox: one control holds the
 * whole choice. The search keeps its text after a pick, so several matches of "oak" go in a row.
 *
 * It stays a popover on a phone, like every other pill's editor, rather than ui-sdk's sheet: the operator's select
 * sits above the search, and a sheet would move the search into its header, above the operator.
 */
function SearchablePill({
  field,
  filter,
  open,
  onOpenChange,
  onValueChange,
  summary,
  button,
  pill,
  children,
}: PillProps & {
  summary: string;
  button: ReactElement<Record<string, unknown>>;
  pill: RefObject<HTMLSpanElement | null>;
  children: ReactNode;
}) {
  const choices = choicesOf(field);
  const chosen = Array.isArray(filter.value) ? filter.value : filter.value ? [filter.value] : [];
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const controller = useMemo(() => createComboboxController<string, boolean>(), []);
  const trigger = () => pill.current?.querySelector<HTMLElement>("[data-table-filter-pill]") ?? null;
  return (
    <Combobox
      multiple
      presentation="popover"
      open={open}
      onOpenChange={onOpenChange}
      // Opened from the Filter menu, the pill was never pressed, so focus goes back to it by hand, as ui-sdk's
      // "Input in the Popup" does.
      onOpenChangeComplete={(next) => {
        // Open, focus goes to the search, as the short list's goes to its first value.
        if (next) return search.current?.focus();
        controller.setQuery("");
        // After ui-sdk's own return of focus, which goes to where focus was when the list opened (the Filter button,
        // when the pill opened from its menu).
        requestAnimationFrame(() => trigger()?.focus());
      }}
      // The search is ui-sdk's own (controlling it made the highlight lag a key behind); Avenue only reads it, for
      // the empty message, and empties it through the controller once the editor has closed.
      controller={controller}
      onQueryChange={(next) => setQuery(next)}
      value={chosen}
      onValueChange={(next, details) => onValueChange({ ...filter, value: next }, details)}
      itemToLabel={(v: string) => choices.find((o) => o.value === v)?.label ?? v}
    >
      {/* The list lines up with the pill, as ui-sdk's "Input in the Popup" anchors it to its button. */}
      <ToolbarItem aria-label={`Filter: ${summary}`} render={<ComboboxTrigger render={button} />}>
        {children}
      </ToolbarItem>
      <ComboboxContent
        // The editor's frame, as every pill's popover draws it: 256px wide with 8px inside, the operator above the
        // search. Its own list scrolls, so the frame doesn't cap its height (it scrolls only if the screen is shorter
        // than the editor, as before), and it keeps its padding when nothing matches.
        className="flex max-h-none w-64 min-w-0 flex-col gap-2 overflow-auto overscroll-auto p-2 text-sm not-sheet:has-data-empty:p-2"
      >
        <OperatorSelect field={field} filter={filter} onValueChange={onValueChange} />
        {opNeedsValue(filter.op) && (
          <>
            <ComboboxInput ref={search} aria-label={`${field.label} values`} placeholder="Search…" />
            <ComboboxEmpty className="px-2 py-1">{query.trim() ? `Nothing matches “${query.trim()}”.` : null}</ComboboxEmpty>
            {/* On a touch screen the list shows six whole 44px rows and snaps to a row's top, so no row sits half under
                its edge, where a tap on the half you can see would land beside it (AVE-22). */}
            <ComboboxList className="flex max-h-64 min-w-0 flex-col gap-0.5 overflow-y-auto overscroll-contain pointer-coarse:max-h-66 pointer-coarse:snap-y pointer-coarse:snap-mandatory pointer-coarse:scroll-py-0 pointer-coarse:gap-0">
              {choices.map((option) => (
                <ComboboxItem
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  // The short list's checkbox row, with the highlight as its hover: on a touch screen 44px tall (AVE-22).
                  className="flex grid-cols-none cursor-pointer snap-start gap-2 rounded-md select-auto data-highlighted:bg-muted data-highlighted:text-inherit"
                >
                  {option.label}
                </ComboboxItem>
              ))}
            </ComboboxList>
          </>
        )}
      </ComboboxContent>
    </Combobox>
  );
}

/**
 * Linear-style filters for a table (AVE-123, from Management's app/ui/components/table-filter.tsx, MANA-1168): a
 * Filter button lists the table's attributes, and each filter shows as a pill (attribute, operator, value) that
 * opens to change it, with × to remove it. Filters are ANDed; the owner keeps them and applies them with
 * `applyFilters` from `@manyave/avenue/table-filters`. Put it in a Toolbar's ToolbarFilters, or a PhoneToolbar's
 * `filters`, so every pill joins the toolbar's arrow keys.
 *
 * Changes from the app: the attribute list is a ui-sdk menu, not a popover of buttons, so its arrows, type-ahead and
 * agent `select` come with it, and choosing an attribute opens the new pill with focus in its value. On a touch
 * screen the pills and their × grow to 44px tall. A choice field with more than eight values gets a search field above
 * them, as Linear's filter has (AVE-155): its pill is then a ui-sdk Combobox with `multiple`, so a board can find one
 * of thirty streets by typing.
 *
 * State follows ui-sdk's names (AVE-145): `value` / `defaultValue` / `onValueChange`, whose second argument is the
 * change's details (`TableFiltersChangeDetails`): its reason, event and source, and `cancel()`, which keeps the old
 * filters when TableFilters holds them itself. `filters` and `onChange` are the old names, deprecated.
 */
export function TableFilters({
  fields,
  value,
  defaultValue,
  onValueChange,
  filters: filtersProp,
  onChange,
  className,
}: {
  fields: readonly FilterField[];
  /** The filters, to control them. Leave it out and use `defaultValue` to let TableFilters hold them. */
  value?: readonly TableFilter[] | undefined;
  defaultValue?: readonly TableFilter[] | undefined;
  onValueChange?: ((value: TableFilter[], details: TableFiltersChangeDetails) => void) | undefined;
  /** @deprecated Use `value` (AVE-145). */
  filters?: readonly TableFilter[] | undefined;
  /** @deprecated Use `onValueChange` (AVE-145). */
  onChange?: ((value: TableFilter[], details: TableFiltersChangeDetails) => void) | undefined;
  className?: string | undefined;
}) {
  const [ownFilters, setOwnFilters] = useState<readonly TableFilter[]>(defaultValue ?? []);
  const filters = value ?? filtersProp ?? ownFilters;
  const [editing, setEditing] = useState<string>();
  const own = useRef<HTMLSpanElement>(null);
  const added = useRef<string>(undefined);
  // The app hears every change first, as ui-sdk's callbacks do; one it cancels leaves TableFilters' own state alone.
  const change = (next: TableFilter[], details: TableFiltersChangeDetails) => {
    onValueChange?.(next, details);
    onChange?.(next, details);
    if (details.canceled) return false;
    setOwnFilters(next);
    return true;
  };
  const add = (field: FilterField, event: Event) => {
    let n = filters.length + 1;
    while (filters.some((f) => f.id === `filter-${n}`)) n++;
    const id = `filter-${n}`;
    const op = filterOps[field.kind][0] ?? "is";
    const next = [...filters, { id, field: field.key, op, value: emptyValue(field.kind) }];
    // An agent's select arrives as a plain Event, which "item-press" doesn't name, so it goes without one.
    const pressed = event instanceof MouseEvent || event instanceof KeyboardEvent;
    if (report(change, next, pressed ? { reason: "item-press", event } : { reason: "item-press" })) added.current = id;
  };
  // The new pill opens once the menu has closed and handed focus back, so focus then moves into the pill's editor
  // and isn't pulled back to the Filter button.
  const opened = (open: boolean) => {
    const id = added.current;
    if (open || !id) return;
    added.current = undefined;
    requestAnimationFrame(() => setEditing(id));
  };
  return (
    <span ref={own} data-slot="table-filters" className={cn("contents", className)}>
      <Menu onOpenChangeComplete={opened}>
        <ToolbarItem
          aria-label={filters.length ? "Add filter" : "Filter"}
          render={<MenuTrigger render={<ToolbarButton data-table-filter-add="" className="pointer-coarse:h-11 pointer-coarse:min-w-11" />} />}
        >
          <ListFilterIcon aria-hidden />
          {filters.length ? null : "Filter"}
        </ToolbarItem>
        <MenuContent align="start" className="w-56">
          <MenuGroup>
            <MenuGroupLabel>Filter by</MenuGroupLabel>
            {fields.map((field) => (
              <MenuItem key={field.key} onSelect={(event) => add(field, event)}>
                {field.label}
              </MenuItem>
            ))}
          </MenuGroup>
        </MenuContent>
      </Menu>
      {filters.map((filter, i) => {
        const field = fields.find((f) => f.key === filter.field);
        if (!field) return null;
        const words = filterSummary(field, filter);
        const before = filters.slice(0, i).filter((f) => {
          const other = fields.find((x) => x.key === f.field);
          return other !== undefined && filterSummary(other, f) === words;
        }).length;
        return (
          <FilterPill
            key={filter.id}
            field={field}
            filter={filter}
            repeat={before > 0 ? before + 1 : undefined}
            open={editing === filter.id}
            onOpenChange={(open) => setEditing(open ? filter.id : undefined)}
            onValueChange={(updated, details) => change(filters.map((f) => (f.id === filter.id ? updated : f)), details)}
            onRemove={(event) => {
              if (!report(change, filters.filter((f) => f.id !== filter.id), { reason: "remove-press", event })) return;
              // The × goes with its pill, so focus moves to the Filter button rather than falling to the page.
              own.current?.querySelector<HTMLElement>("[data-table-filter-add]")?.focus();
            }}
          />
        );
      })}
    </span>
  );
}
