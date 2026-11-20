import type { Meta, StoryObj } from "@storybook/react-vite";
import { createAgent } from "@ui-sdk/react/agent";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import { Button } from "#avenue/components/button";
import {
  CollapsibleSection,
  CollapsibleSectionHeader,
  CollapsibleSectionPanel,
  CollapsibleSectionTrigger,
} from "#avenue/components/collapsible-section";
import { Status } from "#avenue/components/status";
import { cn } from "#avenue/lib/utils";

// AVE-121. The board's three full-width rows that open a section: the activity list's day header, the time grid's
// quiet-hours fold, and a message row. All names, addresses and amounts are fictional.

const meta = {
  title: "Components/Collapsible section",
  component: CollapsibleSection,
  parameters: { layout: "padded" },
} satisfies Meta<typeof CollapsibleSection>;

export default meta;
type Story = StoryObj<typeof meta>;

function DayHeader({ defaultOpen = true, today = false }: { defaultOpen?: boolean; today?: boolean }) {
  return (
    <CollapsibleSection defaultOpen={defaultOpen} className="w-160 max-w-full">
      <div className="sticky top-0 z-sticky-group bg-background py-2">
        <CollapsibleSectionHeader>
          <CollapsibleSectionTrigger>
            {today && (
              <span className="grid size-6 place-items-center rounded-full bg-primary text-meta font-semibold text-primary-foreground">
                12
              </span>
            )}
            <span className="text-compact font-emphasis text-foreground">Thursday, November 12</span>
            <span>3</span>
            {today && (
              <span className="text-meta font-semibold tracking-wider text-primary-subtle-foreground uppercase">Today</span>
            )}
          </CollapsibleSectionTrigger>
          <span>$1,240.00 received</span>
        </CollapsibleSectionHeader>
      </div>
      <CollapsibleSectionPanel className="grid gap-3 pb-2">
        {["Dues paid by 14 Elm Row", "Reminder sent to 9 Birch Lane", "Letter mailed to 3 Oak Court"].map((line) => (
          <div key={line} className="rounded-lg border bg-card p-3 text-compact">
            {line}
          </div>
        ))}
      </CollapsibleSectionPanel>
    </CollapsibleSection>
  );
}

/** The activity list's day header: a muted bar, the day's count, and a summary at its end. */
export const DayBar: Story = {
  name: "Day header",
  render: () => <DayHeader today />,
};

export const DayBarClosed: Story = {
  name: "Day header, closed",
  render: () => <DayHeader defaultOpen={false} />,
};

/** The time grid's fold over quiet hours. Its hours draw in the grid's own rows, so it has no panel. */
function QuietFold() {
  const [open, setOpen] = useState(false);
  const hours = open ? ["12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM", "6 AM"] : [];
  return (
    <div className="w-120 max-w-full border">
      <CollapsibleSection variant="fold" open={open} onOpenChange={setOpen}>
        <CollapsibleSectionHeader>
          <CollapsibleSectionTrigger>{open ? "Hide 12 AM – 7 AM" : "12 AM – 7 AM · nothing scheduled"}</CollapsibleSectionTrigger>
        </CollapsibleSectionHeader>
      </CollapsibleSection>
      {[...hours, "7 AM", "8 AM", "9 AM"].map((hour) => (
        <div key={hour} className="h-10 border-b px-2 text-meta text-muted-foreground">
          {hour}
        </div>
      ))}
    </div>
  );
}

export const Fold: Story = {
  name: "Quiet hours fold",
  render: () => <QuietFold />,
};

const messages = [
  {
    id: "m1",
    name: "Robin Avery",
    email: "robin@example.com",
    read: false,
    when: "Nov 12, 9:41 AM",
    message: "Hi, the streetlight at the corner of Elm Row and Birch Lane has been out since Monday. Could the board ask the city to fix it?\n\nThanks, Robin",
  },
  {
    id: "m2",
    name: "Sam Ortiz",
    email: "sam@example.com",
    read: true,
    when: "Nov 10, 4:05 PM",
    message: "Is the pool open for the holiday weekend?",
  },
];

/** A message row: the whole row opens the message, which shows in full with its actions. */
function MessageList() {
  const [openId, setOpenId] = useState<string | undefined>("m1");
  return (
    <ul aria-label="Messages" className="grid w-160 max-w-full gap-2">
      {messages.map((m) => (
        <li key={m.id} className={cn("rounded-md border bg-background px-4 py-3 text-compact", !m.read && "border-primary/40")}>
          <CollapsibleSection
            variant="plain"
            open={openId === m.id}
            onOpenChange={(open) => setOpenId(open ? m.id : undefined)}
            className="grid gap-2"
          >
            <CollapsibleSectionHeader>
              <CollapsibleSectionTrigger>
                {(state) => (
                  <>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={m.read ? "font-quiet" : "font-semibold"}>{m.name}</span>
                      <span className="min-w-0 truncate text-meta text-muted-foreground">{m.email}</span>
                      <span className="ms-auto flex items-center gap-2">
                        {!m.read && (
                          <Status tone="primary" filled>
                            New
                          </Status>
                        )}
                        <span className="text-meta text-muted-foreground">{m.when}</span>
                      </span>
                    </span>
                    <span className={cn("whitespace-pre-line text-foreground", !state.open && "line-clamp-2 text-muted-foreground")}>
                      {m.message}
                    </span>
                  </>
                )}
              </CollapsibleSectionTrigger>
            </CollapsibleSectionHeader>
            <CollapsibleSectionPanel className="flex flex-wrap items-center gap-controls">
              <Button size="sm">Reply to {m.name}</Button>
              <Button size="sm" variant="outline">
                Dismiss {m.name}’s message
              </Button>
            </CollapsibleSectionPanel>
          </CollapsibleSection>
        </li>
      ))}
    </ul>
  );
}

export const MessageRow: Story = {
  name: "Message row",
  render: () => <MessageList />,
};

/** Keyboard: Tab reaches the bar, Enter and Space toggle it, and closing with focus inside returns focus to it. */
export const Keyboard: Story = {
  render: () => <DayHeader defaultOpen={false} />,
  play: async ({ canvas, step }) => {
    const trigger = canvas.getByRole("button", { name: /Thursday, November 12/ });

    await step("a real button, closed, with nothing under it", async () => {
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(canvas.queryByText("Dues paid by 14 Elm Row")).not.toBeInTheDocument();
    });

    await step("Tab focuses it with a visible ring", async () => {
      await userEvent.tab();
      await expect(trigger).toHaveFocus();
      await expect(getComputedStyle(trigger).boxShadow).not.toBe("none");
    });

    await step("Enter opens it; the trigger controls the panel", async () => {
      await userEvent.keyboard("{Enter}");
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      const panel = trigger.getAttribute("aria-controls");
      await expect(panel).toBeTruthy();
      await expect(canvas.getByText("Dues paid by 14 Elm Row").closest(`[id="${panel}"]`)).not.toBeNull();
    });

    await step("Space closes it", async () => {
      await userEvent.keyboard(" ");
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    await step("the summary beside the trigger isn't part of its name", async () => {
      await expect(trigger).not.toHaveAccessibleName(/received/);
    });
  },
};

/** The fold reports its state though its hours draw elsewhere; the message row opens and reveals its actions. */
export const FoldAndMessageKeyboard: Story = {
  name: "Fold and message row, by keyboard",
  render: () => (
    <div className="grid gap-6">
      <QuietFold />
      <MessageList />
    </div>
  ),
  play: async ({ canvas, step }) => {
    await step("the fold opens and renames itself", async () => {
      const fold = canvas.getByRole("button", { name: /nothing scheduled/ });
      fold.focus();
      await userEvent.keyboard("{Enter}");
      const open = canvas.getByRole("button", { name: "Hide 12 AM – 7 AM" });
      await expect(open).toHaveAttribute("aria-expanded", "true");
      await expect(open).toHaveFocus();
      await expect(canvas.getByText("3 AM")).toBeInTheDocument();
    });

    await step("an open message shows its actions; Tab goes into them", async () => {
      const robin = canvas.getByRole("button", { name: /^Robin Avery/ });
      await expect(robin).toHaveAttribute("aria-expanded", "true");
      robin.focus();
      await userEvent.tab();
      await expect(canvas.getByRole("button", { name: "Reply to Robin Avery" })).toHaveFocus();
    });

    await step("opening another message closes the first", async () => {
      const sam = canvas.getByRole("button", { name: /^Sam Ortiz/ });
      sam.focus();
      await userEvent.keyboard(" ");
      await expect(sam).toHaveAttribute("aria-expanded", "true");
      await expect(canvas.getByRole("button", { name: /^Robin Avery/ })).toHaveAttribute("aria-expanded", "false");
      await expect(canvas.queryByRole("button", { name: "Reply to Robin Avery" })).not.toBeInTheDocument();
    });
  },
};

/** An agent finds the day header by its day, reads that it's closed, and opens it. */
export const Agent: Story = {
  tags: ["agent"],
  render: () => <DayHeader defaultOpen={false} />,
  play: async ({ canvas }) => {
    const agent = createAgent();
    const found = agent.snapshot().filter((entry) => !entry.offPage && /Thursday, November 12/.test(entry.label ?? ""));
    await expect(found).toHaveLength(1);
    await expect(found[0]?.["open"]).toBe(false);
    const result = await agent.act({ steps: [{ ref: found[0]!.ref, action: "setOpen", args: [true] }] });
    await expect(result.ok, result.error?.message).toBe(true);
    await expect(canvas.getByRole("button", { name: /Thursday, November 12/ })).toHaveAttribute("aria-expanded", "true");
  },
};

/**
 * `variant="disclosure"`: secondary detail under a muted one-line summary, as wide as its label. It is the shape the
 * old Disclosure drew (AVE-149; AVE-154 removed Disclosure). Enter and Space toggle it.
 */
export const Disclosure: Story = {
  render: () => (
    <CollapsibleSection variant="disclosure">
      <CollapsibleSectionTrigger>Advanced</CollapsibleSectionTrigger>
      <CollapsibleSectionPanel>
        <p>
          Stripe customer <code className="font-mono">cus_TEST0001</code>
        </p>
      </CollapsibleSectionPanel>
    </CollapsibleSection>
  ),
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Advanced" });
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByText("cus_TEST0001")).toBeVisible();
    await userEvent.keyboard(" ");
    await expect(button).toHaveAttribute("aria-expanded", "false");
  },
};
