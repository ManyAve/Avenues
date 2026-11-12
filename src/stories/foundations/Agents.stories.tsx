import type { Meta, StoryObj } from "@storybook/react-vite";
import { checkPattern } from "@ui-sdk/core/testing";
import { createAgent } from "@ui-sdk/react/agent";
import { Button } from "@ui-sdk/react/button";
import { Field, FieldDescription, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui-sdk/react/select";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

// How an Avenue screen stays usable by an agent (ui-sdk's docs/agents.md and the skill's agent-ready.md):
// every control is a ui-sdk part with a name, and state changes go through the parts' change callbacks.
// The play function is the agent test ui-sdk asks for: it reads the controls through createAgent and
// changes them the way an agent would, with an `allow` callback that holds back the one action marked
// data-agent-confirm until a person approves, then runs ui-sdk's WAI-ARIA check on the switch. The look is
// Avenue's tokens on ui-sdk's unstyled parts; these are not Avenue components (AVE-17 builds those).
// The bridge exists only in this story; turning it on in the ManyAve app is a later decision.

let personApproved = false;
const agent = createAgent({ allow: (step) => !step.confirm || personApproved });

const control =
  "h-control-md rounded-lg border border-input bg-background px-3 text-control shadow-control outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function NotificationSettings() {
  const [sent, setSent] = useState(false);
  return (
    <form
      aria-label="Notification settings"
      className="flex max-w-md flex-col gap-section rounded-xl border bg-card p-inset text-card-foreground shadow-card"
      onSubmit={(event) => event.preventDefault()}
    >
      <Field className="flex flex-col gap-group">
        <FieldLabel className="text-control font-medium">Board email</FieldLabel>
        <Input
          type="email"
          defaultValue="board@maple-court.example"
          className={control}
        />
        <FieldDescription className="text-meta text-muted-foreground">
          Where owners' questions are sent.
        </FieldDescription>
      </Field>
      {/* The label wraps the control as ui-sdk's Switch docs show; the lint rule can't see that Switch renders a button. */}
      {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label className="flex items-center justify-between gap-group text-control font-medium">
        Weekly digest
        <Switch className="inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-input p-px outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:bg-primary">
          <SwitchThumb className="block size-4 rounded-full bg-background shadow-control transition-transform data-checked:translate-x-4" />
        </Switch>
      </label>
      <Field className="flex flex-col gap-group">
        <FieldLabel className="text-control font-medium">Digest day</FieldLabel>
        <Select defaultValue="monday">
          <SelectTrigger className={`${control} flex items-center justify-between gap-group text-left`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-(--anchor-width) rounded-lg border bg-popover p-inline text-popover-foreground shadow-popover">
            <SelectItem value="monday" className="rounded-sm px-2 py-1 text-control data-highlighted:bg-accent">
              Monday
            </SelectItem>
            <SelectItem value="friday" className="rounded-sm px-2 py-1 text-control data-highlighted:bg-accent">
              Friday
            </SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="flex items-center gap-group">
        <Button
          data-agent-confirm="Sends a test email to the board address"
          onClick={() => setSent(true)}
          className="h-control-md rounded-lg bg-primary px-3 text-control font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Send test email
        </Button>
        <output className="text-meta text-muted-foreground">
          {sent ? "Test email sent" : ""}
        </output>
      </div>
    </form>
  );
}

const meta = {
  title: "Foundations/Agents",
  component: NotificationSettings,
  parameters: { layout: "padded" },
} satisfies Meta<typeof NotificationSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AgentReady: Story = {
  play: async ({ canvasElement }) => {
    const components = agent.snapshot().filter((entry) => !entry.offPage && entry.component !== "more");
    for (const entry of components) {
      await expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy();
    }
    const labels = components.map((entry) => entry.label);
    await expect(labels).toContain("Board email");
    await expect(labels).toContain("Weekly digest");
    await expect(labels).toContain("Digest day");

    const email = canvasElement.querySelector<HTMLInputElement>('input[type="email"]');
    const digest = canvasElement.querySelector<HTMLElement>('[data-slot="switch"]');
    if (!email || !digest) throw new Error("The settings form did not render");

    const result = await agent.act({
      steps: [
        { ref: "Board email", action: "setValue", args: ["office@maple-court.example"] },
        { ref: "Weekly digest", action: "setChecked", args: [true] },
        { ref: "Digest day", action: "setValue", args: ["Friday"] },
      ],
    });
    await expect(result.ok, result.error?.message).toBe(true);
    await waitFor(() => expect(canvasElement.querySelector('[data-slot="select-value"]')).toHaveTextContent("Friday"));

    // The confirm-marked button: refused until the person approves, then it runs.
    const send = { steps: [{ ref: "Send test email", action: "press" }] };
    personApproved = false;
    await expect((await agent.act(send)).ok).toBe(false);
    await expect(canvasElement).not.toHaveTextContent("Test email sent");
    personApproved = true;
    const approved = await agent.act(send);
    await expect(approved.ok, approved.error?.message).toBe(true);
    await waitFor(() => expect(canvasElement).toHaveTextContent("Test email sent"));
    await waitFor(() => expect(email.value).toBe("office@maple-court.example"));
    await waitFor(() => expect(digest).toHaveAttribute("data-checked"));

    await checkPattern(digest.parentElement ?? digest, "switch");
  },
};
