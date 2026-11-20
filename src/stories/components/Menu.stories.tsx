import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ChevronDownIcon, MailIcon, PrinterIcon, TrashIcon } from "lucide-react";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#avenue/components/table";
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuContextTrigger,
  MenuGroup,
  MenuItem,
  MenuGroupLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "#avenue/components/menu";

const meta = {
  title: "Components/Menu",
  component: Menu,
  decorators: [(Story) => <div className="flex min-h-96 justify-center p-inset">{Story()}</div>],
} satisfies Meta<typeof Menu>;
export default meta;
type Story = StoryObj<typeof meta>;

function HouseholdMenu({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <Menu defaultOpen={defaultOpen ?? false}>
      <MenuTrigger render={<Button variant="outline" />}>
        Actions
        <ChevronDownIcon aria-hidden data-icon="inline-end" />
      </MenuTrigger>
      <MenuContent className="w-64">
        <MenuGroup>
          <MenuGroupLabel>Household</MenuGroupLabel>
          <MenuItem>
            <MailIcon aria-hidden />
            Email owner
            <MenuShortcut>⌘E</MenuShortcut>
          </MenuItem>
          <MenuItem>
            <PrinterIcon aria-hidden />
            Print statement
          </MenuItem>
          <MenuItem disabled disabledReason="Only a board admin can send a live notice.">
            Send live notice
          </MenuItem>
          <MenuSub>
            <MenuSubTrigger>Move to street</MenuSubTrigger>
            <MenuSubContent>
              <MenuItem>Larkspur Lane</MenuItem>
              <MenuItem>Juniper Court</MenuItem>
            </MenuSubContent>
          </MenuSub>
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>Show</MenuGroupLabel>
          <MenuCheckboxItem value="archived" defaultChecked>Archived households</MenuCheckboxItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>Group by</MenuGroupLabel>
          <MenuRadioGroup defaultValue="street">
            <MenuRadioItem value="street">Street</MenuRadioItem>
            <MenuRadioItem value="status">Dues status</MenuRadioItem>
          </MenuRadioGroup>
        </MenuGroup>
        <MenuSeparator />
        <MenuItem destructive>
          <TrashIcon aria-hidden />
          Remove household
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

/** Open: labels, icons, a shortcut, a disabled item with its reason, a submenu, checkbox and radio items, destructive. */
export const Open: Story = {
  render: () => <HouseholdMenu defaultOpen />,
  play: async () => {
    // The popup fades in from opacity 0 (data-starting-style), so wait for it rather than check once.
    await waitFor(async () => expect(await screen.findByRole("menu")).toBeVisible());
    const disabled = screen.getByRole("menuitem", { name: /Send live notice/ });
    await expect(disabled).toHaveAttribute("aria-disabled", "true");
    await expect(disabled).toHaveAccessibleDescription("Only a board admin can send a live notice.");
    // `destructive` is ui-sdk's prop and sets ui-sdk's attribute, which the item's look reads (AVE-151).
    await expect(screen.getByRole("menuitem", { name: /Remove household/ })).toHaveAttribute("data-destructive");
    await expect(screen.getByRole("menuitem", { name: /Print statement/ })).not.toHaveAttribute("data-destructive");
    // Placed on whole device pixels (AVE-21), so its text is as sharp as the page's on a 1x screen. The trigger is
    // centred and 92.6px wide here, so an unrounded menu lands at a fraction of a pixel. Since beta.13 ui-sdk rounds
    // the place itself (in CSS, with anchor positioning where the browser has it, so the inline left and top are no
    // longer numbers): measure where the menu lands, not its style.
    const box = screen.getByRole("menu").getBoundingClientRect();
    for (const value of [box.left, box.top].map((side) => side * devicePixelRatio)) {
      await expect(Math.abs(value - Math.round(value))).toBeLessThan(0.01);
    }
  },
};

/** Enter opens with the first item highlighted; arrows move; typing jumps; Esc closes and returns focus. */
export const Keyboard: Story = {
  tags: ["agent"],
  render: () => <HouseholdMenu />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Actions" });
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("menu");
    await waitFor(() => expect(screen.getByRole("menuitem", { name: /Email owner/ })).toHaveFocus());
    await userEvent.keyboard("{ArrowDown}");
    await expect(screen.getByRole("menuitem", { name: /Print statement/ })).toHaveFocus();
    await userEvent.keyboard("r");
    await waitFor(() => expect(screen.getByRole("menuitem", { name: /Remove household/ })).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};

/** A click opens the menu with focus inside it, and no item looks chosen until the pointer or a key highlights one. */
export const OpenByClick: Story = {
  render: () => <HouseholdMenu />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Actions" }));
    const menu = await screen.findByRole("menu");
    await waitFor(() => expect(menu.contains(document.activeElement)).toBe(true));
    await expect(menu.querySelector("[data-highlighted]")).toBeNull();
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(menu.querySelector("[data-highlighted]")).not.toBeNull());
  },
};

const printed = fn();

function ActionMenu() {
  const [log, setLog] = useState<string[]>([]);
  const record = (what: string) => (event: Event) => {
    printed(what, event.type);
    setLog((entries) => [...entries, what]);
  };
  return (
    <div className="flex flex-col items-center gap-group">
      <Menu>
        <MenuTrigger render={<Button variant="outline" />}>
          Statement
          <ChevronDownIcon aria-hidden data-icon="inline-end" />
        </MenuTrigger>
        <MenuContent className="w-56">
          <MenuItem onClick={record("Printed statement")}>
            <PrinterIcon aria-hidden />
            Print statement
          </MenuItem>
          <MenuItem onSelect={record("Emailed owner")}>
            <MailIcon aria-hidden />
            Email owner
          </MenuItem>
        </MenuContent>
      </Menu>
      <output className="block text-meta text-muted-foreground">
        {log.length > 0 ? log.join(", ") : "No action yet"}
      </output>
    </div>
  );
}

/**
 * An item's action runs from a click, Enter and Space, whether it is wired to `onSelect` or to `onClick` (AVE-111):
 * ui-sdk fires its own `onClick` for a pointer only, so Avenue routes `onClick` through `onSelect`, once per choice.
 */
export const ActionFromKeyboard: Story = {
  render: () => <ActionMenu />,
  beforeEach: () => {
    printed.mockClear();
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Statement" });
    const status = canvas.getByRole("status");
    // Opens the menu with `key` (on the first item), moves down `steps` items, and chooses with the same key.
    const choose = async (key: string, steps: number) => {
      await userEvent.keyboard(key);
      await screen.findByRole("menu");
      await waitFor(() => expect(screen.getByRole("menuitem", { name: /Print statement/ })).toHaveFocus());
      for (let step = 0; step < steps; step++) await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard(key);
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
      await expect(trigger).toHaveFocus();
    };

    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await choose("{Enter}", 0);
    await expect(status).toHaveTextContent("Printed statement");
    await choose(" ", 0);
    await choose("{Enter}", 1);
    await expect(status).toHaveTextContent("Printed statement, Printed statement, Emailed owner");

    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole("menuitem", { name: /Print statement/ }));
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    // Once per choice: a pointer click runs onClick through onSelect only, never twice.
    await expect(printed).toHaveBeenCalledTimes(4);
    await expect(status).toHaveTextContent("Printed statement, Printed statement, Emailed owner, Printed statement");
  },
};

/**
 * A menu asked to be 384px wide (`w-96`) on a 320px phone, from a trigger at the right edge (AVE-112): it stays on
 * screen with an 8px margin each side, and a long item wraps instead of running off the edge.
 */
export const WiderThanAPhone: Story = {
  globals: { viewport: { value: "small-phone", isRotated: false } },
  decorators: [(Story) => <div className="flex min-h-96 justify-end p-inset">{Story()}</div>],
  render: () => (
    <Menu defaultOpen>
      <MenuTrigger render={<Button variant="outline" />}>
        Member
        <ChevronDownIcon aria-hidden data-icon="inline-end" />
      </MenuTrigger>
      <MenuContent className="w-96" align="end">
        <MenuItem>
          <MailIcon aria-hidden />
          Resend the board invitation to the treasurer at their new address
        </MenuItem>
        <MenuItem destructive>
          <TrashIcon aria-hidden />
          Remove from the board
        </MenuItem>
      </MenuContent>
    </Menu>
  ),
  play: async () => {
    const menu = await screen.findByRole("menu");
    await waitFor(() => expect(menu).toBeVisible());
    const r = menu.getBoundingClientRect();
    await expect(r.left).toBeGreaterThanOrEqual(8);
    await expect(document.documentElement.clientWidth - r.right).toBeGreaterThanOrEqual(8);
    await expect(menu.scrollWidth).toBeLessThanOrEqual(menu.clientWidth);
  },
};

type Household = { address: string; owner: string; dues: string };

const households: Household[] = [
  { address: "14 Larkspur Lane", owner: "R. Okafor", dues: "Paid" },
  { address: "3 Juniper Court", owner: "M. Lindqvist", dues: "2 months behind" },
  { address: "27 Larkspur Lane", owner: "T. Ferreira", dues: "Paid" },
];

const chosen = fn();

/**
 * Shift+F10 as Chromium sends it: the key, then a `contextmenu` event at the focused element with no pointer behind it
 * (`pointerType` "", button 0, placed at the element). ui-sdk opens on that event, and user-event's synthetic key
 * press never makes the browser send it, so the story sends what the browser would.
 */
async function shiftF10() {
  await userEvent.keyboard("{Shift>}[F10]");
  const target = document.activeElement as HTMLElement;
  const r = target.getBoundingClientRect();
  target.dispatchEvent(
    new PointerEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 0,
      buttons: 0,
      pointerType: "",
      shiftKey: true,
      clientX: r.left,
      clientY: r.bottom,
    }),
  );
  await userEvent.keyboard("{/Shift}");
}

function HouseholdRow({ household, onDone }: { household: Household; onDone: (what: string) => void }) {
  const act = (what: string) => () => onDone(`${what}: ${household.address}`);
  return (
    <li className="first:*:rounded-t-lg last:*:rounded-b-lg">
      <Menu onAction={(action) => chosen(action)}>
        <MenuContextTrigger
          tabIndex={0}
          aria-label={`${household.address}, ${household.owner}, dues ${household.dues.toLowerCase()}`}
          className="flex items-center justify-between gap-2 px-3 py-2 text-control"
        >
          <span>
            {household.address}
            <span className="block text-meta text-muted-foreground">{household.owner}</span>
          </span>
          <span className="text-meta text-muted-foreground">{household.dues}</span>
        </MenuContextTrigger>
        <MenuContent>
          <MenuGroup>
            <MenuGroupLabel>{household.address}</MenuGroupLabel>
            <MenuItem value="email" onSelect={act("Emailed owner")}>
              <MailIcon aria-hidden />
              Email owner
            </MenuItem>
            <MenuItem value="print" onSelect={act("Printed statement")}>
              <PrinterIcon aria-hidden />
              Print statement
            </MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuItem
            value="remove"
            destructive
            data-agent-confirm="Removes the household from the directory"
            onSelect={act("Removed household")}
          >
            <TrashIcon aria-hidden />
            Remove household
          </MenuItem>
        </MenuContent>
      </Menu>
    </li>
  );
}

function HouseholdRows() {
  const [log, setLog] = useState("No action yet");
  return (
    <div className="flex w-full max-w-md flex-col gap-group">
      <ul aria-label="Households" className="divide-y rounded-lg border">
        {households.map((household) => (
          <HouseholdRow key={household.address} household={household} onDone={setLog} />
        ))}
      </ul>
      <output className="block text-meta text-muted-foreground">{log}</output>
    </div>
  );
}

/**
 * A context menu (AVE-153): each row of a list has its own Menu, opened at the pointer by right-click, by a long press
 * on touch, or from the keyboard with Shift+F10 on a row that has focus. The menu names the row it acts on, and the
 * row keeps a muted fill while its menu is open. One Menu per row, not one shared through `payload`, because a
 * Menu takes its agent name from its trigger: the row's own name. Escape or a choice returns focus
 * to the row. It stays a popover on phones. Remove household carries `data-agent-confirm`.
 */
export const ContextMenu: Story = {
  tags: ["agent"],
  render: () => <HouseholdRows />,
  beforeEach: () => {
    chosen.mockClear();
  },
  play: async ({ canvas }) => {
    const row = (address: string) => canvas.getByLabelText(new RegExp(address));
    const status = canvas.getByRole("status");
    const content = () => document.querySelector<HTMLElement>("[data-slot=menu-content]");
    const closed = (at: string) => waitFor(() => expect(screen.queryByRole("menu"), at).toBeNull());

    // Keyboard: Tab to the second row, Shift+F10 opens its menu on the first item; choose by arrow and Enter.
    await userEvent.tab();
    await userEvent.tab();
    const juniper = row("3 Juniper Court");
    await expect(juniper).toHaveFocus();
    await shiftF10();
    const menu = await screen.findByRole("menu");
    await expect(menu).toHaveTextContent("3 Juniper Court");
    await expect(juniper).toHaveAttribute("data-open");
    await waitFor(() => expect(screen.getByRole("menuitem", { name: /Email owner/ })).toHaveFocus());
    await userEvent.keyboard("{ArrowDown}");
    await expect(screen.getByRole("menuitem", { name: /Print statement/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await closed("after Enter");
    await expect(juniper).toHaveFocus();
    await expect(chosen).toHaveBeenLastCalledWith("print");
    await expect(status).toHaveTextContent("Printed statement: 3 Juniper Court");

    // Escape closes and returns focus to the row too.
    await shiftF10();
    await screen.findByRole("menu");
    await userEvent.keyboard("{Escape}");
    await closed("after Escape");
    await expect(juniper).toHaveFocus();

    // Touch: a long press opens it, and it stays a popover, never a sheet, even on a phone.
    const larkspur = row("27 Larkspur Lane");
    await userEvent.pointer({ keys: "[TouchA>]", target: larkspur });
    await waitFor(() => expect(screen.getByRole("menu")).toHaveTextContent("27 Larkspur Lane"), { timeout: 2000 });
    await userEvent.pointer({ keys: "[/TouchA]", target: larkspur });
    await expect(content()).toHaveAttribute("data-presentation", "popover");
    await userEvent.click(screen.getByRole("menuitem", { name: /Email owner/ }));
    await closed("after a long press");
    await expect(status).toHaveTextContent("Emailed owner: 27 Larkspur Lane");

    // Right-click opens it at the pointer, naming that row; the destructive action asks an agent to confirm.
    const first = row("14 Larkspur Lane");
    const r = first.getBoundingClientRect();
    const at = { clientX: Math.round(r.left + r.width / 3), clientY: Math.round(r.top + r.height / 2) };
    await userEvent.pointer({ keys: "[MouseRight]", target: first, coords: at });
    await waitFor(async () => expect(await screen.findByRole("menu")).toBeVisible());
    const opened = screen.getByRole("menu");
    await expect(first).toHaveAttribute("data-open");
    // Named by its row, as a trigger names its menu, so an agent can find it open or closed.
    await expect(opened).toHaveAccessibleName("14 Larkspur Lane, R. Okafor, dues paid");
    await expect(opened).toHaveTextContent("14 Larkspur Lane");
    // At the pointer, and as wide as its longest item: a point has no width to match, so every item stays on one line.
    await waitFor(async () => expect(Math.abs(opened.getBoundingClientRect().left - at.clientX)).toBeLessThanOrEqual(1));
    await expect(opened.getBoundingClientRect().width).toBeGreaterThan(128);
    for (const item of screen.getAllByRole("menuitem")) {
      await expect(item.getBoundingClientRect().height).toBeLessThan(48);
    }
    await expect(screen.getByRole("menuitem", { name: /Remove household/ })).toHaveAttribute(
      "data-agent-confirm",
      "Removes the household from the directory",
    );
  },
};

function HouseholdTable() {
  const [log, setLog] = useState("No action yet");
  return (
    <div className="flex w-full max-w-lg flex-col gap-group">
      <Table aria-label="Households">
        <TableHeader>
          <TableRow>
            <TableHead>Address</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Dues</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {households.map((household) => (
            <Menu key={household.address}>
              <MenuContextTrigger
                tabIndex={0}
                aria-label={`${household.address}, ${household.owner}, dues ${household.dues.toLowerCase()}`}
                render={<TableRow />}
              >
                <TableCell>{household.address}</TableCell>
                <TableCell>{household.owner}</TableCell>
                <TableCell>{household.dues}</TableCell>
              </MenuContextTrigger>
              <MenuContent container={document.body}>
                <MenuGroup>
                  <MenuGroupLabel>{household.address}</MenuGroupLabel>
                  <MenuItem onSelect={() => setLog(`Emailed owner: ${household.address}`)}>
                    <MailIcon aria-hidden />
                    Email owner
                  </MenuItem>
                  <MenuItem onSelect={() => setLog(`Printed statement: ${household.address}`)}>
                    <PrinterIcon aria-hidden />
                    Print statement
                  </MenuItem>
                </MenuGroup>
                <MenuSeparator />
                <MenuItem
                  destructive
                  data-agent-confirm="Removes the household from the directory"
                  onSelect={() => setLog(`Removed household: ${household.address}`)}
                >
                  <TrashIcon aria-hidden />
                  Remove household
                </MenuItem>
              </MenuContent>
            </Menu>
          ))}
        </TableBody>
      </Table>
      <output className="block text-meta text-muted-foreground">{log}</output>
    </div>
  );
}

/**
 * Row actions in a table, as Neighbors' data tables need (AVE-153): the whole row is the area (`render={<TableRow />}`),
 * and its menu goes into `document.body` (`container`), since a `tbody` takes only rows. Kept out of the row, a
 * right-click inside the open menu doesn't move it; inside the row, it would open the menu again at that point.
 */
export const ContextMenuInATable: Story = {
  tags: ["agent"],
  render: () => <HouseholdTable />,
  play: async ({ canvas }) => {
    const row = (address: string) => canvas.getByRole("row", { name: new RegExp(address) });
    const status = canvas.getByRole("status");
    const closed = () => waitFor(() => expect(screen.queryByRole("menu")).toBeNull());

    await userEvent.tab();
    await userEvent.tab();
    const juniper = row("3 Juniper Court");
    await expect(juniper).toHaveFocus();
    await shiftF10();
    await waitFor(() => expect(screen.getByRole("menuitem", { name: /Email owner/ })).toHaveFocus());
    await expect(screen.getByRole("menu")).toHaveAccessibleName(/3 Juniper Court/);
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await closed();
    await expect(juniper).toHaveFocus();
    await expect(status).toHaveTextContent("Printed statement: 3 Juniper Court");

    const first = row("14 Larkspur Lane");
    const r = first.getBoundingClientRect();
    const at = { clientX: r.left + 40, clientY: r.top + r.height / 2 };
    await userEvent.pointer({ keys: "[MouseRight]", target: first, coords: at });
    const email = await screen.findByRole("menuitem", { name: /Email owner/ });
    await waitFor(() => expect(screen.getByRole("menu")).toBeVisible());
    const before = screen.getByRole("menu").getBoundingClientRect();
    await userEvent.pointer({ keys: "[MouseRight]", target: email });
    await expect(screen.getByRole("menu")).toHaveAccessibleName(/14 Larkspur Lane/);
    await expect(screen.getByRole("menu").getBoundingClientRect().left).toBe(before.left);
    await userEvent.click(screen.getByRole("menuitem", { name: /Email owner/ }));
    await closed();
    await expect(status).toHaveTextContent("Emailed owner: 14 Larkspur Lane");
  },
};

/**
 * The names before AVE-151, deprecated until both apps have moved off them (AVE-154): `variant="destructive"` is
 * `destructive`, `reason` is `disabledReason`. Each old-name item renders exactly as its new-name twin.
 */
export const DeprecatedNames: Story = {
  render: () => (
    <Menu defaultOpen>
      <MenuTrigger render={<Button variant="outline" />}>
        Household
        <ChevronDownIcon aria-hidden data-icon="inline-end" />
      </MenuTrigger>
      <MenuContent>
        <MenuItem disabled reason="Only a board admin can send a live notice.">
          Send live notice (old name)
        </MenuItem>
        <MenuItem disabled disabledReason="Only a board admin can send a live notice.">
          Send live notice (new name)
        </MenuItem>
        <MenuItem variant="destructive">Remove household (old name)</MenuItem>
        <MenuItem destructive>Remove household (new name)</MenuItem>
      </MenuContent>
    </Menu>
  ),
  play: async () => {
    await waitFor(async () => expect(await screen.findByRole("menu")).toBeVisible());
    const item = (name: string) => screen.getByRole("menuitem", { name: new RegExp(name) });
    await expect(item("Send live notice \\(old")).toHaveAccessibleDescription("Only a board admin can send a live notice.");
    await expect(item("Remove household \\(old")).toHaveAttribute("data-destructive");
    for (const name of ["Send live notice", "Remove household"]) {
      await expect(item(`${name} \\(old`).className).toBe(item(`${name} \\(new`).className);
    }
  },
};
