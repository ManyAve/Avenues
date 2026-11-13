import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { Button } from "#avenue/components/button";
import { SearchInput } from "#avenue/components/search-input";

const meta = {
  title: "Components/SearchInput",
  component: SearchInput,
  args: { placeholder: "Search households or people…", "aria-label": "Search" },
} satisfies Meta<typeof SearchInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole("searchbox", { name: "Search" });
    // 32px with a mouse; a phone grows the field to 44px (AVE-22).
    await expect(input.getBoundingClientRect().height).toBe(matchMedia("(pointer: coarse)").matches ? 44 : 32);
    await userEvent.type(input, "Maple");
    await expect(input).toHaveValue("Maple");
  },
};

/** The hint's key really works: "/" from anywhere outside a text field focuses the search. */
export const WithShortcut: Story = {
  tags: ["agent"],
  args: { kbd: "/" },
  render: (args) => (
    <div className="flex flex-col items-start gap-group">
      <Button variant="outline">Add household</Button>
      <SearchInput {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("searchbox", { name: "Search" });
    await expect(input).toHaveAttribute("aria-keyshortcuts", "/");
    // The key hint is for a keyboard: shown with a mouse, hidden on a touch screen.
    if (matchMedia("(pointer: coarse)").matches) await expect(canvas.getByText("/")).not.toBeVisible();
    else await expect(canvas.getByText("/")).toBeVisible();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Add household" })).toHaveFocus();
    await userEvent.keyboard("/");
    await expect(input).toHaveFocus();
    // Typed inside the field, "/" is just text.
    await userEvent.keyboard("12/B");
    await expect(input).toHaveValue("12/B");
  },
};

/** The toolbar look: tinted fill, light border, the md control corner (AVE-2). */
export const Filled: Story = {
  args: { kbd: "/", filled: true },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("searchbox", { name: "Search" });
    await expect(getComputedStyle(input).borderTopLeftRadius).toBe("10px");
  },
};
