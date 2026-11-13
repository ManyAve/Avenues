import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileTextIcon, ReceiptIcon } from "lucide-react";
import { useState } from "react";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Field, FieldLabel } from "#avenue/components/field";
import { FormDialog } from "#avenue/components/form-dialog";
import { Input } from "#avenue/components/input";
import { Select, type SelectOption } from "#avenue/components/select";
import { Textarea } from "#avenue/components/textarea";

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
  error,
  askAdmin,
  onSubmit = () => {},
}: {
  defaultOpen?: boolean;
  pending?: boolean;
  error?: string;
  askAdmin?: string;
  onSubmit?: (title: string) => void;
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
      submitLabel="Save document"
      pendingLabel="Saving…"
      pending={pending}
      dirty={title !== "" || body !== ""}
      error={error}
      askAdmin={askAdmin}
      width="lg"
      onSubmit={() => onSubmit(title)}
    >
      <Field>
        <FieldLabel>Title</FieldLabel>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Community bylaws" />
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

/** A plain member: submit is disabled, with the reason in the footer and linked to the button. */
export const AskAdmin: Story = {
  render: () => <AddDocument defaultOpen askAdmin="Only a board admin can add documents." />,
  play: async () => {
    await screen.findByRole("dialog", { name: "Add document" });
    const save = screen.getByRole("button", { name: "Save document" });
    await expect(save).toHaveAttribute("aria-disabled", "true");
    await expect(save).toHaveAccessibleDescription("Only a board admin can add documents.");
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
