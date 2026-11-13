import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
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

// AVE-9: the question a form dialog asks before dropping input, and any confirm before a step that can't be undone.
// Fictional data only.

const meta = { title: "Components/Alert dialog" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function RemoveHousehold({ onAnswer }: { onAnswer?: (answer: string) => void }) {
  return (
    <AlertDialog onOpenChange={(open, details) => !open && onAnswer?.(details.returnValue ?? "dismissed")}>
      <AlertDialogTrigger render={<Button variant="outline" />}>Remove household</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove household?</AlertDialogTitle>
          <AlertDialogDescription>14 Larkspur Lane and its payment history will be removed.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
          <AlertDialogClose value="confirm" render={<Button variant="destructive" />}>
            Remove
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Open: the Dialog's look without a close button; the answers sit on the footer strip, safe one first. */
export const Open: Story = {
  render: () => (
    <AlertDialog defaultOpen>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard changes?</AlertDialogTitle>
          <AlertDialogDescription>What you entered is not saved. Discard it, or keep editing.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>Keep editing</AlertDialogClose>
          <AlertDialogClose render={<Button variant="destructive" />}>Discard</AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
  play: async () => {
    await screen.findByRole("alertdialog", { name: "Discard changes?" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus());
  },
};

/** By keyboard: Enter opens with focus on Cancel; Esc closes and returns focus; Tab, Enter on Remove answers. */
export const Keyboard: Story = {
  tags: ["agent"],
  render: function Answer() {
    const [answer, setAnswer] = useState("");
    return (
      <div className="flex flex-col items-start gap-2 p-inset">
        <RemoveHousehold onAnswer={setAnswer} />
        <output className="text-meta text-muted-foreground">{answer}</output>
      </div>
    );
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Remove household" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const dialog = await screen.findByRole("alertdialog", { name: "Remove household?" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    await screen.findByRole("alertdialog", { name: "Remove household?" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
    await userEvent.tab();
    await expect(screen.getByRole("button", { name: "Remove" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.getByText("confirm")).toBeInTheDocument());
  },
};
