import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileTextIcon, ReceiptIcon, TriangleAlertIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Callout } from "#avenue/components/callout";
import { Field, FieldDescription, FieldLabel } from "#avenue/components/field";
import { FormDialog } from "#avenue/components/form-dialog";
import { Input } from "#avenue/components/input";
import { Select, type SelectOption } from "#avenue/components/select";
import { Textarea } from "#avenue/components/textarea";
import { listenForAnnouncements } from "../components/announce-kit";

// AVE-9, composite 1. Every form dialog in ManyAve: icon title, fields, error slot, Cancel and submit, and the
// discard guard. All names, addresses and amounts are fictional.

const categories: SelectOption[] = [
  { value: "governance", label: "Governance" },
  { value: "financial", label: "Financial" },
  { value: "meetings", label: "Meeting minutes" },
  { value: "other", label: "Other" },
];
const visibility: SelectOption[] = [
  { value: "board", label: "Board only" },
  { value: "members", label: "All members" },
];

const meta = { title: "Composites/Form dialog" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function AddDocument({
  defaultOpen = false,
  pending = false,
  holdWhilePending,
  locked,
  again,
  slowAfter,
  error,
  askAdmin,
  submitLabel = "Save document",
  submitDisabled,
  alternate,
  onSubmit = () => {},
}: {
  defaultOpen?: boolean;
  pending?: boolean;
  holdWhilePending?: boolean;
  locked?: boolean;
  again?: string;
  slowAfter?: number;
  error?: string;
  askAdmin?: string;
  submitLabel?: string;
  submitDisabled?: boolean;
  alternate?: { label: string; onSubmit: () => void | PromiseLike<unknown> };
  onSubmit?: (title: string) => void | PromiseLike<unknown>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <FormDialog
      defaultOpen={defaultOpen}
      trigger={<Button variant="outline">Add document</Button>}
      icon={FileTextIcon}
      title="Add document"
      description="A file or written document for the neighborhood or one household."
      submitLabel={submitLabel}
      submitDisabled={submitDisabled}
      alternate={alternate}
      pendingLabel="Saving…"
      pending={pending}
      holdWhilePending={holdWhilePending}
      locked={locked}
      again={again}
      slowAfter={slowAfter}
      dirty={title !== "" || body !== ""}
      error={error}
      askAdmin={askAdmin}
      width="lg"
      onSubmit={() => onSubmit(title)}
    >
      <Field>
        <FieldLabel>Title</FieldLabel>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        {/* A hint is a description, not a placeholder, which would read as typed text (AVE-25, fixed in AVE-89). */}
        <FieldDescription>For example, Community bylaws.</FieldDescription>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Category</FieldLabel>
          <Select options={categories} defaultValue="governance" />
        </Field>
        <Field>
          <FieldLabel>Visibility</FieldLabel>
          <Select options={visibility} defaultValue="members" />
        </Field>
      </div>
      <Field>
        <FieldLabel>Text</FieldLabel>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
      </Field>
    </FormDialog>
  );
}

/** Open: icon and title on the header line, fields, Cancel and Save document on the footer strip. 16px inset (AVE-2). */
export const Open: Story = {
  tags: ["pattern:dialog"],
  render: () => <AddDocument defaultOpen />,
  play: async () => {
    const dialog = await screen.findByRole("dialog", { name: "Add document" });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Title" })).toHaveFocus());
    // The header's end padding keeps a title 8px clear of the close button, however long it gets (AVE-61).
    const header = dialog.querySelector<HTMLElement>("[data-slot=dialog-header]")!;
    const textEnd = header.getBoundingClientRect().right - Number.parseFloat(getComputedStyle(header).paddingRight);
    const close = within(dialog).getByRole("button", { name: "Close" }).getBoundingClientRect();
    await expect(Math.round(close.left - textEnd)).toBe(8);
  },
};

/** Keyboard flow: focus on the first field, Enter submits, focus returns to the trigger. */
export const KeyboardFlow: Story = {
  tags: ["agent"],
  render: function Flow() {
    const [open, setOpen] = useState(false);
    const [saved, setSaved] = useState("");
    return (
      <div className="flex flex-col items-start gap-2 p-inset">
        <FormDialog
          open={open}
          onOpenChange={setOpen}
          trigger={<Button variant="outline">Record payment</Button>}
          icon={ReceiptIcon}
          title="Record payment"
          description="A payment toward 14 Larkspur Lane's 2026 dues."
          submitLabel="Record payment"
          onSubmit={() => {
            setSaved("Recorded $240.00");
            setOpen(false);
          }}
        >
          <Field>
            <FieldLabel>Amount</FieldLabel>
            <Input inputMode="decimal" autoComplete="off" placeholder="0.00" />
          </Field>
          <Field>
            <FieldLabel>Check number</FieldLabel>
            <Input inputMode="numeric" autoComplete="off" />
          </Field>
        </FormDialog>
        <output className="text-meta text-muted-foreground">{saved}</output>
      </div>
    );
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Record payment" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "Record payment" });
    const amount = screen.getByRole("textbox", { name: "Amount" });
    await waitFor(() => expect(amount).toHaveFocus());
    await userEvent.keyboard("240");
    await userEvent.tab();
    await expect(screen.getByRole("textbox", { name: "Check number" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await expect(canvas.getByText("Recorded $240.00")).toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/** With nothing typed, Esc closes at once and focus returns to the trigger. */
export const EscapeWhenClean: Story = {
  render: () => <AddDocument />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Add document" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Add document" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
  },
};

/**
 * The discard guard. With input typed, Esc asks "Discard changes?" with focus on Keep editing; Esc there steps back
 * to the form with the input kept; Cancel asks again, and Discard closes and returns focus to the trigger. Discard
 * carries `data-agent-confirm`, so an agent asks a person before using it.
 */
export const DiscardGuard: Story = {
  render: () => <AddDocument />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Add document" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Add document" });
    const title = screen.getByRole("textbox", { name: "Title" });
    await waitFor(() => expect(title).toHaveFocus());
    await userEvent.keyboard("Pool rules");

    await userEvent.keyboard("{Escape}");
    const ask = await screen.findByRole("alertdialog", { name: "Discard changes?" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(ask).not.toBeInTheDocument());
    await expect(dialog).toBeInTheDocument();
    await expect(title).toHaveValue("Pool rules");

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await screen.findByRole("alertdialog", { name: "Discard changes?" });
    const discard = screen.getByRole("button", { name: "Discard" });
    // An agent must not drop someone's input on its own (AVE-44), the same as Sheet's Discard.
    await expect(discard).toHaveAttribute("data-agent-confirm", "Discards what was entered in this form");
    await userEvent.click(discard);
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/** Keep editing by keyboard: Enter on the focused Keep editing returns to the form. */
export const DiscardGuardKeepEditing: Story = {
  render: () => <AddDocument />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add document" }));
    const dialog = await screen.findByRole("dialog", { name: "Add document" });
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Title" })).toHaveFocus());
    await userEvent.keyboard("Budget 2027");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    const ask = await screen.findByRole("alertdialog", { name: "Discard changes?" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Keep editing" })).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(ask).not.toBeInTheDocument());
    await expect(dialog).toBeInTheDocument();
  },
};

/** Saving: the submit button shows its pending label, and Esc and Cancel do nothing until the save ends. */
export const Pending: Story = {
  render: () => <AddDocument defaultOpen pending />,
  play: async () => {
    const dialog = await screen.findByRole("dialog", { name: "Add document" });
    await expect(screen.getByRole("button", { name: "Saving…" })).toHaveAttribute("aria-disabled", "true");
    await expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await expect(dialog).toBeInTheDocument();
  },
};

/** The error slot, under the fields, announced at once. */
export const WithError: Story = {
  render: () => <AddDocument defaultOpen error="We couldn't save the document. Check your connection and try again." />,
  play: async () => {
    await screen.findByRole("dialog", { name: "Add document" });
    await expect(screen.getByRole("alert")).toHaveTextContent("We couldn't save the document.");
  },
};

/**
 * A plain member or a read-only board: the fields are disabled before anyone types, not only submit, with the reason
 * in the footer and linked to the button (MANA-953).
 */
export const AskAdmin: Story = {
  render: () => <AddDocument defaultOpen askAdmin="Only a board admin can add documents." />,
  play: async () => {
    await screen.findByRole("dialog", { name: "Add document" });
    const save = screen.getByRole("button", { name: "Save document" });
    await expect(save).toHaveAttribute("aria-disabled", "true");
    await expect(save).toHaveAccessibleDescription("Only a board admin can add documents.");
    await expect(screen.getByRole("textbox", { name: "Title" })).toBeDisabled();
    await expect(screen.getByRole("textbox", { name: "Text" })).toBeDisabled();
    await expect(screen.getByRole("combobox", { name: "Category" })).toBeDisabled();
    // Cancel is a way out, so it stays on.
    await expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  },
};

/**
 * A slow save that is held (the default, and the right one for money): after `slowAfter` (8 seconds in the app,
 * shortened here) the footer says it is slow and will finish, and nothing closes the dialog until it does (MANA-1039).
 */
export const SlowSave: Story = {
  render: () => <AddDocument defaultOpen pending again="record" slowAfter={50} submitLabel="Record payment" />,
  play: async () => {
    const dialog = await screen.findByRole("dialog", { name: "Add document" });
    const status = dialog.querySelector<HTMLElement>("[data-slot=slow-save]")!;
    await expect(status.tagName).toBe("OUTPUT");
    await waitFor(() =>
      expect(status).toHaveTextContent(
        "This is taking longer than usual. Keep this open. It will finish on its own. Closing now won’t stop it, so don’t record it again.",
      ),
    );
    await expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await userEvent.keyboard("{Escape}");
    await expect(dialog).toBeInTheDocument();
  },
};

/**
 * A slow save that isn't held (`holdWhilePending={false}`): it finishes even if the dialog closes, so Cancel stays on,
 * the line says so, and closing doesn't ask "Discard changes?".
 */
export const SlowSaveNotHeld: Story = {
  render: () => <AddDocument pending holdWhilePending={false} again="add" slowAfter={50} />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Add document" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Add document" });
    await waitFor(() =>
      expect(dialog.querySelector("[data-slot=slow-save]")).toHaveTextContent(
        "This is taking longer than usual. It will finish on its own, even if you close this, so don’t add it again.",
      ),
    );
    const cancel = screen.getByRole("button", { name: "Cancel" });
    await expect(cancel).toBeEnabled();
    cancel.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/** Locked: nothing closes it, saving or not, e.g. a payment whose result is unknown and has to be retried. */
export const Locked: Story = {
  render: () => <AddDocument defaultOpen locked submitLabel="Try again" />,
  play: async () => {
    const dialog = await screen.findByRole("dialog", { name: "Add document" });
    await expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    await expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await userEvent.keyboard("{Escape}");
    await expect(dialog).toBeInTheDocument();
    await expect(screen.getByRole("button", { name: "Try again" })).not.toHaveAttribute("aria-disabled");
  },
};

/** Submit off while not saving, e.g. while a file uploads: the label shows the progress, and Enter does nothing. */
export const SubmitDisabled: Story = {
  render: function Uploading() {
    const [submitted, setSubmitted] = useState("");
    return (
      <div className="flex flex-col items-start gap-2 p-inset">
        <AddDocument defaultOpen submitDisabled submitLabel="Uploading… 40%" onSubmit={() => setSubmitted("Submitted")} />
        <output className="text-meta text-muted-foreground">{submitted}</output>
      </div>
    );
  },
  play: async ({ canvas }) => {
    await screen.findByRole("dialog", { name: "Add document" });
    await expect(screen.getByRole("button", { name: "Uploading… 40%" })).toHaveAttribute("aria-disabled", "true");
    const title = screen.getByRole("textbox", { name: "Title" });
    await waitFor(() => expect(title).toHaveFocus());
    await userEvent.keyboard("Bylaws{Enter}");
    await expect(canvas.queryByText("Submitted")).not.toBeInTheDocument();
  },
};

/** A second way to save, before submit ("Save & prepare letter"). Enter in a field still runs the main submit. */
export const SecondSubmit: Story = {
  render: function Second() {
    const [saved, setSaved] = useState("");
    return (
      <div className="flex flex-col items-start gap-2 p-inset">
        <AddDocument
          defaultOpen
          submitLabel="Save"
          alternate={{ label: "Save & prepare letter", onSubmit: () => setSaved("Saved, letter next") }}
          onSubmit={() => setSaved("Saved")}
        />
        <output className="text-meta text-muted-foreground">{saved}</output>
      </div>
    );
  },
  play: async ({ canvas }) => {
    await screen.findByRole("dialog", { name: "Add document" });
    const second = screen.getByRole("button", { name: "Save & prepare letter" });
    second.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.getByText("Saved, letter next")).toBeInTheDocument());
    const title = screen.getByRole("textbox", { name: "Title" });
    title.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.getByText("Saved")).toBeInTheDocument());
  },
};

/** Close only: nothing to submit (an empty list). One Close button, no ✕, and Esc closes. */
export const CloseOnly: Story = {
  render: () => (
    <FormDialog
      closeOnly
      trigger={<Button variant="outline">Household changes</Button>}
      icon={UsersIcon}
      title="Household changes"
      description="Owner and address changes waiting for the board."
    >
      <p className="text-muted-foreground">No changes are waiting.</p>
    </FormDialog>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Household changes" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Household changes" });
    await expect(within(dialog).getAllByRole("button")).toHaveLength(1);
    const close = within(dialog).getByRole("button", { name: "Close" });
    close.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/** Callouts among the fields: an info note and a warning (AVE-120). */
export const WithCallouts: Story = {
  render: () => (
    <FormDialog
      defaultOpen
      icon={ReceiptIcon}
      title="Set the 2027 assessment"
      description="The yearly dues every household owes."
      submitLabel="Set assessment"
      onSubmit={fn()}
    >
      <Callout>Households already at this amount are skipped.</Callout>
      <Field>
        <FieldLabel>Amount</FieldLabel>
        <Input inputMode="decimal" autoComplete="off" defaultValue="240.00" />
      </Field>
      <Callout tone="warning" icon={TriangleAlertIcon}>
        3 households have payments recorded for 2027. Their balances change with the new amount.
      </Callout>
    </FormDialog>
  ),
  play: async () => {
    const dialog = await screen.findByRole("dialog", { name: "Set the 2027 assessment" });
    // The dialog fades in from opacity 0 (data-starting-style), so wait for it to show (AVE-99: failed 1 run in 3).
    await waitFor(() => expect(within(dialog).getByText("Households already at this amount are skipped.")).toBeVisible());
    // Static notes, not live regions: they are read in order with the fields.
    await expect(within(dialog).queryByRole("status", { name: /Households/ })).not.toBeInTheDocument();
  },
};

/** Long content scrolls between a fixed header and footer, so Cancel and submit stay in view. */
export const LongForm: Story = {
  render: () => (
    <FormDialog
      defaultOpen
      icon={FileTextIcon}
      title="Edit household"
      description="Owner and mailing details for 2 Quail Hollow Court."
      submitLabel="Save household"
      onSubmit={fn()}
    >
      {["Owner", "Second owner", "Email", "Phone", "Mailing street", "Mailing city", "State", "ZIP", "Notes", "Lot"].map(
        (label) => (
          <Field key={label}>
            <FieldLabel>{label}</FieldLabel>
            <Input autoComplete="off" />
          </Field>
        ),
      )}
    </FormDialog>
  ),
  play: async () => {
    await screen.findByRole("dialog", { name: "Edit household" });
    const save = screen.getByRole("button", { name: "Save household" });
    await waitFor(() => expect(save).toBeVisible());
    await expect(save.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
  },
};

/** A save in flight that the play settles: resolve or reject it from outside, like a server's reply. */
let reply: { resolve: () => void; reject: (reason: unknown) => void } | undefined;
const save = () =>
  new Promise<void>((resolve, reject) => {
    reply = { resolve, reject };
  });

/**
 * AVE-150: `onSubmit` returns a Promise, and that alone drives the dialog, as ui-sdk's Button does. While it runs,
 * submit shows "Saving…" and is off, a second Enter doesn't submit twice, and Esc and Cancel can't close it. Once it
 * resolves, the dialog closes and focus goes back to the trigger.
 */
export const PromiseResolves: Story = {
  render: function Resolves() {
    const [calls, setCalls] = useState(0);
    return (
      <div className="flex flex-col items-start gap-2 p-inset">
        <AddDocument
          onSubmit={() => {
            setCalls((n) => n + 1);
            return save();
          }}
        />
        <output className="text-meta text-muted-foreground">{calls ? `Saved ${calls} time${calls > 1 ? "s" : ""}` : ""}</output>
      </div>
    );
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Add document" });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Add document" });
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Title" })).toHaveFocus());
    await userEvent.keyboard("Pool rules{Enter}");
    const saving = await screen.findByRole("button", { name: "Saving…" });
    await expect(saving).toHaveAttribute("aria-disabled", "true");
    await expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Escape}");
    await expect(dialog).toBeInTheDocument();
    await expect(canvas.getByText("Saved 1 time")).toBeInTheDocument();
    reply?.resolve();
    // Closed without asking "Discard changes?": what was typed is saved.
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/**
 * A rejected Promise keeps the dialog open with what was typed, and its message shows in the error slot, announced
 * at once. Submit is on again; the next submit clears the error and saves.
 */
export const PromiseRejects: Story = {
  render: () => <AddDocument defaultOpen onSubmit={save} />,
  play: async () => {
    const dialog = await screen.findByRole("dialog", { name: "Add document" });
    const title = screen.getByRole("textbox", { name: "Title" });
    await waitFor(() => expect(title).toHaveFocus());
    await userEvent.keyboard("Pool rules{Enter}");
    await screen.findByRole("button", { name: "Saving…" });
    reply?.reject(new Error("We couldn’t save the document. Check your connection and try again."));
    const alert = await within(dialog).findByRole("alert");
    await expect(alert).toHaveTextContent("We couldn’t save the document. Check your connection and try again.");
    await expect(title).toHaveValue("Pool rules");
    const submit = screen.getByRole("button", { name: "Save document" });
    await expect(submit).not.toHaveAttribute("aria-disabled");
    submit.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(within(dialog).queryByText(/couldn’t save/)).not.toBeInTheDocument());
    reply?.resolve();
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  },
};

/**
 * A slow Promise: after a second a screen reader hears the pending label (ui-sdk's `pendingAnnouncement`), and after
 * `slowAfter` (8 seconds in the app, shortened here) the footer's slow line shows, as with `pending`. A rejection with
 * no message of its own shows Avenue's sentence.
 */
export const PromiseSlow: Story = {
  render: () => <AddDocument defaultOpen again="record" slowAfter={50} submitLabel="Record payment" onSubmit={save} />,
  play: async () => {
    const dialog = await screen.findByRole("dialog", { name: "Add document" });
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Title" })).toHaveFocus());
    const announcements = listenForAnnouncements();
    await userEvent.keyboard("{Enter}");
    const status = dialog.querySelector<HTMLElement>("[data-slot=slow-save]")!;
    await waitFor(() =>
      expect(status).toHaveTextContent(
        "This is taking longer than usual. Keep this open. It will finish on its own. Closing now won’t stop it, so don’t record it again.",
      ),
    );
    await waitFor(() => expect(announcements.heard).toContain("Saving…"), { timeout: 3_000 });
    announcements.stop();
    reply?.reject(undefined);
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "We couldn’t save this. Check your connection and try again.",
    );
    await expect(status).toBeEmptyDOMElement();
  },
};
