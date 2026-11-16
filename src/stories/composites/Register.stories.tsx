import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircleDollarSignIcon, HouseIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { createAgent } from "@ui-sdk/react/agent";
import { Fragment, useState } from "react";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "#avenue/components/alert-dialog";
import { Button } from "#avenue/components/button";
import { Checkbox } from "#avenue/components/checkbox";
import { Combobox } from "#avenue/components/combobox";
import { Input } from "#avenue/components/input";
import { Money } from "#avenue/components/money";
import {
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
  type Density,
  type SortField,
  type SortValue,
} from "#avenue/components/register";

// AVE-9: the Register, from the app's households table. Fictional streets and neighbors only.

const meta = { title: "Composites/Register" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const desktop = { viewport: { value: "desktop", isRotated: false } };
const wide = { viewport: { value: "wide", isRotated: false } };

type Household = { id: string; street: string; address: string; neighbor: string; balance: number };

const households: Household[] = [
  { id: "b12", street: "Birch Lane", address: "12 Birch Lane", neighbor: "Ada Okafor", balance: 0 },
  { id: "b14", street: "Birch Lane", address: "14 Birch Lane", neighbor: "Jonah Petrakis", balance: 12_500 },
  { id: "b17", street: "Birch Lane", address: "17 Birch Lane", neighbor: "Mei Lindqvist", balance: 4_000 },
  { id: "c3", street: "Cedar Court", address: "3 Cedar Court", neighbor: "Rafael Duarte", balance: 0 },
  { id: "c5", street: "Cedar Court", address: "5 Cedar Court", neighbor: "Priya Nandakumar", balance: 25_000 },
  { id: "c8", street: "Cedar Court", address: "8 Cedar Court", neighbor: "Tomasz Weller", balance: 0 },
];

const fields: Record<string, SortField> = {
  property: { key: "property", label: "Property", directions: ["A–Z", "Z–A"] },
  neighbor: { key: "neighbor", label: "Neighbor", directions: ["A–Z", "Z–A"] },
  dues: { key: "dues", label: "Balance", directions: ["Low–high", "High–low"] },
};

const COLS = 5;

function sorted(rows: Household[], sort: SortValue) {
  if (!sort) return rows;
  const value = (h: Household) => (sort.field === "dues" ? h.balance : sort.field === "neighbor" ? h.neighbor : h.address);
  const out = [...rows].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    return typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "en", { numeric: true });
  });
  return sort.direction === "desc" ? out.reverse() : out;
}

/** Numbers the rendered rows: each street's bar, then its rows while it's open. Returns the next free row. */
function layout(streets: string[], visible: Household[], closed: ReadonlySet<string>, sort: SortValue) {
  const groups: { street: string; bar: number; members: Household[]; shown: { h: Household; row: number }[] }[] = [];
  let count = 1;
  for (const street of streets) {
    const members = sorted(
      visible.filter((h) => h.street === street),
      sort,
    );
    const bar = count;
    const shown = closed.has(street) ? [] : members.map((h, i) => ({ h, row: bar + 1 + i }));
    groups.push({ street, bar, members, shown });
    count = bar + 1 + shown.length;
  }
  return { groups, count };
}

function Households({
  density = "normal",
  initialSort = { field: "property", direction: "asc" },
  onlyDue = false,
}: {
  density?: Density;
  initialSort?: SortValue;
  onlyDue?: boolean;
}) {
  const [rows, setRows] = useState(households);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set(["b14"]));
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const [sort, setSort] = useState<SortValue>(initialSort);
  const [due, setDue] = useState(onlyDue);
  const visible = rows.filter((h) => !due || h.balance > 0);
  const streets = [...new Set(visible.map((h) => h.street))];

  // Row 0 is the header; then each street's bar, its rows while open, and the add row.
  const { groups, count } = layout(streets, visible, closed, sort);
  const addRow = count;
  const rowCount = count + 1;
  const spanning = [...groups.map((g) => g.bar), addRow];

  const all = visible.length > 0 && visible.every((h) => selected.has(h.id));
  const some = visible.some((h) => selected.has(h.id));
  const toggle = (id: string, on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  const header = (field: string) => (
    <SortMenu fields={[fields[field]!]} value={sort} onChange={setSort} help="Streets keep their order; rows sort inside each street." />
  );

  return (
    <div className="flex flex-col gap-group">
      <div className="flex items-center gap-group">
        <Button variant="outline" size="sm" aria-pressed={due} onClick={() => setDue((d) => !d)}>
          Only balances due
        </Button>
      </div>
      <div data-register-pane className="max-h-[520px] scroll-pt-21 overflow-auto pointer-coarse:scroll-pt-23">
        <Register aria-label="Households" rowCount={rowCount} colCount={COLS} spanningRows={spanning} density={density}>
          <colgroup>
            <RegisterSelectColumn />
            <col className="w-[205px]" />
            <col className="w-[215px]" />
            <col className="w-[192px]" />
            <col className="w-[184px]" />
          </colgroup>
          <RegisterHeader>
            <RegisterRow row={0}>
              <RegisterColumnHeader col={0} control className="px-0 [&>*]:mx-auto">
                <Checkbox
                  aria-label="Select all households"
                  checked={all ? true : some ? "indeterminate" : false}
                  onCheckedChange={(on) => setSelected(on ? new Set(visible.map((h) => h.id)) : new Set())}
                />
              </RegisterColumnHeader>
              <RegisterColumnHeader col={1} icon={HouseIcon} sort={ariaSort(sort, "property")} sortMenu={header("property")}>
                Property
              </RegisterColumnHeader>
              <RegisterColumnHeader col={2} icon={UsersIcon} sort={ariaSort(sort, "neighbor")} sortMenu={header("neighbor")}>
                Neighbor
              </RegisterColumnHeader>
              <RegisterColumnHeader col={3} icon={CircleDollarSignIcon} sort={ariaSort(sort, "dues")} sortMenu={header("dues")}>
                Balance
              </RegisterColumnHeader>
              <RegisterColumnHeader col={4}>Actions</RegisterColumnHeader>
            </RegisterRow>
          </RegisterHeader>
          <RegisterBody>
            {groups.map((g) => (
              <Fragment key={g.street}>
                <RegisterGroupRow
                  row={g.bar}
                  colCount={COLS}
                  name={g.street}
                  count={g.members.length}
                  open={!closed.has(g.street)}
                  onOpenChange={(open) =>
                    setClosed((c) => {
                      const n = new Set(c);
                      if (open) n.delete(g.street);
                      else n.add(g.street);
                      return n;
                    })
                  }
                  trailing={
                    <>
                      <Money cents={g.members.reduce((t, h) => t + h.balance, 0)} className="font-sans" /> outstanding
                    </>
                  }
                />
                {g.shown.map(({ h, row }) => (
                  <RegisterRow key={h.id} row={row} selected={selected.has(h.id)}>
                    <RegisterSelectCell row={row} className="rounded-s-md">
                      <Checkbox
                        aria-label={`Select ${h.address}`}
                        checked={selected.has(h.id)}
                        onCheckedChange={(on) => toggle(h.id, on === true)}
                      />
                    </RegisterSelectCell>
                    <RegisterCell row={row} col={1} control>
                      <a href={`#household-${h.id}`} className="font-medium underline-offset-3 outline-none hover:underline">
                        {h.address}
                      </a>
                    </RegisterCell>
                    <RegisterCell row={row} col={2}>
                      {h.neighbor}
                    </RegisterCell>
                    <RegisterCell row={row} col={3}>
                      <Money cents={h.balance} />
                    </RegisterCell>
                    <RegisterCell row={row} col={4} control className="rounded-e-md">
                      <AlertDialog
                        onOpenChange={(open, details) => {
                          if (!open && details.returnValue === "remove") setRows((r) => r.filter((x) => x.id !== h.id));
                        }}
                      >
                        <AlertDialogTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Remove ${h.address}`}
                              data-agent-confirm={`Removes ${h.address}`}
                            />
                          }
                        >
                          <Trash2Icon aria-hidden /> Remove
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {h.address}?</AlertDialogTitle>
                            <AlertDialogDescription>The household and its payment history will be removed.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
                            <AlertDialogClose value="remove" render={<Button variant="destructive" />}>
                              Remove
                            </AlertDialogClose>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </RegisterCell>
                  </RegisterRow>
                ))}
              </Fragment>
            ))}
            <RegisterAddRow
              row={addRow}
              colCount={COLS}
              onAdd={() =>
                setRows((r) => [
                  ...r,
                  { id: `n${r.length}`, street: "Cedar Court", address: `${10 + r.length} Cedar Court`, neighbor: "New neighbor", balance: 0 },
                ])
              }
            >
              Add household
            </RegisterAddRow>
          </RegisterBody>
        </Register>
      </div>
      <Button variant="outline" size="sm" className="self-start">
        After the table
      </Button>
    </div>
  );
}

function frame(children: React.ReactNode) {
  return <div className="mx-auto max-w-layout px-page py-section">{children}</div>;
}

const grid = () => screen.getByRole("grid", { name: "Households" });
const stops = () => grid().querySelectorAll('[tabindex="0"]').length;

/** At the desktop app's smallest window. One Tab stop; the arrows reach every control, header to add row. */
export const DesktopMinimum: Story = {
  globals: desktop,
  render: () => frame(<Households />),
  play: async ({ canvas }) => {
    await expect(stops()).toBe(1);
    await expect(canvas.getByRole("columnheader", { name: /Property/ })).toHaveAttribute("aria-sort", "ascending");
    await expect(canvas.getByRole("columnheader", { name: /Balance/ })).toHaveAttribute("aria-sort", "none");
    await userEvent.click(canvas.getByRole("button", { name: "Only balances due" }));
    await userEvent.click(canvas.getByRole("button", { name: "Only balances due" }));
    // One Tab from the filter enters the grid at its first cell: the select-all checkbox.
    await userEvent.tab();
    await expect(canvas.getByRole("checkbox", { name: "Select all households" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(canvas.getByRole("button", { name: /^Birch Lane/ })).toHaveFocus();
    await expect(canvas.getByRole("button", { name: /^Birch Lane/ })).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{ArrowDown}");
    await expect(canvas.getByRole("checkbox", { name: "Select 12 Birch Lane" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("link", { name: "12 Birch Lane" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("gridcell", { name: "Ada Okafor" })).toHaveFocus();
    await userEvent.keyboard("{End}");
    await expect(canvas.getByRole("button", { name: "Remove 12 Birch Lane" })).toHaveFocus();
    await expect(stops()).toBe(1);
    // Space toggles the selection checkbox and leaves the stop where it is.
    await userEvent.keyboard("{Home}");
    await userEvent.keyboard(" ");
    await expect(canvas.getByRole("checkbox", { name: "Select 12 Birch Lane" })).toBeChecked();
    await expect(canvas.getByRole("checkbox", { name: "Select all households" })).toHaveAttribute("aria-checked", "mixed");
    // The street bar collapses its rows; the arrows skip what's gone.
    await userEvent.keyboard("{ArrowUp}");
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByRole("button", { name: /^Birch Lane/ })).toHaveAttribute("aria-expanded", "false");
    await expect(canvas.queryByRole("link", { name: "12 Birch Lane" })).toBeNull();
    await userEvent.keyboard("{ArrowDown}");
    await expect(canvas.getByRole("button", { name: /^Cedar Court/ })).toHaveFocus();
    await userEvent.keyboard("{Control>}{End}{/Control}");
    await expect(canvas.getByRole("button", { name: "Add household" })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "After the table" })).toHaveFocus();
  },
};

/** Wide: the page frame stops at max-w-layout (1280px); the columns keep their widths. */
export const Wide: Story = {
  globals: wide,
  render: () => frame(<Households />),
  play: async () => {
    await expect(Math.round(grid().getBoundingClientRect().width)).toBeLessThanOrEqual(1280);
  },
};

/**
 * The agent test (AVE-79): an agent collapses and reopens a street and sorts a column through the Register's parts
 * (ui-sdk Buttons and the sort Popover), the way the person would, and every control it sees has a name.
 */
export const AgentExpandsAndSorts: Story = {
  globals: wide,
  tags: ["agent"],
  render: () => frame(<Households />),
  play: async ({ canvas }) => {
    const agent = createAgent();
    const birch = canvas.getByRole("button", { name: "Birch Lane 3 households" });
    const collapse = await agent.act({ steps: [{ ref: "Birch Lane 3 households", action: "press" }] });
    await expect(collapse.ok, collapse.error?.message).toBe(true);
    await waitFor(() => expect(birch).toHaveAttribute("aria-expanded", "false"));
    await expect(canvas.queryByRole("link", { name: "12 Birch Lane" })).toBeNull();
    const reopen = await agent.act({ steps: [{ ref: "Birch Lane 3 households", action: "press" }] });
    await expect(reopen.ok, reopen.error?.message).toBe(true);
    await waitFor(() => expect(birch).toHaveAttribute("aria-expanded", "true"));

    const open = await agent.act({ steps: [{ ref: "Sort Balance", action: "setOpen", args: [true] }] });
    await expect(open.ok, open.error?.message).toBe(true);
    await screen.findByRole("button", { name: "Balance, High–low, descending" });
    const sort = await agent.act({ steps: [{ ref: "Balance, High–low, descending", action: "press" }] });
    await expect(sort.ok, sort.error?.message).toBe(true);
    await waitFor(() =>
      expect(canvas.getByRole("columnheader", { name: /Balance/ })).toHaveAttribute("aria-sort", "descending"),
    );
    const cedar = canvas.getAllByRole("link").filter((a) => a.textContent?.includes("Cedar"));
    await expect(cedar[0]).toHaveTextContent("5 Cedar Court");
  },
};

/**
 * The sorted column shows its direction (AVE-78): an arrow in place of the chevron, and the header's text and arrow in
 * foreground. Unsorted columns keep the faint chevron in muted-foreground.
 */
async function expectSortShown(column: string, direction: "ascending" | "descending" | undefined) {
  const header = screen.getByRole("columnheader", { name: new RegExp(column) });
  const icon = header.querySelector("button svg:last-of-type")!;
  if (direction) {
    await expect(icon).toHaveAttribute("data-sorted", direction);
    await expect(icon.getAttribute("class")).toMatch(direction === "ascending" ? /lucide-arrow-up/ : /lucide-arrow-down/);
    await expect(getComputedStyle(icon).opacity).toBe("1");
  } else {
    await expect(icon).not.toHaveAttribute("data-sorted");
    await expect(icon.getAttribute("class")).toMatch(/lucide-chevron-down/);
  }
  const text = getComputedStyle(header).color;
  const probe = document.createElement("span");
  probe.className = direction ? "text-foreground" : "text-muted-foreground";
  header.append(probe);
  const expected = getComputedStyle(probe).color;
  probe.remove();
  await expect(text).toBe(expected);
}

/**
 * The sort popover at rest, open on Balance with High–low chosen: Balance shows a down arrow in foreground, beside
 * Property and Neighbor's faint chevrons (AVE-78).
 */
export const SortPopoverOpen: Story = {
  globals: desktop,
  render: () => frame(<Households initialSort={{ field: "dues", direction: "desc" }} />),
  play: async ({ canvas }) => {
    await expectSortShown("Balance", "descending");
    await expectSortShown("Property", undefined);
    await expectSortShown("Neighbor", undefined);
    await userEvent.click(canvas.getByRole("button", { name: "Sort Balance" }));
    await expect(await screen.findByRole("button", { name: "Balance, High–low, descending" })).toHaveAttribute("aria-pressed", "true");
  },
};

/** Sorted from low to high, the arrow points up. */
export const SortedAscending: Story = {
  globals: wide,
  render: () => frame(<Households initialSort={{ field: "dues", direction: "asc" }} />),
  play: async () => {
    await expectSortShown("Balance", "ascending");
    await expectSortShown("Property", undefined);
  },
};

/** The column popover sorts; aria-sort follows. Escape returns focus to the header, and the arrows go on. */
export const SortPopover: Story = {
  globals: desktop,
  render: () => frame(<Households />),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("checkbox", { name: "Select all households" }));
    await userEvent.click(canvas.getByRole("checkbox", { name: "Select all households" }));
    await userEvent.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    const sortBalance = canvas.getByRole("button", { name: "Sort Balance" });
    await expect(sortBalance).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    const highLow = await screen.findByRole("button", { name: "Balance, High–low, descending" });
    // Arrow keys in the popover are the popover's, not the grid's.
    await userEvent.keyboard("{ArrowLeft}");
    await expect(sortBalance).toHaveAttribute("aria-expanded", "true");
    // The chosen direction carries a check, not colour alone, and choosing moves no width (AVE-94).
    const width = highLow.getBoundingClientRect().width;
    await expect(highLow.querySelector("[data-slot=sort-check]")).toBeNull();
    await userEvent.click(highLow);
    await expect(highLow).toHaveAttribute("aria-pressed", "true");
    await expect(highLow.querySelector("[data-slot=sort-check]")).toBeVisible();
    await expect(highLow.getBoundingClientRect().width).toBe(width);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(sortBalance).toHaveFocus());
    await expect(canvas.getByRole("columnheader", { name: /Balance/ })).toHaveAttribute("aria-sort", "descending");
    await expect(canvas.getByRole("columnheader", { name: /Property/ })).toHaveAttribute("aria-sort", "none");
    // The sorted column shows its direction; the one it took over from goes back to the chevron (AVE-78).
    await expectSortShown("Balance", "descending");
    await expectSortShown("Property", undefined);
    const cedar = canvas.getAllByRole("link").filter((a) => a.textContent?.includes("Cedar"));
    await expect(cedar[0]).toHaveTextContent("5 Cedar Court");
    await userEvent.keyboard("{ArrowLeft}");
    await expect(canvas.getByRole("button", { name: "Sort Neighbor" })).toHaveFocus();
    await expect(stops()).toBe(1);
  },
};

/**
 * QA's regression (AVE-9): Tab into the table once, arrow to a row action, open and close its dialog, then Tab.
 * Focus returns to the action, the stop follows it, and Tab leaves the table.
 */
export const RowActionDialogThenTab: Story = {
  globals: desktop,
  render: () => frame(<Households />),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Only balances due" }));
    await userEvent.click(canvas.getByRole("button", { name: "Only balances due" }));
    await userEvent.tab();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{End}");
    const remove = canvas.getByRole("button", { name: "Remove 14 Birch Lane" });
    await expect(remove).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    const dialog = await screen.findByRole("alertdialog", { name: "Remove 14 Birch Lane?" });
    await expect(dialog).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(remove).toHaveFocus());
    await expect(remove).toHaveAttribute("tabindex", "0");
    await expect(stops()).toBe(1);
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "After the table" })).toHaveFocus();
    // And Shift+Tab comes back to the same action.
    await userEvent.tab({ shift: true });
    await expect(remove).toHaveFocus();
  },
};

/**
 * The same with the pointer (Architect's rule 1, "follow focus from any source"): a row action that isn't the stop is
 * clicked, its dialog closes and hands focus back, and that action is now the table's one stop.
 */
export const RowActionClickedDialogThenTab: Story = {
  globals: desktop,
  render: () => frame(<Households />),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Only balances due" }));
    await userEvent.click(canvas.getByRole("button", { name: "Only balances due" }));
    const remove = canvas.getByRole("button", { name: "Remove 14 Birch Lane" });
    await expect(remove).toHaveAttribute("tabindex", "-1");
    await userEvent.click(remove);
    await screen.findByRole("alertdialog", { name: "Remove 14 Birch Lane?" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(remove).toHaveFocus());
    await expect(remove).toHaveAttribute("tabindex", "0");
    await expect(stops()).toBe(1);
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "After the table" })).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(remove).toHaveFocus();
  },
};

/** A click anywhere moves the stop there: the next Tab into the table lands on what was clicked. */
export const ClickMovesTheStop: Story = {
  globals: desktop,
  render: () => frame(<Households />),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("gridcell", { name: "Priya Nandakumar" }));
    await expect(canvas.getByRole("gridcell", { name: "Priya Nandakumar" })).toHaveFocus();
    await userEvent.click(canvas.getByRole("button", { name: "After the table" }));
    await userEvent.tab({ shift: true });
    await expect(canvas.getByRole("gridcell", { name: "Priya Nandakumar" })).toHaveFocus();
    await expect(stops()).toBe(1);
  },
};

/** Removing the focused row, or filtering it away, never leaves the table without a stop. */
export const RowsGoAway: Story = {
  globals: desktop,
  render: () => frame(<Households />),
  play: async ({ canvas }) => {
    // Remove the last household: the stop and focus move to the nearest cell left.
    await userEvent.click(canvas.getByRole("button", { name: "Remove 8 Cedar Court" }));
    await userEvent.click(await screen.findByRole("button", { name: "Remove" }));
    await waitFor(() => expect(canvas.queryByRole("link", { name: "8 Cedar Court" })).toBeNull());
    await waitFor(() => expect(grid().contains(document.activeElement)).toBe(true));
    await expect(stops()).toBe(1);
    // Filter away every row with no balance, including the one with the stop.
    await userEvent.click(canvas.getByRole("gridcell", { name: "Rafael Duarte" }));
    await userEvent.click(canvas.getByRole("button", { name: "Only balances due" }));
    await expect(canvas.queryByRole("gridcell", { name: "Rafael Duarte" })).toBeNull();
    await expect(stops()).toBe(1);
    // Focus is on the filter, above the table: one Tab enters it.
    await userEvent.tab();
    await expect(grid().contains(document.activeElement)).toBe(true);
    // Collapse both streets: the bars and the add row are left, and still one stop.
    await userEvent.click(canvas.getByRole("button", { name: /^Birch Lane/ }));
    await userEvent.click(canvas.getByRole("button", { name: /^Cedar Court/ }));
    await expect(stops()).toBe(1);
  },
};

/** A field in a cell keeps its keys while you type: the arrows move the caret, not the stop. */
export const FieldKeepsItsKeys: Story = {
  globals: desktop,
  render: () => {
    function Notes() {
      const [notes, setNotes] = useState<Record<string, string>>({
        "12 Birch Lane": "Gate code on file",
        "14 Birch Lane": "Dog in the yard",
      });
      return (
        <Register aria-label="Notes" rowCount={3} colCount={2} className="w-[520px]">
          <RegisterHeader>
            <RegisterRow row={0}>
              <RegisterColumnHeader col={0}>Property</RegisterColumnHeader>
              <RegisterColumnHeader col={1}>Note</RegisterColumnHeader>
            </RegisterRow>
          </RegisterHeader>
          <RegisterBody>
            {Object.entries(notes).map(([address, note], i) => (
              <RegisterRow key={address} row={i + 1}>
                <RegisterCell row={i + 1} col={0}>
                  {address}
                </RegisterCell>
                <RegisterCell row={i + 1} col={1} control className="px-1">
                  <Input
                    aria-label={`Note for ${address}`}
                    value={note}
                    onChange={(e) => setNotes((n) => ({ ...n, [address]: e.target.value }))}
                  />
                </RegisterCell>
              </RegisterRow>
            ))}
          </RegisterBody>
        </Register>
      );
    }
    return frame(<Notes />);
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("gridcell", { name: "12 Birch Lane" }));
    await userEvent.keyboard("{ArrowRight}");
    const field = canvas.getByRole("textbox", { name: "Note for 12 Birch Lane" });
    await expect(field).toHaveFocus();
    await userEvent.keyboard("{End}{ArrowLeft}{ArrowLeft}x");
    await expect(field).toHaveValue("Gate code on fixle");
    await expect(field).toHaveFocus();
    // Escape leaves the field for its cell, keeping the value; the arrows move on from there (AVE-80).
    await userEvent.keyboard("{Escape}");
    const cell = field.closest<HTMLElement>("[role=gridcell]")!;
    await expect(cell).toHaveFocus();
    await expect(field).toHaveValue("Gate code on fixle");
    await userEvent.keyboard("{ArrowDown}");
    const next = canvas.getByRole("textbox", { name: "Note for 14 Birch Lane" });
    await expect(next).toHaveFocus();
    await userEvent.keyboard("{Escape}{ArrowUp}");
    await expect(field).toHaveFocus();
    // Enter or F2 on the cell goes back into its field.
    await userEvent.keyboard("{Escape}{Enter}");
    await expect(field).toHaveFocus();
    await userEvent.keyboard("{Escape}{F2}");
    await expect(field).toHaveFocus();
    // Still one Tab stop for the table.
    await expect(canvas.getByRole("grid", { name: "Notes" }).querySelectorAll('[tabindex="0"]')).toHaveLength(1);
  },
};

const owners = [
  { value: "p1", label: "Ada Okafor" },
  { value: "p2", label: "Bram Hollis" },
];

/** A combobox in a cell: the first Escape closes its list, the second goes to the cell (AVE-80). */
export const ComboboxInCell: Story = {
  globals: desktop,
  render: () => {
    function Owners() {
      const [owner, setOwner] = useState("p1");
      return (
        <Register aria-label="Owners" rowCount={2} colCount={2} className="w-[520px]">
          <RegisterHeader>
            <RegisterRow row={0}>
              <RegisterColumnHeader col={0}>Property</RegisterColumnHeader>
              <RegisterColumnHeader col={1}>Owner</RegisterColumnHeader>
            </RegisterRow>
          </RegisterHeader>
          <RegisterBody>
            <RegisterRow row={1}>
              <RegisterCell row={1} col={0}>
                12 Birch Lane
              </RegisterCell>
              <RegisterCell row={1} col={1} control className="px-1">
                <Combobox
                  aria-label="Owner of 12 Birch Lane"
                  presentation="popover"
                  options={owners}
                  value={owner}
                  onValueChange={setOwner}
                />
              </RegisterCell>
            </RegisterRow>
          </RegisterBody>
        </Register>
      );
    }
    return frame(<Owners />);
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("gridcell", { name: "12 Birch Lane" }));
    await userEvent.keyboard("{ArrowRight}");
    const field = canvas.getByRole("combobox", { name: "Owner of 12 Birch Lane" });
    await expect(field).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await screen.findByRole("listbox");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    await expect(field).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(field.closest("[role=gridcell]")).toHaveFocus();
    await expect(field).toHaveValue("Ada Okafor");
    await userEvent.keyboard("{ArrowLeft}");
    await expect(canvas.getByRole("gridcell", { name: "12 Birch Lane" })).toHaveFocus();
  },
};

/** Row heights on AVE-2's grid, and the focus ring drawn inside the cell so the row keeps its height. */
export const Compact: Story = {
  globals: desktop,
  render: () =>
    frame(
      <div className="flex flex-col gap-section">
        <Households density="compact" />
      </div>,
    ),
  play: async ({ canvas }) => {
    const cell = canvas.getByRole("gridcell", { name: "Ada Okafor" });
    const header = canvas.getByRole("columnheader", { name: /Neighbor/ });
    // 36px with a mouse; a touch screen keeps 44 so each control's tap fits its row (AVE-22).
    const row = window.matchMedia("(pointer: coarse)").matches ? 44 : 36;
    await expect(Math.round(cell.getBoundingClientRect().height)).toBe(row);
    await expect(Math.round(header.getBoundingClientRect().height)).toBe(row);
    const before = cell.getBoundingClientRect().height;
    await userEvent.click(cell);
    await userEvent.keyboard("{ArrowRight}{ArrowLeft}");
    await expect(cell).toHaveFocus();
    await expect(getComputedStyle(cell).outlineWidth).toBe("2px");
    await expect(getComputedStyle(cell).outlineOffset).toBe("-2px");
    await expect(cell.getBoundingClientRect().height).toBe(before);
  },
};

/** Normal (48) and comfortable (52) rows. */
export const NormalAndComfortable: Story = {
  globals: wide,
  render: () =>
    frame(
      <div className="flex flex-col gap-section">
        <Households />
        <Households density="comfortable" />
      </div>,
    ),
  play: async ({ canvas }) => {
    const [normal, comfortable] = canvas.getAllByRole("gridcell", { name: "Ada Okafor" });
    await expect(Math.round(normal!.getBoundingClientRect().height)).toBe(48);
    await expect(Math.round(comfortable!.getBoundingClientRect().height)).toBe(52);
  },
};
