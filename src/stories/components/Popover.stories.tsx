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
    await expect(await screen.findByRole("dialog", { name: "Display options" })).toBeVisible();
  },
};

/** Enter opens it and focus moves inside; Esc closes it and focus returns to the trigger. */
export const Keyboard: Story = {
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
