import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "#avenue/components/button";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import {
  createConfirm,
  PendingConfirmDialog,
  PendingConfirmDialogCancel,
  PendingConfirmDialogConfirm,
  PendingConfirmDialogContent,
  PendingConfirmDialogDescription,
  PendingConfirmDialogFooter,
  PendingConfirmDialogHeader,
  PendingConfirmDialogRoot,
  PendingConfirmDialogTitle,
  PendingConfirmDialogTrigger,
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

// ---- The parts (AVE-147). The phases live in PendingConfirmDialogRoot, so a composed dialog keeps them.

type Payment = { household: string; amount: string };

/**
 * Parts with ui-sdk's `createConfirm()`: one dialog for every row, asked from the row's handler. `await confirm(row)`
 * opens it with the row as its payload, and resolves true only once the step has happened (the Promise from
 * `onConfirm` resolved), false when the person cancels. While the step runs the root holds the dialog: focus on the
 * status line, Tab and Esc can't leave, Cancel is off.
 */
export const PartsCreateConfirm: Story = {
  render: function Rows() {
    const [confirm] = useState(() => createConfirm<Payment>());
    const [log, setLog] = useState("");
    const [recorded, setRecorded] = useState<string[]>([]);
    const rows: Payment[] = [
      { household: "14 Larkspur Lane", amount: "$240.00" },
      { household: "9 Heron Way", amount: "$120.00" },
    ];
    return (
      <div className="flex flex-col items-start gap-controls p-inset">
        {rows.map((row) => (
          <Button
            key={row.household}
            variant="outline"
            onClick={async () => {
              const done = await confirm(row);
              setLog(done ? `Recorded ${row.amount} for ${row.household}` : `Kept ${row.household} as it was`);
            }}
          >
            Record payment for {row.household}
          </Button>
        ))}
        <output className="text-meta text-muted-foreground">{log}</output>
        <PendingConfirmDialogRoot
          controller={confirm.controller}
          recovery={retry}
          pendingMessage="Recording the payment. Please wait."
          onConfirm={(payment) => {
            setRecorded((list) => [...list, payment?.household ?? "?"]);
            return send();
          }}
        >
          <PendingConfirmDialogContent<Payment>>
            {({ payload }) => (
              <>
                <PendingConfirmDialogHeader>
                  <PendingConfirmDialogTitle>Record payment</PendingConfirmDialogTitle>
                  <PendingConfirmDialogDescription>
                    Record {payload?.amount} toward {payload?.household}’s 2026 dues.
                  </PendingConfirmDialogDescription>
                </PendingConfirmDialogHeader>
                <PendingConfirmDialogFooter>
                  <PendingConfirmDialogCancel />
                  <PendingConfirmDialogConfirm pendingLabel="Recording…">Record payment</PendingConfirmDialogConfirm>
                </PendingConfirmDialogFooter>
              </>
            )}
          </PendingConfirmDialogContent>
        </PendingConfirmDialogRoot>
        <output data-testid="recorded" className="sr-only">{recorded.join(", ")}</output>
      </div>
    );
  },
  play: async ({ canvas }) => {
    const first = canvas.getByRole("button", { name: "Record payment for 14 Larkspur Lane" });
    first.focus();
    await userEvent.keyboard("{Enter}");
    const dialog = await screen.findByRole("alertdialog", { name: "Record payment" });
    await expect(dialog).toHaveAccessibleDescription("Record $240.00 toward 14 Larkspur Lane’s 2026 dues.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    const status = await screen.findByText("Recording the payment. Please wait.");
    await waitFor(() => expect(status).toHaveFocus());
    await expect(screen.getByRole("button", { name: "Recording…" })).toHaveAttribute("aria-disabled", "true");
    await expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await userEvent.tab();
    await expect(status).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(dialog).toBeInTheDocument();
    await expect(canvas.getByTestId("recorded")).toHaveTextContent("14 Larkspur Lane");
    reply?.resolve();
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await expect(await canvas.findByText("Recorded $240.00 for 14 Larkspur Lane")).toBeInTheDocument();
    await waitFor(() => expect(first).toHaveFocus());

    // The same dialog, asked from another row, starts on the question again; Cancel answers false.
    const second = canvas.getByRole("button", { name: "Record payment for 9 Heron Way" });
    second.focus();
    await userEvent.keyboard("{Enter}");
    const again = await screen.findByRole("alertdialog", { name: "Record payment" });
    await expect(again).toHaveAccessibleDescription("Record $120.00 toward 9 Heron Way’s 2026 dues.");
    const cancel = screen.getByRole("button", { name: "Cancel" });
    await waitFor(() => expect(cancel).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(again).not.toBeInTheDocument());
    await expect(await canvas.findByText("Kept 9 Heron Way as it was")).toBeInTheDocument();
  },
};

/**
 * Parts with a trigger, uncontrolled: a rejection means the outcome is unknown, and when the step isn't safe to retry
 * the root swaps the confirm button for the place to check, with focus on it and the reason read with it. Close stays
 * on, so nobody is trapped.
 */
export const PartsUnknownCheckFirst: Story = {
  render: () => (
    <div className="p-inset">
      <PendingConfirmDialogRoot
        pendingMessage="Saving the correction. Please wait."
        recovery={{
          safeToRetry: false,
          message: "We couldn't confirm that the correction was saved. Check the ledger before trying again, so it isn't saved twice.",
          checkLabel: "Open ledger",
          onCheck: () => {},
        }}
        onConfirm={send}
      >
        <PendingConfirmDialogTrigger render={<Button variant="outline" />}>Correct balance…</PendingConfirmDialogTrigger>
        <PendingConfirmDialogContent>
          <PendingConfirmDialogHeader>
            <PendingConfirmDialogTitle>Correct balance</PendingConfirmDialogTitle>
            <PendingConfirmDialogDescription>Lower 2 Quail Hollow Court’s balance by $40.00.</PendingConfirmDialogDescription>
          </PendingConfirmDialogHeader>
          <PendingConfirmDialogFooter>
            <PendingConfirmDialogCancel />
            <PendingConfirmDialogConfirm pendingLabel="Saving…">Save correction</PendingConfirmDialogConfirm>
          </PendingConfirmDialogFooter>
        </PendingConfirmDialogContent>
      </PendingConfirmDialogRoot>
    </div>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Correct balance…" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("alertdialog", { name: "Correct balance" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("button", { name: "Saving…" });
    reply?.reject(new Error("timeout"));
    await expect(await screen.findByRole("alert")).toHaveTextContent("Check the ledger before trying again");
    const check = screen.getByRole("button", { name: "Open ledger" });
    await waitFor(() => expect(check).toHaveFocus());
    await expect(check).toHaveAccessibleDescription(
      "We couldn't confirm that the correction was saved. Check the ledger before trying again, so it isn't saved twice.",
    );
    await expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    const close = screen.getByRole("button", { name: "Close" });
    await expect(close).toBeEnabled();
    close.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
