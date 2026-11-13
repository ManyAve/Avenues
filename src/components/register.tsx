"use client";

import { createParts } from "@ui-sdk/react/primitive";
import { ChevronDownIcon, ChevronRightIcon, HouseIcon, PlusIcon, type LucideIcon } from "lucide-react";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { Button } from "#avenue/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "#avenue/components/popover";
import { tintFor } from "#avenue/lib/format";
import { register } from "#avenue/lib/register";
import { cn } from "#avenue/lib/utils";

/**
 * The Register (AVE-9): the board's table of households, payments or requests. A grid with one Tab stop, arrow keys
 * between cells, a sticky header whose columns open a sort popover, street groups that collapse, selection
 * checkboxes and an add row. From the app's households-table.tsx (ColumnHeader, SortMenu, GroupRow, SelectableRow).
 *
 * Behavior comes from the `register` primitive (src/lib/register.ts) on ui-sdk's grid focus. The look is the app's,
 * on AVE-2's grid: header 36px (the app's 34), rows 36 compact, 48 normal (the app's 50), 52 comfortable, and the
 * street bar 48 (the app's 46).
 *
 * Rows and columns are numbered by the author: row 0 is the header, then every rendered row in order, street bars
 * and the add row included. `rowCount` counts them all; `spanningRows` lists the street bars and the add row.
 *
 * The focused cell shows a square 2px ring inset in the cell, so it never changes the row's height and the sticky
 * header can't clip it. Put the Register in a scroll pane with `scroll-pt-21` (header plus a street bar), so a row
 * the arrows reach scrolls in below them.
 */

// ui-sdk 0.1 beta types definePrimitive's `options` as `Record | undefined`, which createParts' `Primitive` refuses
// under exactOptionalPropertyTypes; this register always has options, so narrow it. Remove when ui-sdk fixes the type.
const typed = register as typeof register & { options: NonNullable<typeof register.options> };
const parts = createParts(typed, { root: "table", row: "tr", columnheader: "th", cell: "td" });

export type Density = "compact" | "normal" | "comfortable";

const rowHeight: Record<Density, string> = {
  // A phone or tablet keeps rows at 44px at least, so every control's 44px tap fits in its row (AVE-22).
  compact: "[&_td]:h-9 pointer-coarse:[&_td]:h-11",
  normal: "[&_td]:h-12",
  comfortable: "[&_td]:h-13",
};

/** The square inset ring on a focused cell, or on the cell around a focused control. */
const ring =
  "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-ring";

function Register({
  className,
  density = "normal",
  ...props
}: ComponentProps<typeof parts.Root> & { density?: Density | undefined }) {
  return (
    <parts.Root
      data-density={density}
      className={cn("w-full table-fixed border-separate border-spacing-0 text-compact", rowHeight[density], className)}
      {...props}
    />
  );
}

function RegisterHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead data-slot="register-header" className={className} {...props} />;
}

function RegisterBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody data-slot="register-body" className={className} {...props} />;
}

/** A row of the Register. `selected` tints it; `row` is its index, the header being 0. */
function RegisterRow({
  className,
  selected,
  ...props
}: ComponentProps<typeof parts.Row> & { selected?: boolean | undefined }) {
  return (
    <parts.Row
      data-selected={selected ? "" : undefined}
      className={cn(
        "group/row [&>td]:bg-background hover:[&>td]:bg-muted data-selected:[&>td]:bg-primary-subtle",
        className,
      )}
      {...props}
      id={`${props.row}`}
    />
  );
}

/**
 * A column header, sticky at the top. With `sortMenu`, the header is a button that opens it in a popover, and `sort`
 * says which way the column is sorted (aria-sort). `control` passes focus to the one control inside, like the
 * select-all checkbox.
 */
function RegisterColumnHeader({
  icon: Icon,
  sortMenu,
  sortLabel,
  numeric,
  control,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof parts.Columnheader>, "row" | "children"> & {
  children?: ReactNode;
  icon?: LucideIcon | undefined;
  sortMenu?: ReactNode | undefined;
  /** Names the sort button and its popover. Defaults to "Sort" and the column's text. */
  sortLabel?: string | undefined;
  /** A money column: the header sits at the end, over right-aligned figures. */
  numeric?: boolean | undefined;
}) {
  const content = (
    <span className={cn("flex items-center gap-2", numeric && "justify-end")}>
      {Icon && <Icon className="size-3 shrink-0 opacity-80" aria-hidden />}
      <span className="truncate">{children}</span>
      {sortMenu !== undefined && (
        <ChevronDownIcon className={cn("size-2.75 shrink-0 opacity-60", !numeric && "ms-auto")} aria-hidden />
      )}
    </span>
  );
  const label = sortLabel ?? `Sort ${typeof children === "string" ? children : ""}`.trim();
  return (
    <parts.Columnheader
      row={0}
      control={control || sortMenu !== undefined}
      scope="col"
      className={cn(
        "sticky top-0 z-10 h-9 pointer-coarse:h-11 bg-background px-3 text-start align-middle text-control font-[450] whitespace-nowrap text-muted-foreground",
        ring,
        className,
      )}
      {...props}
      id={`0:${props.col}`}
    >
      {sortMenu === undefined ? (
        control ? children : content
      ) : (
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label={label}
                className="relative hit-area w-full rounded-sm text-start outline-none hover:text-foreground"
              />
            }
          >
            {content}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 gap-0 p-2" aria-label={label}>
            {sortMenu}
          </PopoverContent>
        </Popover>
      )}
    </parts.Columnheader>
  );
}

/** A body cell. `control` passes focus to the one control inside it (a checkbox, a link, a row action). */
function RegisterCell({ className, ...props }: ComponentProps<typeof parts.Cell>) {
  return (
    <parts.Cell
      className={cn("overflow-hidden px-3 align-middle whitespace-nowrap text-ellipsis", ring, className)}
      {...props}
      id={`${props.row}:${props.col}`}
    />
  );
}

/**
 * The selection column's width, for the Register's colgroup: 32px, or 44px on a touch screen so the checkbox's 44px
 * tap stays inside its column (AVE-22).
 */
function RegisterSelectColumn({ className, ...props }: ComponentProps<"col">) {
  return <col className={cn("w-8 pointer-coarse:w-11", className)} {...props} />;
}

/** The selection cell that leads each row. Its checkbox sits centred in the selection column. */
function RegisterSelectCell({ className, ...props }: Omit<ComponentProps<typeof parts.Cell>, "col" | "control">) {
  return <RegisterCell col={0} control className={cn("px-0 [&>*]:mx-auto", className)} {...props} />;
}

/**
 * A street's bar: a tinted heading row, sticky under the column headers, whose button collapses the street.
 * List its `row` in the Register's `spanningRows`.
 */
function RegisterGroupRow({
  row,
  colCount,
  name,
  count,
  open,
  onOpenChange,
  icon: Icon = HouseIcon,
  trailing,
}: {
  row: number;
  colCount: number;
  name: string;
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: LucideIcon | undefined;
  /** At the end of the bar, like the street's outstanding total. */
  trailing?: ReactNode | undefined;
}) {
  return (
    <parts.Row id={`${row}`} row={row} className="sticky top-9 z-[5] pointer-coarse:top-11">
      <parts.Cell
        id={`${row}:0`}
        row={row}
        col={0}
        control
        colSpan={colCount}
        className={cn(
          "relative isolate h-12 border-y-[5px] border-background bg-clip-padding p-0 px-2 text-meta",
          "rounded-xl",
          ring,
        )}
      >
        <div
          data-tint={tintFor(name)}
          style={{ "--group-color": "var(--tint-solid)" } as CSSProperties}
          className="flex h-full items-center gap-2 rounded-xl px-2"
        >
          <div
            aria-hidden
            className="absolute inset-0 -z-[1] rounded-xl bg-[linear-gradient(100deg,color-mix(in_oklab,var(--group-color)_12%,var(--muted)),color-mix(in_oklab,var(--group-color)_4%,var(--muted))_55%,var(--muted))]"
          />
          <button
            type="button"
            aria-expanded={open}
            onClick={() => onOpenChange(!open)}
            className="relative hit-area flex min-w-0 flex-1 items-center gap-2.25 py-1.25 text-start outline-none"
          >
            {open ? (
              <ChevronDownIcon className="size-2.5 text-muted-foreground opacity-60" aria-hidden />
            ) : (
              <ChevronRightIcon className="size-2.5 text-muted-foreground opacity-60" aria-hidden />
            )}
            <Icon className="size-3.5 text-(--group-color)" aria-hidden />
            <span className="text-compact font-semibold">{name}</span>
            <span className="text-muted-foreground">{count}</span>
          </button>
          {trailing && <span className="ms-auto text-muted-foreground">{trailing}</span>}
        </div>
      </parts.Cell>
    </parts.Row>
  );
}

/** The last row: one button that adds a row. List its `row` in the Register's `spanningRows`. */
function RegisterAddRow({
  row,
  colCount,
  children,
  onAdd,
}: {
  row: number;
  colCount: number;
  children: ReactNode;
  onAdd: () => void;
}) {
  return (
    <parts.Row id={`${row}`} row={row}>
      <parts.Cell id={`${row}:0`} row={row} col={0} control colSpan={colCount} className={cn("h-10 px-3", ring)}>
        <button
          type="button"
          onClick={onAdd}
          className="relative hit-area flex items-center gap-1.75 py-1.25 text-control text-muted-foreground outline-none hover:text-foreground"
        >
          <PlusIcon className="size-3.25" aria-hidden />
          {children}
        </button>
      </parts.Cell>
    </parts.Row>
  );
}

export type SortDirection = "asc" | "desc";
export type SortValue = { field: string; direction: SortDirection } | null;
export type SortField = { key: string; label: string; /** The two directions' words, like ["A–Z", "Z–A"]. */ directions: [string, string] };

/** The body of a column's sort popover: each field with its two directions, Clear, and a help sentence. */
function SortMenu({
  fields,
  value,
  onChange,
  help,
}: {
  fields: SortField[];
  value: SortValue;
  onChange: (value: SortValue) => void;
  help?: string | undefined;
}) {
  return (
    <div className="text-meta">
      <div className="flex items-center justify-between px-2 pb-1 text-muted-foreground">
        <span>Sort by</span>
        <span>Direction</span>
        <Button variant="ghost" size="xs" onClick={() => onChange(null)} disabled={!value}>
          Clear
        </Button>
      </div>
      {fields.map((field) => (
        <div key={field.key} className="flex items-center gap-2 px-2 py-1">
          <span className="flex-1">{field.label}</span>
          {(["asc", "desc"] as const).map((direction, i) => {
            const on = value?.field === field.key && value.direction === direction;
            return (
              <Button
                key={direction}
                variant={on ? "secondary" : "ghost"}
                size="xs"
                aria-pressed={on}
                aria-label={`${field.label}, ${field.directions[i]}`}
                onClick={() => onChange({ field: field.key, direction })}
              >
                {field.directions[i]}
              </Button>
            );
          })}
        </div>
      ))}
      {help && <p className="mt-1 border-t px-2 pt-2 whitespace-pre-line text-muted-foreground">{help}</p>}
    </div>
  );
}

/** aria-sort for a column, from the Register's sort value. */
function ariaSort(value: SortValue, field: string): "ascending" | "descending" | undefined {
  if (value?.field !== field) return undefined;
  return value.direction === "asc" ? "ascending" : "descending";
}

export {
  ariaSort,
  Register,
  RegisterAddRow,
  RegisterBody,
  RegisterCell,
  RegisterColumnHeader,
  RegisterGroupRow,
  RegisterHeader,
  RegisterRow,
  RegisterSelectCell,
  RegisterSelectColumn,
  SortMenu,
};
