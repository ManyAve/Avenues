import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Plus } from "lucide-react";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import {
  CollapsibleSection,
  CollapsibleSectionPanel,
  CollapsibleSectionTrigger,
} from "#avenue/components/collapsible-section";
import { DisplayOptions, DisplayOptionsDensity, DisplayOptionsSection } from "#avenue/components/display-options";
import { FileField } from "#avenue/components/file-field";
import { InlineMessage } from "#avenue/components/inline-message";
import { ModeToggle } from "#avenue/components/mode-toggle";
import { PendingConfirmDialog } from "#avenue/components/pending-confirm-dialog";
import type { Density } from "#avenue/components/register";
import {
  Register,
  RegisterAddRow,
  RegisterBody,
  RegisterCell,
  RegisterColumnHeader,
  RegisterGroupRow,
  RegisterHeader,
  RegisterRow,
} from "#avenue/components/register";
import { Toolbar, ToolbarActions, ToolbarControls } from "#avenue/components/toolbar";
import { InfoTip } from "#avenue/components/tooltip";

// AVE-138. Every component passes the props it doesn't use itself (a ref, an id, aria-* and data-*) to its root
// element, as ui-sdk, Base UI and shadcn parts do: an app can focus or measure it, point aria-describedby at it, or tag
// it for a test. A dialog or popover passes them to its content. The component's own role, state and data-slot win
// over the app's, so an app can't switch off what makes it work. These stories are the run-time proof; the type test
// is src/type-tests/pass-through.ts. All names and addresses are fictional.

const meta = { title: "Foundations/Pass-through" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** What each ref was given, by the root's data-testid. A callback ref proves the ref reaches the element. */
const refs = new Map<string, Element | null>();
const refFor = (name: string) => (element: Element | null) => {
  refs.set(name, element);
};

const inline = [
  "inline-message",
  "disclosure",
  "file-field",
  "mode-toggle",
  "info-tip",
  "toolbar-actions",
  "group-row",
  "add-row",
] as const;

function Roots() {
  const [open, setOpen] = useState(true);
  return (
    <div className="grid max-w-2xl gap-section p-page">
      <p id="pass-through-note" className="text-meta text-muted-foreground">
        Each component below is described by this line, except the help button, which the tip describes.
      </p>
      <InlineMessage
        ref={refFor("inline-message")}
        id="dues-error"
        data-testid="inline-message"
        aria-describedby="pass-through-note"
        tone="warning"
      >
        Dues for 12 Birch Lane are two months late.
      </InlineMessage>
      <CollapsibleSection
        variant="disclosure"
        ref={refFor("disclosure")}
        id="advanced"
        data-testid="disclosure"
        aria-describedby="pass-through-note"
      >
        <CollapsibleSectionTrigger>Advanced</CollapsibleSectionTrigger>
        <CollapsibleSectionPanel>Only admins see these settings.</CollapsibleSectionPanel>
      </CollapsibleSection>
      <FileField
        ref={refFor("file-field")}
        id="rules"
        data-testid="file-field"
        aria-describedby="pass-through-note"
        label="Rules document"
        onFileChange={() => {}}
      />
      <ModeToggle
        ref={refFor("mode-toggle")}
        id="mode"
        data-testid="mode-toggle"
        aria-describedby="pass-through-note"
        theme="light"
      />
      <span className="flex items-center gap-1 text-meta">
        Overdue
        <InfoTip
          ref={refFor("info-tip")}
          id="overdue-help"
          data-testid="info-tip"
          label="What overdue means"
        >
          Unpaid 30 days after the due date.
        </InfoTip>
      </span>
      <Toolbar aria-label="Households">
        <ToolbarControls>
          <ToolbarActions
            ref={refFor("toolbar-actions")}
            id="actions"
            data-testid="toolbar-actions"
            aria-describedby="pass-through-note"
            actions={[]}
            primary={{ id: "add", label: "Add household", icon: <Plus aria-hidden />, onSelect: () => {} }}
          />
        </ToolbarControls>
      </Toolbar>
      <Register aria-label="Households" rowCount={4} colCount={1} spanningRows={[1, 3]} className="w-105">
        <RegisterHeader>
          <RegisterRow row={0}>
            <RegisterColumnHeader col={0}>Property</RegisterColumnHeader>
          </RegisterRow>
        </RegisterHeader>
        <RegisterBody>
          <RegisterGroupRow
            ref={refFor("group-row")}
            data-testid="group-row"
            aria-describedby="pass-through-note"
            row={1}
            colCount={1}
            name="Birch Lane"
            count={1}
            open={open}
            onOpenChange={setOpen}
          />
          <RegisterRow row={2}>
            <RegisterCell row={2} col={0}>
              12 Birch Lane
            </RegisterCell>
          </RegisterRow>
          <RegisterAddRow
            ref={refFor("add-row")}
            data-testid="add-row"
            aria-describedby="pass-through-note"
            row={3}
            colCount={1}
            onAdd={() => {}}
          >
            Add household
          </RegisterAddRow>
        </RegisterBody>
      </Register>
    </div>
  );
}

/** Their own markers, which the app's props must not replace. */
const slots: Record<string, string> = {
  "inline-message": "inline-message",
  // A ui-sdk part keeps ui-sdk's name (AGENTS.md, "data-slot names").
  disclosure: "collapsible",
  "file-field": "field",
  "mode-toggle": "mode-toggle",
  "info-tip": "tooltip-trigger",
  "toolbar-actions": "toolbar-actions",
};

const ids: Record<string, string> = {
  "inline-message": "dues-error",
  disclosure: "advanced",
  "file-field": "rules",
  "mode-toggle": "mode",
  "info-tip": "overdue-help",
  "toolbar-actions": "actions",
};

/** The inline components: each root takes the ref, id, data-testid and aria-describedby, and keeps its own marks. */
export const InlineRoots: Story = {
  render: () => <Roots />,
  play: async ({ canvas }) => {
    for (const name of inline) {
      const root = canvas.getByTestId(name);
      await expect(refs.get(name)).toBe(root);
      if (name !== "info-tip") await expect(root).toHaveAttribute("aria-describedby", "pass-through-note");
      if (ids[name]) await expect(root).toHaveAttribute("id", ids[name]);
      if (slots[name]) await expect(root).toHaveAttribute("data-slot", slots[name]);
    }
    // The region keeps its role, so the warning is still announced.
    await expect(canvas.getByTestId("inline-message")).toHaveAttribute("role", "status");
    // The help button keeps its name, and the tip stays its description.
    const tip = canvas.getByTestId("info-tip");
    await expect(tip).toHaveAccessibleName("What overdue means");
    await expect(tip).toHaveAccessibleDescription("Unpaid 30 days after the due date.");
    // The group row's button still works by keyboard with the app's props on its row.
    const street = canvas.getByRole("button", { name: /Birch Lane/ });
    street.focus();
    await userEvent.keyboard("{Enter}");
    await expect(street).toHaveAttribute("aria-expanded", "false");
    await userEvent.keyboard("{Enter}");
    await expect(street).toHaveAttribute("aria-expanded", "true");
  },
};

/** A dialog passes them to the dialog itself (its description stays its own), and an app's onKeyDown runs without releasing Tab while pending. */
export const DialogContent: Story = {
  render: function Render() {
    const [keys, setKeys] = useState(0);
    return (
      <>
        <p id="dialog-note" className="p-page text-meta text-muted-foreground">
          Keys pressed in the dialog: <output data-testid="keys">{keys}</output>
        </p>
        <PendingConfirmDialog
          ref={refFor("pending-confirm")}
          id="mail-confirm"
          data-testid="pending-confirm"
          onKeyDown={() => setKeys((n) => n + 1)}
          open
          onOpenChange={() => {}}
          title="Mark as mailed?"
          description="The letter to 12 Birch Lane is recorded as sent."
          confirmLabel="Mark as mailed"
          pendingLabel="Marking…"
          pendingMessage="Recording the mailing. Please wait."
          phase="pending"
          recovery={{ safeToRetry: true, message: "We couldn't confirm the letter was recorded. It's safe to try again." }}
          onConfirm={() => {}}
        />
      </>
    );
  },
  play: async () => {
    const dialog = await screen.findByRole("alertdialog");
    await expect(dialog).toHaveAttribute("data-testid", "pending-confirm");
    await expect(dialog).toHaveAttribute("id", "mail-confirm");
    await expect(refs.get("pending-confirm")).toBe(dialog);
    // The dialog's own description stays its description: ui-sdk owns that link, as it owns the role.
    await expect(dialog).toHaveAccessibleDescription("The letter to 12 Birch Lane is recorded as sent.");
    const status = await screen.findByText("Recording the mailing. Please wait.");
    await waitFor(() => expect(status).toHaveFocus());
    await userEvent.keyboard("{Tab}");
    // The app's handler ran, and Tab is still held on the status line.
    await expect(screen.getByTestId("keys")).toHaveTextContent("1");
    await expect(status).toHaveFocus();
  },
};

/** Display options passes them to its popover, like its className; its row-height group and sections take them too. */
export const PopoverContent: Story = {
  render: function Render() {
    const [density, setDensity] = useState<Density>("normal");
    return (
      <div className="min-h-90 p-page">
        <Toolbar aria-label="Households">
          <ToolbarControls>
            <DisplayOptions ref={refFor("display-options")} id="households-display" data-testid="display-options" aria-describedby="display-note">
              <DisplayOptionsSection id="row-height" data-testid="display-section" title="Row height">
                <DisplayOptionsDensity
                  id="density"
                  data-testid="display-density"
                  aria-describedby="display-note"
                  value={density}
                  onValueChange={setDensity}
                />
              </DisplayOptionsSection>
            </DisplayOptions>
          </ToolbarControls>
        </Toolbar>
        <p id="display-note" className="mt-inset text-meta text-muted-foreground">
          Changes apply to this list only.
        </p>
      </div>
    );
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Display options" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const popover = await screen.findByTestId("display-options");
    await expect(popover).toHaveAttribute("id", "households-display");
    await expect(refs.get("display-options")).toBe(popover);
    await expect(popover).toHaveAttribute("aria-label", "Display options");
    await expect(screen.getByTestId("display-section")).toHaveAttribute("id", "row-height");
    await expect(screen.getByTestId("display-section")).toHaveAttribute("data-slot", "display-options-section");
    const group = screen.getByTestId("display-density");
    await expect(group).toHaveAttribute("id", "density");
    await expect(group).toHaveAccessibleName("Row height");
    // The group still chooses by keyboard with the app's props on it.
    await waitFor(() => expect(screen.getByRole("radio", { name: "Normal" })).toBeVisible());
    screen.getByRole("radio", { name: "Normal" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(screen.getByRole("radio", { name: "Comfortable" })).toBeChecked();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
