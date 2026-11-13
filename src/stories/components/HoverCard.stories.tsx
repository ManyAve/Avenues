import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "#avenue/components/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "#avenue/components/hover-card";

const meta = {
  title: "Components/Hover card",
  component: HoverCard,
  decorators: [(Story) => <div className="flex min-h-64 justify-center p-inset">{Story()}</div>],
} satisfies Meta<typeof HoverCard>;
export default meta;
type Story = StoryObj<typeof meta>;

function Preview() {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">14 Larkspur Lane</span>
      <span className="text-muted-foreground">Robin Avery, owner since 2019</span>
      <span className="text-muted-foreground">Dues: paid for 2026</span>
    </div>
  );
}

/** Open: 10px corner and 16px inset, like a popover. */
export const Open: Story = {
  render: () => (
    <HoverCard defaultOpen>
      <HoverCardTrigger href="#household">14 Larkspur Lane</HoverCardTrigger>
      <HoverCardContent>
        <Preview />
      </HoverCardContent>
    </HoverCard>
  ),
  play: async () => {
    // The card mounts at its starting style and fades in; on a loaded machine it can still be at opacity 0 when
    // it is first found, so wait for it to be visible rather than checking once.
    const owner = await screen.findByText("Robin Avery, owner since 2019");
    await waitFor(() => expect(owner).toBeVisible());
  },
};

/**
 * The same content without hover: activating the trigger (click, tap, Enter) opens a dialog with everything the
 * preview shows, as the register's cells do. Keyboard, touch and screen-reader users reach it this way.
 */
export const SameContentWithoutHover: Story = {
  tags: ["agent"],
  render: function WithoutHover() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <HoverCard>
          <HoverCardTrigger
            // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- labelled by the trigger's children
            render={<button type="button" className="underline underline-offset-3" />}
            onClick={() => setOpen(true)}
          >
            14 Larkspur Lane
          </HoverCardTrigger>
          <HoverCardContent>
            <Preview />
          </HoverCardContent>
        </HoverCard>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Household</DialogTitle>
              <DialogDescription>Fictional data for the story.</DialogDescription>
            </DialogHeader>
            <Preview />
          </DialogContent>
        </Dialog>
      </>
    );
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "14 Larkspur Lane" });
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "Household" });
    await expect(dialog).toHaveTextContent("Robin Avery, owner since 2019");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};
