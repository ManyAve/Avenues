// Table filters (AVE-123): attribute + operator + value, ANDed together. The rules behind TableFilters
// (src/components/table-filter.tsx), from Management's shared/lib/tableFilters.ts (MANA-1168). The operator words
// and what counts as a complete filter are the component's vocabulary, so they live here with it; the matching
// rules come along so both apps filter with the same words meaning the same thing.

/** How a field's values compare: `money` takes dollars and compares cents, `choice` picks from a fixed list. */
export type FilterKind = "text" | "number" | "money" | "choice";

export type FilterOp =
  | "contains"
  | "not-contains"
  | "starts-with"
  | "is"
  | "is-not"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "any-of"
  | "none-of"
  | "set"
  | "not-set";

/** The operators each kind offers, the first being the one a new filter starts with. */
export const filterOps: Record<FilterKind, readonly FilterOp[]> = {
  text: ["contains", "not-contains", "is", "is-not", "starts-with", "set", "not-set"],
  number: ["is", "is-not", "gt", "gte", "lt", "lte", "set", "not-set"],
  money: ["is", "is-not", "gt", "gte", "lt", "lte", "set", "not-set"],
  choice: ["any-of", "none-of", "set", "not-set"],
};

const numberLabels: Partial<Record<FilterOp, string>> = {
  is: "is",
  "is-not": "is not",
  gt: "is more than",
  gte: "is at least",
  lt: "is less than",
  lte: "is at most",
  set: "is set",
  "not-set": "is not set",
};

const labels: Record<FilterKind, Partial<Record<FilterOp, string>>> = {
  text: {
    contains: "contains",
    "not-contains": "does not contain",
    "starts-with": "starts with",
    is: "is",
    "is-not": "is not",
    set: "is set",
    "not-set": "is not set",
  },
  number: numberLabels,
  money: numberLabels,
  choice: { "any-of": "is", "none-of": "is not", set: "is set", "not-set": "is not set" },
};

/** The operator's words for a field of this kind. A choice with several values reads "is any of" / "is none of". */
export function opLabel(kind: FilterKind, op: FilterOp, count = 1): string {
  if (kind === "choice" && count > 1) {
    if (op === "any-of") return "is any of";
    if (op === "none-of") return "is none of";
  }
  return labels[kind][op] ?? op;
}

/** `set` and `not-set` take no value. */
export const opNeedsValue = (op: FilterOp) => op !== "set" && op !== "not-set";

/** One filter. `value` is what was typed (dollars for money) or the chosen option values for a choice. */
export type TableFilter = {
  id: string;
  field: string;
  op: FilterOp;
  value: string | string[];
};

/** A cell as the filter sees it: `undefined` (or an empty string) is "not set". */
export type FilterCell = string | number | undefined;

const text = (value: string | string[]) => (Array.isArray(value) ? (value[0] ?? "") : value);

/** Dollars as typed ("1,250.50", "$40") to whole cents, or undefined when it isn't an amount. */
export function dollarsToCents(input: string): number | undefined {
  const clean = input.replace(/[$,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(clean)) return undefined;
  return Math.round(Number(clean) * 100);
}

/** A filter with no value yet (or an unreadable number) is incomplete and filters nothing. */
export function isComplete(kind: FilterKind, filter: Pick<TableFilter, "op" | "value">): boolean {
  if (!opNeedsValue(filter.op)) return true;
  if (kind === "choice") return Array.isArray(filter.value) ? filter.value.length > 0 : filter.value !== "";
  const typed = text(filter.value).trim();
  if (typed === "") return false;
  if (kind === "money") return dollarsToCents(typed) !== undefined;
  if (kind === "number") return Number.isFinite(Number(typed));
  return true;
}

/** Does a row's cell pass the filter? Text compares case-insensitively; money compares cents. */
export function matchesFilter(kind: FilterKind, filter: Pick<TableFilter, "op" | "value">, cell: FilterCell): boolean {
  const { op } = filter;
  const empty = cell === undefined || cell === "";
  if (op === "set") return !empty;
  if (op === "not-set") return empty;
  if (!isComplete(kind, filter)) return true;
  if (kind === "choice") {
    const chosen = Array.isArray(filter.value) ? filter.value : [filter.value];
    const has = !empty && chosen.includes(String(cell));
    return op === "none-of" ? !has : has;
  }
  if (kind === "text") {
    const needle = text(filter.value).trim().toLowerCase();
    const hay = empty ? "" : String(cell).toLowerCase();
    switch (op) {
      case "contains":
        return hay.includes(needle);
      case "not-contains":
        return !hay.includes(needle);
      case "starts-with":
        return hay.startsWith(needle);
      case "is":
        return !empty && hay === needle;
      case "is-not":
        return empty || hay !== needle;
      default:
        return true;
    }
  }
  const target = kind === "money" ? dollarsToCents(text(filter.value)) : Number(text(filter.value));
  if (target === undefined) return true;
  // A missing number never satisfies a comparison, but "is not" keeps it, like the text rule.
  if (empty) return op === "is-not";
  const n = Number(cell);
  switch (op) {
    case "is":
      return n === target;
    case "is-not":
      return n !== target;
    case "gt":
      return n > target;
    case "gte":
      return n >= target;
    case "lt":
      return n < target;
    case "lte":
      return n <= target;
    default:
      return true;
  }
}

/** How to read one field from a row. Money cells are cents. */
export type FilterAccessor<R> = { kind: FilterKind; get: (row: R) => FilterCell };

/** Every complete filter must pass (AND). Filters on a field with no accessor are ignored. */
export function applyFilters<R>(
  rows: readonly R[],
  filters: readonly TableFilter[],
  fields: Readonly<Record<string, FilterAccessor<R>>>,
): R[] {
  const active = filters.flatMap((f) => {
    // Own keys only, so a field named like an Object method ("constructor") is unknown, not a function.
    const field = Object.hasOwn(fields, f.field) ? fields[f.field] : undefined;
    return field && isComplete(field.kind, f) ? [{ f, field }] : [];
  });
  if (active.length === 0) return [...rows];
  return rows.filter((row) => active.every(({ f, field }) => matchesFilter(field.kind, f, field.get(row))));
}
