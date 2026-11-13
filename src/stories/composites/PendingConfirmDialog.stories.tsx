import type { Meta, StoryObj } from "@storybook/react-vite";
import { act, useState } from "react";
import { Button } from "#avenue/components/button";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import {
  PendingConfirmDialog,
  type PendingConfirmPhase,
  type PendingConfirmRecovery,
} from "#avenue/components/pending-confirm-dialog";

// AVE-9, composite 2. A confirm for a step that sends something or moves money, with UX.md's "couldn't confirm"
// recovery. All names and addresses are fictional.

const meta = { title: "Composites/Pending confirm dialog" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const retry: PendingConfirmRecovery = {
  safeToRetry: true,
  message: "We couldn't confirm that the announcement went out. It's safe to try again; it won't send twice.",
};

function MarkAsMailed({
  defaultOpen = true,
  phase,
  recovery = retry,
  onConfirm = () => {},
}: {
  defaultOpen?: boolean;
  phase: PendingConfirmPhase;
  recovery?: PendingConfirmRecovery;
  onConfirm?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
    <Button variant="outline" className="m-inset" onClick={() => setOpen(true)}>
      Mark as mailed…
    </Button>
    <PendingConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="Mark as mailed"
      description="Confirm that you mailed this letter to the address shown. This records it as mailed and schedules follow-up; it does not confirm delivery."
      confirmLabel="Mark as mailed"
      pendingLabel="Confirming…"
      pendingMessage="Recording mailing confirmation. Please wait."
      phase={phase}
      recovery={recovery}
      onConfirm={onConfirm}
    >
      <p className="font-medium">Courtesy letter: fence height</p>
      <p className="whitespace-pre-line">{"Dana Whitfield\n14 Larkspur Lane\nMaple Glen, OR 97000"}</p>
      <p className="text-meta text-muted-foreground">Follow-up: Dec 4, 2026</p>
    </PendingConfirmDialog>
    </>
  );
}

/** Ready: the letter and address, focus on Cancel (the safe answer). */
export const Ready: Story = {
  render: () => <MarkAsMailed phase="ready" />,
  play: async () => {
    await screen.findByRole("alertdialog", { name: "Mark as mailed" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
  },
};

let loseReply = () => {};

/**
 * The whole flow by keyboard, as a send runs and its reply is lost: Tab to Mark as mailed and press Enter; focus
 * moves to the status line and Tab and Esc can't leave it; then the outcome is unknown, the message is announced and
 * focus lands on Try again.
 */
export const KeyboardFlow: Story = {
  tags: ["pattern:alertdialog"],
  render: function Flow() {
    const [phase, setPhase] = useState<PendingConfirmPhase>("ready");
    loseReply = () => setPhase("unknown");
    return <MarkAsMailed defaultOpen={false} phase={phase} onConfirm={() => setPhase("pending")} />;
  },
  play: async ({ canvas }) => {
    const opener = canvas.getByRole("button", { name: "Mark as mailed…" });
    opener.focus();
    await userEvent.keyboard("{Enter}");
    const dialog = await screen.findByRole("alertdialog", { name: "Mark as mailed" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
    await userEvent.tab();
    await expect(screen.getByRole("button", { name: "Mark as mailed" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    const status = await screen.findByRole("status");
    await waitFor(() => expect(status).toHaveFocus());
    await expect(status).toHaveTextContent("Recording mailing confirmation. Please wait.");
    await expect(screen.getByRole("button", { name: "Confirming…" })).toHaveAttribute("aria-disabled", "true");
    await userEvent.tab();
    await expect(status).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(status).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(dialog).toBeInTheDocument();

    // The network's part: the reply never arrives.
    act(() => loseReply());
    const alert = await screen.findByRole("alert");
    await expect(alert).toHaveTextContent("We couldn't confirm that the announcement went out.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Try again" })).toHaveFocus());
    await expect(screen.getByRole("button", { name: "Close" })).toBeEnabled();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await expect(opener).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("alertdialog", { name: "Mark as mailed" });
  },
};

/** Not safe to retry: no Try again. The recovery opens the place to check, and gets focus. */
export const UnknownCheckFirst: Story = {
  render: () => (
    <MarkAsMailed
      phase="unknown"
      recovery={{
        safeToRetry: false,
        message:
          "We couldn't confirm that the mailing was recorded. Check the letter's history before trying again, so it isn't recorded twice.",
        checkLabel: "Open letter history",
        onCheck: () => {},
      }}
    />
  ),
  play: async () => {
    await screen.findByRole("alertdialog", { name: "Mark as mailed" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Open letter history" })).toHaveFocus());
    await expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    await expect(screen.getByRole("alert")).toHaveTextContent("Check the letter's history before trying again");
  },
};

/** While pending, Cancel is disabled and the confirm button shows its pending label. */
export const Pending: Story = {
  render: () => <MarkAsMailed phase="pending" />,
  play: async () => {
    await screen.findByRole("alertdialog", { name: "Mark as mailed" });
    await expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await expect(screen.getByRole("button", { name: "Confirming…" })).toBeInTheDocument();
  },
};
