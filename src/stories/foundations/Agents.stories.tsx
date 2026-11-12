import type { Meta, StoryObj } from "@storybook/react-vite";
import { checkPattern } from "@ui-sdk/core/testing";
import { createAgent } from "@ui-sdk/react/agent";
import { Field, FieldDescription, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { expect, waitFor } from "storybook/test";

// How an Avenue screen stays usable by an agent (ui-sdk's docs/agents.md and the skill's agent-ready.md):
// every control is a ui-sdk part with a name, and state changes go through the parts' change callbacks.
// The play function is the agent test ui-sdk asks for: it reads the controls through createAgent and
// changes them the way an agent would, then runs ui-sdk's WAI-ARIA check on the switch. The look is
// Avenue's tokens on ui-sdk's unstyled parts; these are not Avenue components (AVE-17 builds those).

const agent = createAgent();

function NotificationSettings() {
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
          className="h-control-md rounded-lg border border-input bg-background px-3 text-control shadow-control outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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

    const email = canvasElement.querySelector<HTMLInputElement>('input[type="email"]');
    const digest = canvasElement.querySelector<HTMLElement>('[data-slot="switch"]');
    if (!email || !digest) throw new Error("The settings form did not render");

    const result = await agent.act({
      steps: [
        { ref: "Board email", action: "setValue", args: ["office@maple-court.example"] },
        { ref: "Weekly digest", action: "setChecked", args: [true] },
      ],
    });
    await expect(result.ok, result.error?.message).toBe(true);
    await waitFor(() => expect(email.value).toBe("office@maple-court.example"));
    await waitFor(() => expect(digest).toHaveAttribute("data-checked"));

    await checkPattern(digest.parentElement ?? digest, "switch");
  },
};
