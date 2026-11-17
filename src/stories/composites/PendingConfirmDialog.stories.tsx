import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
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
  phase?: PendingConfirmPhase;
  recovery?: PendingConfirmRecovery;
  onConfirm?: () => void | PromiseLike<unknown>;
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
    // Focus is on the status line, but a status is not a control, so it draws no ring (AVE-81).
    await expect(getComputedStyle(status).outlineStyle).toBe("none");
    await expect(getComputedStyle(status).boxShadow).toBe("none");
    await expect(screen.getByRole("button", { name: "Confirming…" })).toHaveAttribute("aria-disabled", "true");
    await userEvent.tab();
    await expect(status).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(status).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(dialog).toBeInTheDocument();

    // The network's part: the reply never arrives. A plain call, not React's act(), which production builds of React
    // don't support: in the built Storybook it stopped the play here and left the dialog pending (AVE-60).
    loseReply();
    const alert = await screen.findByRole("alert");
    await expect(alert).toHaveTextContent("We couldn't confirm that the announcement went out.");
    const tryAgain = screen.getByRole("button", { name: "Try again" });
    await waitFor(() => expect(tryAgain).toHaveFocus());
    // Read again whenever Try again gets focus, not only when the alert first appears (AVE-44).
    await expect(tryAgain).toHaveAccessibleDescription(retry.message);
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
    const check = screen.getByRole("button", { name: "Open letter history" });
    await waitFor(() => expect(check).toHaveFocus());
    await expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    await expect(screen.getByRole("alert")).toHaveTextContent("Check the letter's history before trying again");
    // The reason is read again whenever the recovery button gets focus (AVE-44).
    await expect(check).toHaveAccessibleDescription(
      "We couldn't confirm that the mailing was recorded. Check the letter's history before trying again, so it isn't recorded twice.",
    );
  },
};

/**
 * While pending, Cancel is disabled and the confirm button shows its pending label. Nobody can leave a pending
 * dialog, so the caller must end it: give the call a timeout and move to "unknown" when it runs out or the reply is
 * lost (the Keyboard flow story shows that step). A dialog left pending traps the person (AVE-44).
 */
export const Pending: Story = {
  render: () => <MarkAsMailed phase="pending" />,
  play: async () => {
    await screen.findByRole("alertdialog", { name: "Mark as mailed" });
    await expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await expect(screen.getByRole("button", { name: "Confirming…" })).toBeInTheDocument();
    await expect(screen.getByRole("button", { name: "Confirming…" })).not.toHaveAccessibleDescription();
  },
};

/** A send in flight that the play settles, like the server's reply. */
let reply: { resolve: () => void; reject: (reason: unknown) => void } | undefined;
const send = () =>
  new Promise<void>((resolve, reject) => {
    reply = { resolve, reject };
  });

/**
 * AVE-150: `onConfirm` returns a Promise and the app passes no `phase`. While it runs the dialog is pending exactly as
 * with phase="pending" (focus on the status line, Esc and Cancel held); once it resolves the dialog closes, so it never
 * returns to asking about a step that is done, and focus goes back to the opener.
 */
export const PromiseResolves: Story = {
  render: () => <MarkAsMailed defaultOpen={false} onConfirm={send} />,
  play: async ({ canvas }) => {
    const opener = canvas.getByRole("button", { name: "Mark as mailed…" });
    await userEvent.click(opener);
    const dialog = await screen.findByRole("alertdialog", { name: "Mark as mailed" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    const status = await screen.findByRole("status");
    await waitFor(() => expect(status).toHaveFocus());
    await expect(status).toHaveTextContent("Recording mailing confirmation. Please wait.");
    await expect(screen.getByRole("button", { name: "Confirming…" })).toHaveAttribute("aria-disabled", "true");
    await expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await userEvent.keyboard("{Escape}");
    await expect(dialog).toBeInTheDocument();
    reply?.resolve();
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await waitFor(() => expect(opener).toHaveFocus());
  },
};

/**
 * A rejected Promise means the outcome is unknown, not that it failed: "couldn't confirm" shows with focus on Try
 * again, which runs the step again. Closing forgets it, so the dialog opens on the question next time.
 */
export const PromiseRejects: Story = {
  render: () => <MarkAsMailed defaultOpen={false} onConfirm={send} />,
  play: async ({ canvas }) => {
    const opener = canvas.getByRole("button", { name: "Mark as mailed…" });
    await userEvent.click(opener);
    const dialog = await screen.findByRole("alertdialog", { name: "Mark as mailed" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("button", { name: "Confirming…" });
    reply?.reject(new Error("timeout"));
    await expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't confirm that the announcement went out.");
    const tryAgain = screen.getByRole("button", { name: "Try again" });
    await waitFor(() => expect(tryAgain).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("button", { name: "Confirming…" });
    reply?.reject(new Error("timeout"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Try again" })).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await userEvent.click(opener);
    await screen.findByRole("alertdialog", { name: "Mark as mailed" });
    await expect(screen.getByRole("button", { name: "Mark as mailed" })).toBeInTheDocument();
    await expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  },
};
