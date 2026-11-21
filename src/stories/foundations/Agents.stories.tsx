import type { Meta, StoryObj } from "@storybook/react-vite";
import { checkPattern } from "@ui-sdk/core/testing";
import { createAgent } from "@ui-sdk/react/agent";
import { Button } from "@ui-sdk/react/button";
import { Field, FieldDescription, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui-sdk/react/select";
import { createHistory, describeEntry, stageChanges, type HistoryEntry } from "@ui-sdk/react/history";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { useEffect, useRef, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Button as AvenueButton } from "#avenue/components/button";

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
  "h-control-md rounded-lg border border-input bg-background px-3 text-control outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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

// History and suggestions (AVE-214, ui-sdk's "History and Undo"). Avenue never creates the bridge or the history; an
// app does. These stories show what Avenue's parts make possible: every change is recorded with who made it, the
// agent's changes come back off as a whole while the person's stay, and a suggestion is tried on the real controls and
// taken back. Avenue's own parts that change state after an await (form dialog, pending confirm, composer) wrap that
// change in `withSource`, so it is recorded as the agent's too; their stories test it.

type Settings = { "Board email": string; "Weekly digest": boolean; "Digest day": string };

function readSettings(root: HTMLElement): Settings {
  return {
    "Board email": root.querySelector<HTMLInputElement>('input[type="email"]')?.value ?? "",
    "Weekly digest": root.querySelector('[data-slot="switch"]')?.hasAttribute("data-checked") ?? false,
    "Digest day": root.querySelector('[data-slot="select-value"]')?.textContent ?? "",
  };
}

/** What the history panel lists: each entry in words, the undone ones marked. */
const line = (entry: HistoryEntry) => `${describeEntry(entry)}${entry.reverted ? " (undone)" : ""}`;

function SettingsWithHistory() {
  const root = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<ReturnType<typeof createHistory>>();
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    const recorded = createHistory(agent, { within: () => root.current?.querySelector("form") });
    setHistory(recorded);
    const stop = recorded.subscribe(() => setLines(recorded.entries().map(line)));
    return () => {
      stop();
      recorded.destroy();
    };
  }, []);
  return (
    <div ref={root} className="flex flex-col gap-section">
      <NotificationSettings />
      <section aria-label="Changes" className="flex max-w-md flex-col gap-group">
        <h2 className="text-control font-medium">Changes</h2>
        <ol className="flex flex-col gap-inline text-meta text-muted-foreground" data-testid="history">
          {lines.map((text, index) => (
            <li key={index}>{text}</li>
          ))}
        </ol>
        <div>
          <AvenueButton variant="outline" size="sm" disabled={!history} onClick={() => history?.undoSource("agent")}>
            Undo the agent's changes
          </AvenueButton>
        </div>
      </section>
    </div>
  );
}

/**
 * `createHistory` records every change in words, with who made it. The agent fills the form, the person then types
 * their own board email, and Undo the agent's changes takes back the agent's switch and day and keeps the person's
 * email: `undoSource("agent")` restores each key to the latest value from another source, or to where it started.
 */
export const History: Story = {
  render: () => <SettingsWithHistory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const form = canvas.getByRole("form", { name: "Notification settings" });
    const started = readSettings(form);
    await expect(started).toEqual({ "Board email": "board@maple-court.example", "Weekly digest": false, "Digest day": "Monday" });
    const undo = canvas.getByRole("button", { name: "Undo the agent's changes" });
    await waitFor(() => expect(undo).not.toHaveAttribute("aria-disabled", "true"));

    const result = await agent.act({
      steps: [
        { ref: "Board email", action: "setValue", args: ["office@maple-court.example"] },
        { ref: "Weekly digest", action: "setChecked", args: [true] },
        { ref: "Digest day", action: "setValue", args: ["Friday"] },
      ],
    });
    await expect(result.ok, result.error?.message).toBe(true);
    await waitFor(() => expect(readSettings(form)["Digest day"]).toBe("Friday"));

    // The person writes their own email over the agent's.
    const email = canvas.getByRole("textbox", { name: "Board email" });
    await userEvent.clear(email);
    await userEvent.type(email, "chair@maple-court.example");
    const history = canvas.getByTestId("history");
    await waitFor(() => expect(history).toHaveTextContent("Agent set Weekly digest"));

    await userEvent.click(undo);
    await waitFor(() =>
      expect(readSettings(form)).toEqual({
        "Board email": "chair@maple-court.example",
        "Weekly digest": false,
        "Digest day": "Monday",
      }),
    );
    await waitFor(() => expect(history).toHaveTextContent("(undone)"));
  },
};

function SettingsWithSuggestion() {
  const [staged, setStaged] = useState<Awaited<ReturnType<typeof stageChanges>>>();
  return (
    <div className="flex flex-col gap-section">
      <NotificationSettings />
      <section aria-label="Suggestion" className="flex max-w-md flex-col gap-group">
        <p className="text-meta text-muted-foreground">
          {staged ? "The agent suggests a weekly digest on Fridays. Keep it?" : "No suggestion yet."}
        </p>
        <div className="flex gap-controls">
          {staged ? (
            <>
              <AvenueButton size="sm" onClick={() => setStaged(undefined)}>
                Keep suggestion
              </AvenueButton>
              <AvenueButton
                variant="outline"
                size="sm"
                onClick={async () => {
                  await staged.revert();
                  setStaged(undefined);
                }}
              >
                Put it back
              </AvenueButton>
            </>
          ) : (
            <AvenueButton
              variant="outline"
              size="sm"
              onClick={async () =>
                setStaged(
                  await stageChanges(agent, [
                    { ref: "Weekly digest", key: "checked", value: true },
                    { ref: "Digest day", value: "friday" },
                  ]),
                )
              }
            >
              Show the agent's suggestion
            </AvenueButton>
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * `stageChanges` puts the agent's suggestion on the real controls, so the person sees it in place; `revert()` puts
 * the old values back if they say no, and leaving it keeps it.
 */
export const Suggestion: Story = {
  render: () => <SettingsWithSuggestion />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const form = canvas.getByRole("form", { name: "Notification settings" });
    const before = readSettings(form);
    const suggested = { ...before, "Weekly digest": true, "Digest day": "Friday" };

    await userEvent.click(await canvas.findByRole("button", { name: "Show the agent's suggestion" }));
    await waitFor(() => expect(readSettings(form)).toEqual(suggested));
    await userEvent.click(await canvas.findByRole("button", { name: "Put it back" }));
    await waitFor(() => expect(readSettings(form)).toEqual(before));

    await userEvent.click(await canvas.findByRole("button", { name: "Show the agent's suggestion" }));
    await waitFor(() => expect(readSettings(form)).toEqual(suggested));
    await userEvent.click(await canvas.findByRole("button", { name: "Keep suggestion" }));
    await expect(readSettings(form)).toEqual(suggested);
    await expect(canvas.getByText("No suggestion yet.")).toBeInTheDocument();
  },
};
