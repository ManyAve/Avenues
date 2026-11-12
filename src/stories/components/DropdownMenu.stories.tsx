import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronDownIcon, MailIcon, PrinterIcon, TrashIcon } from "lucide-react";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "#avenue/components/dropdown-menu";

const meta = {
  title: "Components/Dropdown menu",
  component: DropdownMenu,
  decorators: [(Story) => <div className="flex min-h-96 justify-center p-inset">{Story()}</div>],
} satisfies Meta<typeof DropdownMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

function Menu({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <DropdownMenu defaultOpen={defaultOpen ?? false}>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Actions
        <ChevronDownIcon aria-hidden data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Household</DropdownMenuLabel>
          <DropdownMenuItem>
            <MailIcon aria-hidden />
            Email owner
            <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <PrinterIcon aria-hidden />
            Print statement
          </DropdownMenuItem>
          <DropdownMenuItem disabled reason="Only a board admin can send a live notice.">
            Send live notice
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Move to street</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Larkspur Lane</DropdownMenuItem>
              <DropdownMenuItem>Juniper Court</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Show</DropdownMenuLabel>
          <DropdownMenuCheckboxItem value="archived" defaultChecked>Archived households</DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Group by</DropdownMenuLabel>
          <DropdownMenuRadioGroup defaultValue="street">
            <DropdownMenuRadioItem value="street">Street</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="status">Dues status</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <TrashIcon aria-hidden />
          Remove household
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Open: labels, icons, a shortcut, a disabled item with its reason, a submenu, checkbox and radio items, destructive. */
export const Open: Story = {
  render: () => <Menu defaultOpen />,
  play: async () => {
    await expect(await screen.findByRole("menu")).toBeVisible();
    const disabled = screen.getByRole("menuitem", { name: /Send live notice/ });
    await expect(disabled).toHaveAttribute("aria-disabled", "true");
    await expect(disabled).toHaveAccessibleDescription("Only a board admin can send a live notice.");
  },
};

/** Enter opens with the first item highlighted; arrows move; typing jumps; Esc closes and returns focus. */
export const Keyboard: Story = {
  tags: ["agent"],
  render: () => <Menu />,
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
  render: () => <Menu />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Actions" }));
    const menu = await screen.findByRole("menu");
    await waitFor(() => expect(menu.contains(document.activeElement)).toBe(true));
    await expect(menu.querySelector("[data-highlighted]")).toBeNull();
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(menu.querySelector("[data-highlighted]")).not.toBeNull());
  },
};
