import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ChevronDownIcon, MailIcon, PrinterIcon, TrashIcon } from "lucide-react";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
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
