"use client";

import { ListFilterIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Checkbox } from "#avenue/components/checkbox";
import { Menu, MenuContent, MenuItem, MenuGroupLabel, MenuGroup, MenuTrigger } from "#avenue/components/menu";
import { Input } from "#avenue/components/input";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "#avenue/components/popover";
import { Select } from "#avenue/components/select";
import { ToolbarItem } from "#avenue/components/toolbar";
import { ToolbarButton } from "#avenue/components/toolbar-button";
import { filterOps, isComplete, opLabel, opNeedsValue, type FilterKind, type FilterOp, type TableFilter } from "#avenue/lib/table-filters";
import { cn } from "#avenue/lib/utils";

export type { FilterKind, FilterOp, TableFilter };

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
  onChange,
}: {
  field: FilterField;
  filter: TableFilter;
  onChange: (value: string | string[]) => void;
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
              onCheckedChange={(on) =>
                onChange(on === true ? [...chosen, option.value] : chosen.filter((v) => v !== option.value))
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
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/** A filter's pill: press it to change its operator or value; × removes it. Dashed while it has no value yet. */
function FilterPill({
  field,
  filter,
  open,
  onOpenChange,
  onChange,
  onRemove,
  repeat,
}: {
  field: FilterField;
  filter: TableFilter;
  /** The second or later pill reading the same words, numbered in its name so an agent can tell them apart. */
  repeat?: number | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: TableFilter) => void;
  onRemove: () => void;
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
            onValueChange={(op: FilterOp) =>
              onChange({ ...filter, op, value: opNeedsValue(op) ? filter.value : emptyValue(field.kind) })
            }
          />
          <ValueEditor field={field} filter={filter} onChange={(value) => onChange({ ...filter, value })} />
        </PopoverContent>
      </Popover>
      <ToolbarItem
        aria-label={`Remove filter: ${summary}`}
        onClick={onRemove}
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
 */
export function TableFilters({
  fields,
  filters,
  onChange,
  className,
}: {
  fields: readonly FilterField[];
  filters: readonly TableFilter[];
  onChange: (filters: TableFilter[]) => void;
  className?: string | undefined;
}) {
  const [editing, setEditing] = useState<string>();
  const own = useRef<HTMLSpanElement>(null);
  const added = useRef<string>(undefined);
  const add = (field: FilterField) => {
    let n = filters.length + 1;
    while (filters.some((f) => f.id === `filter-${n}`)) n++;
    const id = `filter-${n}`;
    const op = filterOps[field.kind][0] ?? "is";
    onChange([...filters, { id, field: field.key, op, value: emptyValue(field.kind) }]);
    added.current = id;
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
              <MenuItem key={field.key} onSelect={() => add(field)}>
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
            onChange={(updated) => onChange(filters.map((f) => (f.id === filter.id ? updated : f)))}
            onRemove={() => {
              onChange(filters.filter((f) => f.id !== filter.id));
              // The × goes with its pill, so focus moves to the Filter button rather than falling to the page.
              own.current?.querySelector<HTMLElement>("[data-table-filter-add]")?.focus();
            }}
          />
        );
      })}
    </span>
  );
}
