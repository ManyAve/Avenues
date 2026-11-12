import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#avenue/components/dialog";
import { Field, FieldGroup, FieldLabel } from "#avenue/components/field";
import { Input } from "#avenue/components/input";

const meta = {
  title: "Components/Dialog",
  component: Dialog,
} satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

function PaymentForm({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <Dialog defaultOpen={defaultOpen ?? false}>
      <DialogTrigger render={<Button />}>Record payment</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>14 Larkspur Lane, 2026 dues.</DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel>Amount</FieldLabel>
            <Input inputMode="decimal" defaultValue="" placeholder="0.00" />
          </Field>
          <Field>
            <FieldLabel>Check number</FieldLabel>
            <Input inputMode="numeric" />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button>Record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Open form dialog: 14px corner, 16px inset, footer strip, close button 16px from the corner on the title's line. */
export const Open: Story = {
  render: () => <PaymentForm defaultOpen />,
  play: async () => {
    const dialog = await screen.findByRole("dialog", { name: "Record payment" });
    const close = screen.getByRole("button", { name: "Close" });
    const box = dialog.getBoundingClientRect();
    const button = close.getBoundingClientRect();
    await expect(Math.round(box.right - button.right)).toBe(16);
    await expect(Math.round(button.top - box.top)).toBe(16);
    const title = screen.getByText("Record payment", { selector: "[data-slot=dialog-title]" }).getBoundingClientRect();
    await expect(Math.round(title.top + title.height / 2)).toBe(Math.round(button.top + button.height / 2));
  },
};

/** Focus goes to the first field on open and back to the trigger on close; Esc closes. */
export const FocusOnOpenAndClose: Story = {
  render: () => <PaymentForm />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Record payment" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Record payment" });
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Amount" })).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
  },
};

/** A confirmation with no fields: focus lands on Cancel, the safe choice, because it comes first. */
export const ConfirmFocusesSafeButton: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Remove household?</DialogTitle>
          <DialogDescription>14 Larkspur Lane and its payment history will be removed.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button variant="destructive">Remove</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async () => {
    await screen.findByRole("dialog", { name: "Remove household?" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
  },
};

/** A step that must finish (a payment being sent): `closeOnEscape={false}` keeps Esc from closing it. */
export const EscapeBlockedWhilePending: Story = {
  render: function Pending() {
    const [open, setOpen] = useState(true);
    return (
      <Dialog open={open} onOpenChange={setOpen} closeOnEscape={false}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Sending notices</DialogTitle>
            <DialogDescription>Mailing 42 dues notices. This takes a few seconds.</DialogDescription>
          </DialogHeader>
          <output className="text-sm">Sending 12 of 42…</output>
        </DialogContent>
      </Dialog>
    );
  },
  play: async () => {
    const dialog = await screen.findByRole("dialog", { name: "Sending notices" });
    await userEvent.keyboard("{Escape}");
    await expect(dialog).toBeInTheDocument();
  },
};
