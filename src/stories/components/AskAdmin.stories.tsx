import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen } from "storybook/test";
import { AskAdmin } from "#avenue/components/ask-admin";
import { Button } from "#avenue/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#avenue/components/dialog";
import { Switch } from "#avenue/components/switch";
import { Rows } from "./story-kit";

const meta = {
  title: "Components/Ask admin",
  component: AskAdmin,
  args: { children: "Ask a board admin to change dues settings." },
} satisfies Meta<typeof AskAdmin>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Inline, under the controls it explains. The controls point their description at it, so the reason is read with them. */
export const Inline: Story = {
  render: (args) => (
    <Rows>
      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-compact">
          <Switch id="reminders" disabled defaultChecked aria-describedby="automations-reason" />
          <label htmlFor="reminders">Send dues reminders</label>
        </span>
        <AskAdmin id="automations-reason" {...args}>
          Ask a board admin to turn automations on or off.
        </AskAdmin>
      </div>
    </Rows>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("switch")).toHaveAccessibleDescription(
      "Ask a board admin to turn automations on or off.",
    );
  },
};

/**
 * In a dialog footer: on a phone it sits under the buttons; from 640px it takes its own full-width line above
 * them, aligned to the end. The Save button points its description at it.
 */
export const InADialogFooter: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <Dialog defaultOpen>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set the 2026 assessment</DialogTitle>
          <DialogDescription>Four households at Maple Court are billed $240.00 each, due March 1.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:flex-wrap sm:items-center">
          <AskAdmin footer id="assessment-reason" {...args}>
            Ask a board admin to set the assessment and due date.
          </AskAdmin>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button disabled focusableWhenDisabled aria-describedby="assessment-reason">
            Set assessment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async () => {
    const save = await screen.findByRole("button", { name: "Set assessment" });
    await expect(save).toHaveAccessibleDescription("Ask a board admin to set the assessment and due date.");
  },
};
