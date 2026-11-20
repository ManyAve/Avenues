import type { Meta, StoryObj } from "@storybook/react-vite";
import { createAgent } from "@ui-sdk/react/agent";
import { useState } from "react";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { Chip } from "#avenue/components/chip";
import { Money } from "#avenue/components/money";
import { TableFilters, type FilterField, type TableFilter } from "#avenue/components/table-filter";
import { PhoneToolbar, Toolbar, ToolbarControls, ToolbarFilters, ToolbarSearch } from "#avenue/components/toolbar";
import { applyFilters, type FilterAccessor } from "#avenue/lib/table-filters";
import { expectListSheet, swipeDown, waitForClosed } from "../components/sheet-kit";

// AVE-123: Linear-style table filters, from Management's Households and Dues toolbars (MANA-1168). Fictional
// streets, neighbors and balances only.

const meta = { title: "Composites/Table filter", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const desktop = { viewport: { value: "desktop", isRotated: false } };
const phone = { viewport: { value: "phone", isRotated: false } };

type Household = { id: string; address: string; neighbor: string; dues: "paid" | "owing" | "partial"; balance: number; people: number };

const households: Household[] = [
  { id: "b12", address: "12 Birch Lane", neighbor: "Ada Okafor", dues: "paid", balance: 0, people: 2 },
  { id: "b14", address: "14 Birch Lane", neighbor: "Jonah Petrakis", dues: "owing", balance: 12_500, people: 4 },
  { id: "b17", address: "17 Birch Lane", neighbor: "Mei Lindqvist", dues: "partial", balance: 4_000, people: 1 },
  { id: "c3", address: "3 Cedar Court", neighbor: "Rafael Duarte", dues: "paid", balance: 0, people: 3 },
  { id: "c5", address: "5 Cedar Court", neighbor: "Priya Nandakumar", dues: "owing", balance: 25_000, people: 2 },
  { id: "c8", address: "8 Cedar Court", neighbor: "Tomasz Weller", dues: "paid", balance: 0, people: 5 },
];

const fields: FilterField[] = [
  { key: "address", label: "Property", kind: "text" },
  { key: "neighbor", label: "Neighbor", kind: "text" },
  {
    key: "dues",
    label: "Dues status",
    kind: "choice",
    items: [
      { value: "paid", label: "Paid" },
      { value: "owing", label: "Owing" },
      { value: "partial", label: "Partial" },
    ],
  },
  { key: "balance", label: "Balance", kind: "money" },
  { key: "people", label: "People", kind: "number" },
];

const accessors: Record<string, FilterAccessor<Household>> = {
  address: { kind: "text", get: (h) => h.address },
  neighbor: { kind: "text", get: (h) => h.neighbor },
  dues: { kind: "choice", get: (h) => h.dues },
  balance: { kind: "money", get: (h) => h.balance },
  people: { kind: "number", get: (h) => h.people },
};

const someFilters: TableFilter[] = [
  { id: "f1", field: "dues", op: "any-of", value: ["owing", "partial"] },
  { id: "f2", field: "balance", op: "gte", value: "50" },
  { id: "f3", field: "neighbor", op: "contains", value: "" },
];

/** Picks an operator: from Avenue's list with a mouse, from the OS picker on a touch screen (Select's `native`). */
async function pickOperator(editor: HTMLElement, name: string, option: string) {
  const control = within(editor).getByRole("combobox", { name });
  if (control instanceof HTMLSelectElement) {
    await userEvent.selectOptions(control, option);
    return;
  }
  await userEvent.click(control);
  await userEvent.click(await screen.findByRole("option", { name: option }));
}

function Results({ rows }: { rows: Household[] }) {
  return (
    <div className="px-page">
      <p className="text-meta text-muted-foreground" data-testid="count">
        {rows.length} of {households.length} households
      </p>
      <ul aria-label="Matching households" className="mt-2 grid gap-1 text-compact">
        {rows.map((h) => (
          <li key={h.id} className="flex justify-between gap-4 rounded-md bg-muted px-3 py-2">
            <span>
              {h.address} · {h.neighbor}
            </span>
            <Money cents={h.balance} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Households({ initial = [] }: { initial?: TableFilter[] }) {
  const [filters, setFilters] = useState<TableFilter[]>(initial);
  const [owing, setOwing] = useState(false);
  const rows = applyFilters(households, filters, accessors).filter((h) => !owing || h.balance > 0);
  return (
    <div className="min-h-130 bg-background">
      <Toolbar aria-label="Households">
        <ToolbarFilters>
          <Chip count={3} pressed={owing} onPressedChange={setOwing}>
            Balance owing
          </Chip>
          <TableFilters fields={fields} value={filters} onValueChange={setFilters} />
        </ToolbarFilters>
        <ToolbarControls>
          <ToolbarSearch placeholder="Search households or people…" aria-label="Search households or people" />
        </ToolbarControls>
      </Toolbar>
      <Results rows={rows} />
    </div>
  );
}

const count = () => screen.getByTestId("count");

/**
 * No filters yet: one Filter button after the chips. By keyboard: the arrows reach it, Enter opens the list of
 * attributes, and choosing one adds its pill with the pill open and focus on its first value.
 */
export const AddByKeyboard: Story = {
  globals: desktop,
  render: () => <Households />,
  play: async ({ canvas }) => {
    await expect(count()).toHaveTextContent("6 of 6 households");
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: /Balance owing/ })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    const filter = canvas.getByRole("button", { name: "Filter" });
    await expect(filter).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    const menu = await screen.findByRole("menu");
    await expect(within(menu).getByRole("menuitem", { name: "Dues status" })).toBeVisible();
    // Type-ahead jumps to the item.
    await userEvent.keyboard("d");
    await waitFor(() => expect(within(menu).getByRole("menuitem", { name: "Dues status" })).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    const editor = await screen.findByRole("dialog", { name: "Dues status filter" });
    const paid = within(editor).getByRole("checkbox", { name: "Paid" });
    await waitFor(() => expect(paid).toHaveFocus());
    // Incomplete while it has no value: dashed, and it filters nothing.
    const pill = canvas.getByRole("button", { name: "Filter: Dues status is" });
    await expect(pill).toHaveAttribute("data-incomplete");
    await expect(count()).toHaveTextContent("6 of 6 households");
    await userEvent.tab();
    await userEvent.keyboard(" ");
    await expect(within(editor).getByRole("checkbox", { name: "Owing" })).toBeChecked();
    await expect(count()).toHaveTextContent("2 of 6 households");
    await userEvent.tab();
    await userEvent.keyboard(" ");
    await expect(count()).toHaveTextContent("3 of 6 households");
    await userEvent.keyboard("{Escape}");
    const done = canvas.getByRole("button", { name: "Filter: Dues status is any of Owing, Partial" });
    await waitFor(() => expect(done).toHaveFocus());
    await expect(done).not.toHaveAttribute("data-incomplete");
    // The Filter button becomes Add filter, an icon alone.
    await expect(canvas.getByRole("button", { name: "Add filter" })).toBeVisible();
  },
};

/**
 * A money filter: the operator changes from the Select, the value is typed in dollars, and an amount that isn't one
 * is marked invalid and filters nothing.
 */
export const MoneyFilter: Story = {
  globals: desktop,
  render: () => <Households />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Filter" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Balance" }));
    const editor = await screen.findByRole("dialog", { name: "Balance filter" });
    const value = within(editor).getByRole("textbox", { name: "Balance value" });
    await waitFor(() => expect(value).toHaveFocus());
    await userEvent.keyboard("100");
    await expect(count()).toHaveTextContent("0 of 6 households");
    await pickOperator(editor, "Balance operator", "is more than");
    await expect(count()).toHaveTextContent("2 of 6 households");
    await userEvent.clear(value);
    await userEvent.type(value, "12x");
    await expect(value).toHaveAttribute("aria-invalid", "true");
    await expect(count()).toHaveTextContent("6 of 6 households");
    await userEvent.clear(value);
    await userEvent.type(value, "$40");
    await expect(count()).toHaveTextContent("2 of 6 households");
    await userEvent.keyboard("{Escape}");
    await expect(canvas.getByRole("button", { name: "Filter: Balance is more than $40" })).toBeVisible();
  },
};

/** Three filters at rest: a choice with two values, a money comparison, and a text filter with no value yet (dashed). */
export const WithFilters: Story = {
  globals: desktop,
  render: () => <Households initial={someFilters} />,
  play: async ({ canvas }) => {
    await expect(count()).toHaveTextContent("2 of 6 households");
    await expect(canvas.getByRole("button", { name: "Filter: Dues status is any of Owing, Partial" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Filter: Balance is at least $50" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Filter: Neighbor contains" })).toHaveAttribute("data-incomplete");
  },
};

/** Two filters reading the same words: the second is numbered in its name, so an agent can tell the two apart. */
export const SameWordsTwice: Story = {
  globals: desktop,
  render: () => (
    <Households
      initial={[
        { id: "f1", field: "neighbor", op: "contains", value: "" },
        { id: "f2", field: "neighbor", op: "contains", value: "" },
      ]}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Filter: Neighbor contains" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Filter: Neighbor contains (2)" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Remove filter: Neighbor contains (2)" })).toBeVisible();
  },
};

/** A pill open to edit: its operator and its values. */
export const EditorOpen: Story = {
  globals: desktop,
  render: () => <Households initial={someFilters} />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Filter: Dues status is any of Owing, Partial" }));
    const editor = await screen.findByRole("dialog", { name: "Dues status filter" });
    await expect(within(editor).getByRole("checkbox", { name: "Owing" })).toBeChecked();
    // "is not" keeps the chosen values.
    await pickOperator(editor, "Dues status operator", "is not");
    await expect(canvas.getByRole("button", { name: "Filter: Dues status is none of Owing, Partial" })).toBeVisible();
    await expect(count()).toHaveTextContent("0 of 6 households");
    // "is set" takes no value, so the values go.
    await pickOperator(editor, "Dues status operator", "is set");
    await expect(within(editor).queryByRole("group", { name: "Dues status values" })).toBeNull();
  },
};

/** × removes its filter, and focus moves to the Add filter button instead of falling to the page. */
export const RemoveByKeyboard: Story = {
  globals: desktop,
  render: () => <Households initial={someFilters} />,
  play: async ({ canvas }) => {
    const remove = canvas.getByRole("button", { name: "Remove filter: Balance is at least $50" });
    remove.focus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.queryByRole("button", { name: /Balance is at least/ })).toBeNull();
    await expect(count()).toHaveTextContent("3 of 6 households");
    await expect(canvas.getByRole("button", { name: "Add filter" })).toHaveFocus();
    // The toolbar's arrows run Filter, then each pill and its ×.
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("button", { name: "Filter: Dues status is any of Owing, Partial" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("button", { name: "Remove filter: Dues status is any of Owing, Partial" })).toHaveFocus();
  },
};

/** The agent test: an agent adds a filter, picks its values and removes it through the same controls. */
export const Agent: Story = {
  globals: desktop,
  tags: ["agent"],
  render: () => <Households />,
  play: async ({ canvas }) => {
    const agent = createAgent();
    // The menu and its button share the name Filter, so the agent takes the menu by its ref; `press` with an item's
    // words opens it and chooses the item.
    const menu = agent.snapshot().find((c) => c.component === "menu");
    await expect(menu?.label).toBe("Filter");
    const pick = await agent.act({ steps: [{ ref: menu!.ref, action: "press", args: ["Dues status"] }] });
    await expect(pick.ok, pick.error?.message).toBe(true);
    await screen.findByRole("dialog", { name: "Dues status filter" });
    const check = await agent.act({ steps: [{ ref: "Owing", action: "setChecked", args: [true] }] });
    await expect(check.ok, check.error?.message).toBe(true);
    await waitFor(() => expect(count()).toHaveTextContent("2 of 6 households"));
    await userEvent.keyboard("{Escape}");
    const remove = await agent.act({ steps: [{ ref: "Remove filter: Dues status is Owing", action: "press" }] });
    await expect(remove.ok, remove.error?.message).toBe(true);
    await waitFor(() => expect(count()).toHaveTextContent("6 of 6 households"));
    await expect(canvas.queryByRole("button", { name: /Dues status/ })).toBeNull();
  },
};

/**
 * On a phone: the pills ride in the phone toolbar's scrolling strip after the chips, and on a touch screen each pill
 * and its × is 44px tall (MANA-1174). The editor opens as a popover kept on the screen (AVE-112).
 */
export const Phone: Story = {
  globals: phone,
  render: function Render() {
    const [filters, setFilters] = useState<TableFilter[]>(someFilters.slice(0, 1));
    const rows = applyFilters(households, filters, accessors);
    return (
      <div className="min-h-150 bg-background">
        <PhoneToolbar
          aria-label="Households"
          searchProps={{ "aria-label": "Search households or people" }}
          filters={
            <>
              <Chip count={3}>Balance owing</Chip>
              <TableFilters fields={fields} value={filters} onValueChange={setFilters} />
            </>
          }
        />
        <Results rows={rows} />
      </div>
    );
  },
  play: async ({ canvas }) => {
    const pill = canvas.getByRole("button", { name: "Filter: Dues status is any of Owing, Partial" });
    if (matchMedia("(pointer: coarse)").matches) await expect(Math.round(pill.getBoundingClientRect().height)).toBe(44);
    await userEvent.click(pill);
    const editor = await screen.findByRole("dialog", { name: "Dues status filter" });
    const box = editor.getBoundingClientRect();
    await expect(box.left).toBeGreaterThanOrEqual(0);
    await expect(box.right).toBeLessThanOrEqual(window.innerWidth);
    await expect(count()).toHaveTextContent("3 of 6 households");
    await userEvent.click(within(editor).getByRole("checkbox", { name: "Paid" }));
    await expect(count()).toHaveTextContent("6 of 6 households");
  },
};

// AVE-155: a long list of choices. Thirty made-up street names, one household on each.
const streetNames = [
  "Alder Way", "Aspen Court", "Birch Lane", "Bluebell Row", "Cedar Court", "Chestnut Drive", "Clover Path", "Cypress Bend",
  "Dogwood Place", "Elm Street", "Fern Hollow", "Hawthorn Road", "Hazel Close", "Heather Lane", "Hickory Trail",
  "Juniper Walk", "Larch Avenue", "Laurel Mews", "Linden Street", "Magnolia Drive", "Maple Grove", "Oak Street",
  "Oakmont Circle", "Pine Ridge", "Poplar Lane", "Redwood Terrace", "Rowan Court", "Spruce Way", "Sycamore Lane",
  "Willow Bend",
];
type Home = { id: string; street: string; address: string; dues: Household["dues"] };
const homes: Home[] = streetNames.map((street, i) => ({
  id: `h${i}`,
  street: street.toLowerCase().replace(/\s+/g, "-"),
  address: `${i * 2 + 3} ${street}`,
  dues: (["paid", "owing", "partial"] as const)[i % 3]!,
}));
const streetFields: FilterField[] = [
  { key: "street", label: "Street", kind: "choice", items: streetNames.map((s) => ({ value: s.toLowerCase().replace(/\s+/g, "-"), label: s })) },
  fields[2]!,
];
const homeAccessors: Record<string, FilterAccessor<Home>> = {
  street: { kind: "choice", get: (h) => h.street },
  dues: { kind: "choice", get: (h) => h.dues },
};

/** The long list's values, without the operator's options (a native select on a touch screen). */
const values = () => within(screen.getByRole("listbox")).getAllByRole("option");

function Streets({ initial = [], presentation }: { initial?: TableFilter[]; presentation?: "sheet" }) {
  const [filters, setFilters] = useState<TableFilter[]>(initial);
  const rows = applyFilters(homes, filters, homeAccessors);
  return (
    <div className="min-h-160 bg-background">
      <Toolbar aria-label="Households">
        <ToolbarFilters>
          <TableFilters fields={streetFields} value={filters} onValueChange={setFilters} presentation={presentation} />
        </ToolbarFilters>
      </Toolbar>
      <div className="px-page">
        <p className="text-meta text-muted-foreground" data-testid="count">
          {rows.length} of {homes.length} households
        </p>
      </div>
    </div>
  );
}

/**
 * A choice with more than eight values, like a board's thirty streets: a search field sits above the values (AVE-155).
 * Focus starts in it; typing narrows the list, the arrows move through it, Enter toggles a value, and the search keeps
 * its text so a second match goes in too. Escape closes the editor and focus returns to the pill. A short list, like
 * Dues status, stays a list of checkboxes.
 */
export const LongList: Story = {
  globals: desktop,
  render: () => <Streets />,
  play: async ({ canvas }) => {
    await expect(count()).toHaveTextContent("30 of 30 households");
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Filter" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    const menu = await screen.findByRole("menu");
    await userEvent.keyboard("s");
    await waitFor(() => expect(within(menu).getByRole("menuitem", { name: "Street" })).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    const search = await screen.findByRole("combobox", { name: "Street values" });
    await waitFor(() => expect(search).toHaveFocus());
    await expect(values()).toHaveLength(30);
    await userEvent.keyboard("oak");
    await waitFor(() => expect(values()).toHaveLength(2));
    await userEvent.keyboard("{Enter}");
    await expect(screen.getByRole("option", { name: "Oak Street" })).toHaveAttribute("aria-selected", "true");
    await expect(count()).toHaveTextContent("1 of 30 households");
    // The search keeps "oak", so the next match is one arrow away.
    await expect(search).toHaveValue("oak");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(screen.getByRole("option", { name: "Oakmont Circle" })).toHaveAttribute("aria-selected", "true");
    await expect(count()).toHaveTextContent("2 of 30 households");
    // Enter on a chosen value takes it out again.
    await userEvent.keyboard("{Enter}");
    await expect(count()).toHaveTextContent("1 of 30 households");
    await userEvent.keyboard("{Enter}");
    await expect(count()).toHaveTextContent("2 of 30 households");
    await userEvent.clear(search);
    await userEvent.type(search, "zz");
    await expect(await screen.findByText("Nothing matches “zz”.")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    const pill = canvas.getByRole("button", { name: "Filter: Street is any of Oak Street, Oakmont Circle" });
    await waitFor(() => expect(pill).toHaveFocus());
    // The pill and its × stay in the toolbar's arrow order.
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("button", { name: "Remove filter: Street is any of Oak Street, Oakmont Circle" })).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    await expect(canvas.getByRole("button", { name: "Add filter" })).toHaveFocus();
    // Reopened, the search starts empty, the operator still works, and the list is open for the picture.
    await userEvent.keyboard("{ArrowRight}{Enter}");
    const reopened = await screen.findByRole("combobox", { name: "Street values" });
    await waitFor(() => expect(reopened).toHaveFocus());
    await expect(reopened).toHaveValue("");
    await expect(screen.getByRole("option", { name: "Oak Street" })).toHaveAttribute("aria-selected", "true");
    await userEvent.type(reopened, "la");
  },
};

/** The agent sets a long list's values through the pill's combobox with `setValue`, by label, without opening it first. */
export const LongListAgent: Story = {
  globals: desktop,
  tags: ["agent"],
  render: () => <Streets initial={[{ id: "f1", field: "street", op: "any-of", value: [] }]} />,
  play: async ({ canvas }) => {
    const agent = createAgent();
    // To the agent the pill is the combobox, named by its words; it opens the list itself to read the values.
    const pill = agent.snapshot().find((c) => c.component === "combobox");
    await expect(pill?.label).toBe("Filter: Street is");
    const set = await agent.act({ steps: [{ ref: pill!.ref, action: "setValue", args: [["Willow Bend", "Elm Street"]] }] });
    await expect(set.ok, set.error?.message).toBe(true);
    await waitFor(() => expect(count()).toHaveTextContent("2 of 30 households"));
    await userEvent.keyboard("{Escape}");
    await expect(canvas.getByRole("button", { name: "Filter: Street is any of Willow Bend, Elm Street" })).toBeVisible();
  },
};

const coarse = () => matchMedia("(pointer: coarse)").matches;
const editor = () => screen.getByRole("combobox", { name: "Street values" }).closest<HTMLElement>("[data-slot=combobox-content]")!;

/**
 * The sheet's contract (AVE-157): it rests on the bottom edge with 44px rows, the search at its top above the operator
 * (as every picker's sheet puts its search first), and it holds far more than the popover's six rows. A tap on a
 * street ticks it and keeps the sheet open with the search's text, so the next match is one tap away.
 */
async function expectStreetsSheet() {
  const sheet = editor();
  await expect(sheet).toHaveAttribute("data-presentation", "sheet");
  await expectListSheet(sheet, "[data-slot=combobox-item]");
  const search = screen.getByRole("combobox", { name: "Street values" });
  const operator = within(sheet).getByLabelText("Street operator");
  await expect(search.getBoundingClientRect().bottom).toBeLessThanOrEqual(operator.getBoundingClientRect().top);
  const list = screen.getByRole("listbox").getBoundingClientRect();
  await expect(list.height).toBeGreaterThan(6 * 44);
  await userEvent.type(search, "oak");
  await waitFor(() => expect(values()).toHaveLength(2));
  await userEvent.click(screen.getByRole("option", { name: "Oak Street" }));
  await expect(count()).toHaveTextContent("2 of 30 households");
  await expect(screen.getByRole("combobox", { name: "Street values" })).toHaveValue("oak");
  await expect(editor()).toBeVisible();
  await userEvent.click(screen.getByRole("option", { name: "Oakmont Circle" }));
  await expect(count()).toHaveTextContent("3 of 30 households");
}

/**
 * On a phone (AVE-157): by default the long list's editor opens as a bottom sheet on a small touch screen, as Select
 * and Combobox do there, and as the popover with a mouse, decided each time it opens. Swiping the sheet down closes it.
 */
export const LongListPhone: Story = {
  globals: phone,
  render: () => <Streets initial={[{ id: "f1", field: "street", op: "any-of", value: ["maple-grove"] }]} />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Filter: Street is Maple Grove" }));
    await screen.findByRole("combobox", { name: "Street values" });
    if (coarse()) {
      await expectStreetsSheet();
      await swipeDown(editor());
      await waitForClosed("combobox");
      await expect(canvas.getByRole("button", { name: "Filter: Street is any of 3 selected" })).toBeVisible();
      return;
    }
    await expect(editor()).toHaveAttribute("data-presentation", "popover");
    const box = editor().getBoundingClientRect();
    await expect(box.left).toBeGreaterThanOrEqual(0);
    await expect(box.right).toBeLessThanOrEqual(window.innerWidth);
    await userEvent.click(screen.getByRole("option", { name: "Pine Ridge" }));
    await expect(count()).toHaveTextContent("2 of 30 households");
    // A chosen value's box fills like a checked Checkbox (ui-sdk marks it `data-selected=""`, which Tailwind's
    // `data-selected:` misses here).
    const fill = (name: string) => getComputedStyle(screen.getByRole("option", { name }).querySelector("span")!).backgroundColor;
    await expect(fill("Pine Ridge")).not.toBe(fill("Oak Street"));
  },
};

/** The long list's sheet, open, for the light and dark captures: as a phone shows it, on any screen. */
export const LongListSheet: Story = {
  name: "Long list, sheet open",
  globals: phone,
  render: () => <Streets presentation="sheet" initial={[{ id: "f1", field: "street", op: "any-of", value: ["maple-grove"] }]} />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Filter: Street is Maple Grove" }));
    await screen.findByRole("combobox", { name: "Street values" });
    await expectStreetsSheet();
    // Emptied, the search shows every street again, with the three chosen ticked, for the picture.
    await userEvent.clear(screen.getByRole("combobox", { name: "Street values" }));
    await waitFor(() => expect(values()).toHaveLength(30));
  },
};

/** With reduced motion asked for (a stand-in installed before render, as ui-sdk reads it when the sheet mounts). */
function stubReducedMotion() {
  const real = window.matchMedia.bind(window);
  window.matchMedia = (query: string) => {
    if (!query.includes("prefers-reduced-motion")) return real(query);
    return { ...real(query), media: query, matches: query.includes("reduce"), addEventListener: () => {}, removeEventListener: () => {} };
  };
  return () => {
    window.matchMedia = real;
  };
}

/**
 * AVE-180: with reduced motion the sheet opens in place and fades in. A tap on a street during that fade ticks it and
 * leaves the sheet open; ui-sdk 0.1 took the tap for a grab of a sheet still rising from the bottom edge and closed it
 * as a swipe (patched in Avenue). It made "Long list, sheet open" capture closed in some visual diffs.
 */
export const LongListSheetEarlyTap: Story = {
  name: "Long list, sheet tapped as it fades in",
  globals: phone,
  beforeEach: stubReducedMotion,
  render: () => <Streets presentation="sheet" initial={[{ id: "f1", field: "street", op: "any-of", value: ["maple-grove"] }]} />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Filter: Street is Maple Grove" }));
    const street = await screen.findByRole("option", { name: "Alder Way" });
    // The tap lands while the sheet is still fading in (a time-based animation; a touch screen's sheet also follows its
    // scroll position, which never ends).
    const moving = () => editor().getAnimations().filter((a) => a.timeline === document.timeline);
    await expect(moving().length).toBeGreaterThan(0);
    await userEvent.click(street);
    await expect(count()).toHaveTextContent("2 of 30 households");
    await waitFor(() => expect(moving()).toHaveLength(0));
    await expect(editor()).not.toHaveAttribute("data-ending-style");
    await expect(editor()).toHaveAttribute("data-open");
    await expect(street).toHaveAttribute("aria-selected", "true");
  },
};
