"use client";

import type { CheckboxCheckedChangeReason } from "@ui-sdk/react/checkbox";
import type { InputValueChangeReason } from "@ui-sdk/react/input";
import type { PopoverOpenChangeReason } from "@ui-sdk/react/popover";
import type { SelectValueChangeReason } from "@ui-sdk/react/select";
import { ListFilterIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Checkbox } from "#avenue/components/checkbox";
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
 * Why the filters changed. Inside a pill, the details are ui-sdk's own: a value's checkbox or text field, or the
 * operator's select. Adding a filter from the Filter menu reports "item-press", and its × "remove-press".
 */
export type TableFiltersChangeDetails = ChangeDetails<
  CheckboxCheckedChangeReason | InputValueChangeReason | SelectValueChangeReason | "item-press" | "remove-press"
>;

/** One column the table can filter on (Linear's attribute). A `choice` lists its `options`. */
export type FilterField = {
  key: string;
  label: string;
  kind: FilterKind;
  options?: readonly { value: string; label: string }[] | undefined;
};

const emptyValue = (kind: FilterKind): string | string[] => (kind === "choice" ? [] : "");

const typedValue = (filter: TableFilter) => (Array.isArray(filter.value) ? (filter.value[0] ?? "") : filter.value);

const countOf = (filter: TableFilter) => (Array.isArray(filter.value) ? filter.value.length : 1);

function valueWords(field: FilterField, filter: TableFilter) {
  if (!opNeedsValue(filter.op)) return "";
  if (field.kind === "choice") {
    const chosen = Array.isArray(filter.value) ? filter.value : [filter.value];
    const names = chosen.map((v) => field.options?.find((o) => o.value === v)?.label ?? v);
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
        {field.options?.map((option, i) => (
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

/** A filter's pill: press it to change its operator or value; × removes it. Dashed while it has no value yet. */
function FilterPill({
  field,
  filter,
  open,
  onOpenChange,
  onValueChange,
  onRemove,
  repeat,
}: {
  field: FilterField;
  filter: TableFilter;
  /** The second or later pill reading the same words, numbered in its name so an agent can tell them apart. */
  repeat?: number | undefined;
  open: boolean;
  onOpenChange: (open: boolean, details: ChangeDetails<PopoverOpenChangeReason>) => void;
  onValueChange: (next: TableFilter, details: TableFiltersChangeDetails) => void;
  onRemove: (event: MouseEvent) => void;
}) {
  const complete = isComplete(field.kind, filter);
  const summary = filterSummary(field, filter) + (repeat ? ` (${repeat})` : "");
  const pill = useRef<HTMLSpanElement>(null);
  return (
    <span ref={pill} data-slot="table-filter" className="inline-flex items-center">
      <Popover open={open} onOpenChange={onOpenChange}>
        <ToolbarItem
          aria-label={`Filter: ${summary}`}
          render={
            <PopoverTrigger
              render={
                <ToolbarButton
                  data-table-filter-pill=""
                  data-incomplete={complete ? undefined : ""}
                  // On a touch screen the pill and its × are 44px tall, side by side, so their taps meet but never
                  // overlap; with a mouse both stay 32px (AVE-22).
                  className="rounded-e-none pointer-coarse:h-11 data-incomplete:border-dashed"
                />
              }
            />
          }
        >
          {/* The spaces keep the visible words those of its name, "Dues status is Owing", not "Dues statusisOwing". */}
          <span className="font-medium text-foreground">{field.label}</span>{" "}
          <span>{opLabel(field.kind, filter.op, countOf(filter))}</span>{" "}
          <span className="font-medium text-foreground">{valueWords(field, filter)}</span>
        </ToolbarItem>
        <PopoverContent
          align="start"
          initialFocus="[data-autofocus]"
          // Opened from the Filter menu, the pill was never pressed, so ui-sdk would return focus to the menu's button.
          finalFocus={() => pill.current?.querySelector<HTMLElement>("[data-table-filter-pill]") ?? null}
          className="w-64 gap-2 p-2"
        >
          <PopoverTitle className="sr-only">{field.label} filter</PopoverTitle>
          <Select
            aria-label={`${field.label} operator`}
            value={filter.op}
            options={filterOps[field.kind].map((op) => ({ value: op, label: opLabel(field.kind, op) }))}
            onValueChange={(op: FilterOp, details) =>
              onValueChange({ ...filter, op, value: opNeedsValue(op) ? filter.value : emptyValue(field.kind) }, details)
            }
          />
          <ValueEditor field={field} filter={filter} onValueChange={(value, details) => onValueChange({ ...filter, value }, details)} />
        </PopoverContent>
      </Popover>
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
 * Linear-style filters for a table (AVE-123, from Management's app/ui/components/table-filter.tsx, MANA-1168): a
 * Filter button lists the table's attributes, and each filter shows as a pill (attribute, operator, value) that
 * opens to change it, with × to remove it. Filters are ANDed; the owner keeps them and applies them with
 * `applyFilters` from `@manyave/avenue/table-filters`. Put it in a Toolbar's ToolbarFilters, or a PhoneToolbar's
 * `filters`, so every pill joins the toolbar's arrow keys.
 *
 * Changes from the app: the attribute list is a ui-sdk menu, not a popover of buttons, so its arrows, type-ahead and
 * agent `select` come with it, and choosing an attribute opens the new pill with focus in its value. On a touch
 * screen the pills and their × grow to 44px tall.
 *
 * State follows ui-sdk's names (AVE-145): `value` / `defaultValue` / `onValueChange`, whose second argument is the
 * change's details (`TableFiltersChangeDetails`): its reason, event and source, and `cancel()`, which keeps the old
 * filters when TableFilters holds them itself. `filters` and `onChange` are the old names, kept until v0.27.0.
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
  /** @deprecated Use `value`. Kept until v0.27.0 (AVE-145). */
  filters?: readonly TableFilter[] | undefined;
  /** @deprecated Use `onValueChange`. Kept until v0.27.0 (AVE-145). */
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
