import type { Meta, StoryObj } from "@storybook/react-vite";
import { Settings2Icon } from "lucide-react";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Field, FieldLabel } from "#avenue/components/field";
import { Input } from "#avenue/components/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "#avenue/components/popover";

const meta = {
  title: "Components/Popover",
  component: Popover,
  decorators: [(Story) => <div className="flex min-h-80 justify-center p-inset">{Story()}</div>],
} satisfies Meta<typeof Popover>;
export default meta;
type Story = StoryObj<typeof meta>;

function DisplayOptions({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <Popover defaultOpen={defaultOpen ?? false}>
      <PopoverTrigger render={<Button variant="outline" />}>
        <Settings2Icon aria-hidden data-icon="inline-start" />
        Display
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Display options</PopoverTitle>
          <PopoverDescription>Choose what the register shows.</PopoverDescription>
        </PopoverHeader>
        <Field>
          <FieldLabel>Rows per page</FieldLabel>
          <Input size="sm" defaultValue="50" inputMode="numeric" />
        </Field>
      </PopoverContent>
    </Popover>
  );
}

/** Open: 10px corner, 16px inset, 12px between blocks. */
export const Open: Story = {
  render: () => <DisplayOptions defaultOpen />,
  play: async () => {
    // The popup fades in from opacity 0 (data-starting-style), so wait for it rather than check once.
    await waitFor(async () => expect(await screen.findByRole("dialog", { name: "Display options" })).toBeVisible());
  },
};

/** Enter opens it and focus moves inside; Esc closes it and focus returns to the trigger. */
export const Keyboard: Story = {
  tags: ["agent"],
  render: () => <DisplayOptions />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Display" });
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    const popup = await screen.findByRole("dialog", { name: "Display options" });
    await waitFor(() => expect(popup.contains(document.activeElement)).toBe(true));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};

/** The popup's distance from each edge of the window, in pixels: negative when it runs off. */
function edges(popup: Element) {
  const r = popup.getBoundingClientRect();
  const w = document.documentElement.clientWidth;
  return { left: r.left, right: w - r.right, width: r.width };
}

/**
 * A popover asked to be 320px wide (`w-80`) on a 320px phone, from a trigger at the right edge (AVE-112). It stays
 * on screen with an 8px margin each side, and its text wraps instead of being cut off.
 */
export const WiderThanAPhone: Story = {
  globals: { viewport: { value: "small-phone", isRotated: false } },
  decorators: [(Story) => <div className="flex min-h-80 justify-end p-inset">{Story()}</div>],
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger render={<Button variant="outline" />}>Bounced</PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <PopoverHeader>
          <PopoverTitle>Delivery bounced</PopoverTitle>
          <PopoverDescription>
            Check this address before sending again: the mail server for juniper.example said the mailbox is full.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
  play: async () => {
    const popup = await screen.findByRole("dialog", { name: "Delivery bounced" });
    await waitFor(() => expect(popup).toBeVisible());
    const { left, right, width } = edges(popup);
    await expect(left).toBeGreaterThanOrEqual(8);
    await expect(right).toBeGreaterThanOrEqual(8);
    // 304px: the 320px it asked for, capped to the window less ui-sdk's 8px collision padding each side.
    await expect(width).toBeLessThanOrEqual(304);
    await expect(popup.scrollWidth).toBeLessThanOrEqual(popup.clientWidth);
  },
};
