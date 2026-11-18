// Fails the typecheck if Select, Combobox or TableFilters stop taking what Management and Neighbors pass today
// (AVE-146). Each case copies the shape of a call site in those apps, with fictional data. `options` is the deprecated
// name for `items`; it keeps working until both apps have moved off it.
import { Combobox, type ComboboxOption } from "#avenue/components/combobox";
import { Select } from "#avenue/components/select";
import { TableFilters, type FilterField } from "#avenue/components/table-filter";

declare const id: string;
declare const value: string;
declare const maybe: boolean | undefined;
declare const onChange: (next: string) => void;

// Management's household picker: options with fields of its own, a filter typed by them, a ranked match.
type Household = ComboboxOption & { address: string; owner?: string | undefined; spreadsheetId?: string | undefined };
declare const households: Household[];
declare function matchHousehold(option: Household, query: string): boolean | number;
export const householdPicker = (
  <Combobox
    id={id}
    options={households}
    value={value}
    onValueChange={(next) => next && onChange(next)}
    noneLabel="Neighborhood"
    triggerLabel="Show households"
    emptyMessage={(query) => `No household matches “${query}”.`}
    filter={matchHousehold}
    invalid={maybe}
    disabled={maybe}
  />
);

// Management's documents form: computed options, one disabled, and a value narrowed in the callback.
declare function isCategory(value: string): value is "minutes" | "budget";
export const documentsCategory = (
  <Select
    options={[{ value: "minutes", label: "Minutes" }, { value: "budget", label: "Budget", disabled: !!maybe }]}
    value={value}
    onValueChange={(category) => {
      if (isCategory(category)) onChange(category);
    }}
    invalid={maybe}
  />
);

// Neighbors' ballot dialogs: a value that may be null, a state setter, aria-describedby that may be undefined.
declare const setPropertyId: (next: string) => void;
export const ballotProperty = (
  <Select
    id={id}
    options={[{ value: "p1", label: "1 Example Way" }]}
    value={value === "" ? null : value}
    onValueChange={setPropertyId}
    placeholder="Choose a property"
    aria-describedby={maybe ? "error" : undefined}
  />
);

// Management's table filter: a choice field still listing `options`.
const fields: FilterField[] = [
  { key: "status", label: "Dues status", kind: "choice", options: [{ value: "owing", label: "Owing" }] },
  { key: "street", label: "Street", kind: "choice", items: [{ value: "lantern", label: "Lantern Row" }] },
];
export const tableFilters = <TableFilters fields={fields} defaultValue={[]} />;

// The new forms: object values, and groups in `items`.
type Member = { id: number; name: string };
declare const members: Member[];
export const objectValues = (
  <Select
    items={members.map((m) => ({ value: m, label: m.name }))}
    defaultValue={members[0] ?? null}
    itemToValue={(m) => String(m.id)}
    isItemEqualToValue={(a, b) => a.id === b.id}
    onValueChange={(m) => onChange(m.name)}
  />
);
export const groupedCombobox = (
  <Combobox
    items={[{ type: "group", label: "Lantern Row", items: [{ value: "h1", label: "12 Lantern Row" }] }, { type: "separator" }]}
    defaultValue="h1"
    onValueChange={(next) => next && onChange(next)}
  />
);
