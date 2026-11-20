import type { Meta, StoryObj } from "@storybook/react-vite";
import { createAgent } from "@ui-sdk/react/agent";
import { CornerUpLeft, SmilePlus } from "lucide-react";
import { expect, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import {
  Message,
  MessageActions,
  MessageBubble,
  MessageMeta,
  MessageQuote,
  MessageRow,
  MessageRun,
  MessageRunAvatar,
  MessageRunContent,
  MessageRunSender,
  MessageStatus,
} from "#avenue/components/message";
import {
  chatRuns,
  chatTime,
  dmThread,
  groupThread,
  longUnbrokenText,
  me,
  messageById,
  people,
  personById,
  type ChatMessage,
  type ChatThread,
} from "./chat-kit";

// AVE-133. One sender's run of messages and each message in it, in Management's look, with Neighbors' hidden sender
// text. Every name and message is fictional (chat-kit.ts, shared with the message list and composer stories).

const meta = {
  title: "Components/Message",
  component: MessageRun,
} satisfies Meta<typeof MessageRun>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The app's own actions for a message, as Management draws them: React and Reply. */
function AppActions({ message }: { message: ChatMessage }) {
  const sender = message.senderId === me.id ? "your message" : personById(message.senderId).name;
  return (
    <MessageActions>
      <Button variant="ghost" size="icon-xs" aria-label={`React to ${sender}`}>
        <SmilePlus />
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label={`Reply to ${sender}`}>
        <CornerUpLeft />
      </Button>
    </MessageActions>
  );
}

function OneMessage({ thread, message, last }: { thread: ChatThread; message: ChatMessage; last: boolean }) {
  const quoted = messageById(thread, message.replyToId);
  const delivery = message.delivery ?? "sent";
  const live = delivery === "sent" && !message.deleted;
  return (
    <Message
      deleted={message.deleted}
      delivery={delivery}
      edited={message.editedAt !== undefined}
      time={chatTime(message.at, "full")}
    >
      {quoted && (
        <MessageQuote sender={quoted.senderId === me.id ? "you" : personById(quoted.senderId).name} deleted={quoted.deleted}>
          {quoted.body}
        </MessageQuote>
      )}
      <MessageRow>
        <MessageBubble>{message.body}</MessageBubble>
        {live && <AppActions message={message} />}
      </MessageRow>
      {(delivery === "failed" || (delivery === "pending" && last)) && (
        <MessageStatus>
          <Button variant="text" className="text-meta font-[600] text-current" aria-label="Retry sending">
            Retry
          </Button>
          <Button
            variant="text"
            className="text-meta text-current"
            aria-label="Delete unsent message"
            data-agent-confirm="Deletes a message that wasn't sent"
          >
            Delete
          </Button>
        </MessageStatus>
      )}
      {last && delivery === "sent" && <MessageMeta>{chatTime(message.at)}</MessageMeta>}
    </Message>
  );
}

/** A thread drawn from the fixture: runs with an avatar and, in a group, the sender's name. */
function Thread({ thread }: { thread: ChatThread }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2" data-testid="thread">
      {chatRuns(thread.messages).map((run) => (
        <MessageRun key={run.key} from={run.from} sender={run.sender.name}>
          {run.from === "them" && <MessageRunAvatar name={run.sender.name} tintKey={run.sender.id} />}
          <MessageRunContent>
            {run.from === "them" && thread.kind === "group" && <MessageRunSender>{run.sender.name}</MessageRunSender>}
            {run.messages.map((message, i) => (
              <OneMessage key={message.id} thread={thread} message={message} last={i === run.messages.length - 1} />
            ))}
          </MessageRunContent>
        </MessageRun>
      ))}
    </div>
  );
}

/** A chat window's width, on the window's popover surface. */
function Window({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div data-testid="window" className={`m-inset w-82 max-w-[calc(100%-2rem)] rounded-xl border bg-popover ${className ?? ""}`}>{children}</div>
  );
}

const bubbles = () => [...document.querySelectorAll<HTMLElement>("[data-slot=message-bubble]")];
const bubbleWith = (text: string) => bubbles().find((b) => b.textContent?.includes(text))!;

/** Every run is a group named by its sender, and every bubble's text starts with who sent it. */
async function expectWhoSpoke(thread: ChatThread) {
  const runs = [...document.querySelectorAll<HTMLElement>("[data-slot=message-run]")];
  for (const [index, run] of chatRuns(thread.messages).entries()) {
    const el = runs[index]!;
    await expect(el).toHaveRole("group");
    await expect(el).toHaveAccessibleName(run.from === "me" ? "Your messages" : `Messages from ${run.sender.name}`);
    for (const bubble of el.querySelectorAll<HTMLElement>("[data-slot=message-bubble]")) {
      await expect(bubble.textContent).toMatch(new RegExp(`^${run.from === "me" ? "You" : run.sender.name}: `));
    }
  }
  for (const name of document.querySelectorAll("[data-slot=message-run-sender], [data-slot=message-meta]")) {
    await expect(name).toHaveAttribute("aria-hidden", "true");
  }
}

/** A conversation with Ana: edited, a reply, a link that won't break at a space, a failed and a pending message. */
export const DirectMessage: Story = {
  args: { from: "them", sender: people.ana.name },
  render: () => (
    <Window>
      <Thread thread={dmThread} />
    </Window>
  ),
  play: async ({ canvas }) => {
    await expectWhoSpoke(dmThread);
    // The accessible text of a bubble that draws no name: sender first, the full time last.
    await expect(bubbleWith("Did the pool quotes").textContent).toBe(
      "Ana Ruiz: Did the pool quotes come in?, Wednesday, November 11 at 6:02 PM",
    );
    await expect(bubbleWith("Two of three").textContent).toBe(
      "You: Two of three. The third visits Thursday., edited, Wednesday, November 11 at 6:10 PM",
    );
    // Yours on the end side in the primary fill, theirs on the start side.
    const mine = bubbleWith("Two of three").getBoundingClientRect();
    const theirs = bubbleWith("Did the pool quotes").getBoundingClientRect();
    await expect(mine.right).toBeGreaterThan(theirs.right);
    await expect(theirs.left).toBeLessThan(mine.left);
    // The reply's quote says who wrote it.
    const quote = document.querySelector<HTMLElement>("[data-slot=message-quote]")!;
    await expect(quote.textContent).toBe("Replying to you: I'll put both in the board folder.");
    // Failed: a ring and an alert that says so, then Retry and Delete; pending: "Sending…".
    const failed = bubbleWith(longUnbrokenText);
    await expect(getComputedStyle(failed).boxShadow).not.toBe("none");
    await expect(canvas.getByRole("alert")).toHaveTextContent("Not sent");
    await expect(canvas.getByRole("status")).toHaveTextContent("Sending…");
    await expect(canvas.getByRole("button", { name: "Delete unsent message" })).toHaveAttribute("data-agent-confirm");
    await expect(getComputedStyle(bubbleWith("6:30 at the clubhouse")).filter).toBe("saturate(0.35)");
    // Neither shows actions: only a sent message can be reacted to or replied to.
    await expect(failed.closest("[data-slot=message]")!.querySelector("[data-slot=message-actions]")).toBeNull();
  },
};

/** The board's thread: names over others' runs, a deleted message, a reply to it, and Arabic text in a bubble. */
export const GroupThread: Story = {
  args: { from: "them", sender: people.sam.name },
  render: () => (
    <Window>
      <Thread thread={groupThread} />
    </Window>
  ),
  play: async () => {
    await expectWhoSpoke(groupThread);
    const senders = [...document.querySelectorAll("[data-slot=message-run-sender]")].map((s) => s.textContent);
    await expect(senders).toEqual([people.sam.name, people.priya.name, people.rafael.name, people.priya.name, people.ana.name]);
    // Deleted: the body is never drawn, the text says so, and a reply to it says so too.
    const deleted = document.querySelector<HTMLElement>("[data-slot=message][data-deleted] [data-slot=message-bubble]")!;
    await expect(deleted.textContent).toBe("Priya Nandakumar: Message deleted, Thursday, November 12 at 8:55 AM");
    await expect(getComputedStyle(deleted).borderStyle).toBe("dashed");
    await expect(getComputedStyle(deleted).fontStyle).toBe("italic");
    const quotes = [...document.querySelectorAll<HTMLElement>("[data-slot=message-quote]")];
    await expect(quotes[0]!.textContent).toBe("Replying to Priya Nandakumar: Message deleted");
  },
};

/** Every message in a narrow window: a link with no spaces breaks inside the bubble instead of widening it. */
export const LongUnbrokenText: Story = {
  args: { from: "me", sender: me.name },
  render: () => (
    <Window className="w-64">
      <div className="flex flex-col gap-1 px-3 py-2">
        <MessageRun from="them" sender={people.rafael.name}>
          <MessageRunAvatar name={people.rafael.name} tintKey={people.rafael.id} />
          <MessageRunContent>
            <Message time="Thursday, November 12, 9:05 AM">
              <MessageRow>
                <MessageBubble>{longUnbrokenText}</MessageBubble>
              </MessageRow>
            </Message>
          </MessageRunContent>
        </MessageRun>
        <MessageRun from="me" sender={me.name}>
          <MessageRunContent>
            <Message time="Thursday, November 12, 9:06 AM">
              <MessageQuote sender={people.rafael.name}>{longUnbrokenText}</MessageQuote>
              <MessageRow>
                <MessageBubble>{longUnbrokenText}</MessageBubble>
              </MessageRow>
            </Message>
          </MessageRunContent>
        </MessageRun>
      </div>
    </Window>
  ),
  play: async () => {
    const frame = document.querySelector<HTMLElement>("[data-testid=window]")!.getBoundingClientRect();
    for (const bubble of bubbles()) {
      const box = bubble.getBoundingClientRect();
      await expect(box.right).toBeLessThanOrEqual(frame.right);
      await expect(box.left).toBeGreaterThanOrEqual(frame.left);
      await expect(bubble.scrollWidth).toBeLessThanOrEqual(bubble.clientWidth);
      // The run takes at most 82% of the row.
      const run = bubble.closest<HTMLElement>("[data-slot=message-run-content]")!;
      const row = run.parentElement!.getBoundingClientRect().width;
      await expect(run.getBoundingClientRect().width).toBeLessThanOrEqual(row * 0.82 + 0.5);
    }
    // The quote stays on one line and truncates.
    const quote = document.querySelector<HTMLElement>("[data-slot=message-quote]")!;
    await expect(getComputedStyle(quote).textOverflow).toBe("ellipsis");
  },
};

/** Right to left: yours on the left, theirs on the right, with no change to the markup. */
export const RightToLeft: Story = {
  args: { from: "them", sender: people.ana.name },
  render: () => (
    <div dir="rtl">
      <Window>
        <Thread thread={dmThread} />
      </Window>
    </div>
  ),
  play: async () => {
    const mine = bubbleWith("Two of three").getBoundingClientRect();
    const theirs = bubbleWith("Did the pool quotes").getBoundingClientRect();
    await expect(mine.left).toBeLessThan(theirs.left);
    const avatar = document.querySelector<HTMLElement>("[data-slot=message-run-avatar]")!.getBoundingClientRect();
    await expect(avatar.left).toBeGreaterThan(theirs.right - 1);
  },
};

/** The actions fade in on hover and while focus is inside the message; Tab reaches them either way. */
export const Actions: Story = {
  args: { from: "them", sender: people.ana.name },
  render: () => (
    <Window>
      <Thread thread={{ ...dmThread, messages: dmThread.messages.slice(0, 1) }} />
    </Window>
  ),
  play: async ({ canvas }) => {
    const actions = document.querySelector<HTMLElement>("[data-slot=message-actions]")!;
    const touch = matchMedia("(pointer: coarse)").matches;
    // A touch screen has no hover, so they always show there.
    await expect(getComputedStyle(actions).opacity).toBe(touch ? "1" : "0");
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "React to Ana Ruiz" })).toHaveFocus();
    await waitFor(() => expect(getComputedStyle(actions).opacity).toBe("1"));
    await userEvent.keyboard("{Enter}");
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Reply to Ana Ruiz" })).toHaveFocus();
    await userEvent.keyboard(" ");
    await userEvent.tab({ shift: true });
    await userEvent.tab({ shift: true });
    (document.activeElement as HTMLElement | null)?.blur();
    if (!touch) await waitFor(() => expect(getComputedStyle(actions).opacity).toBe("0"));
  },
};

/** At phone width, on the phone's own screen: the run still caps at 82%, and the actions show without a hover. */
export const Phone: Story = {
  args: { from: "them", sender: people.sam.name },
  globals: { viewport: { value: "phone" } },
  render: () => (
    <div className="bg-background">
      <Thread thread={groupThread} />
    </div>
  ),
  play: async () => {
    await expectWhoSpoke(groupThread);
    const touch = matchMedia("(pointer: coarse)").matches;
    for (const actions of document.querySelectorAll<HTMLElement>("[data-slot=message-actions]")) {
      await expect(getComputedStyle(actions).opacity).toBe(touch ? "1" : "0");
    }
  },
};

/** The agent finds a message's actions by the sender they name, and the confirm on deleting an unsent message. */
export const Agent: Story = {
  tags: ["agent"],
  args: { from: "them", sender: people.ana.name },
  render: () => (
    <Window>
      <Thread thread={dmThread} />
    </Window>
  ),
  play: async ({ canvas }) => {
    const agent = createAgent();
    const labels = agent.snapshot().filter((entry) => !entry.offPage).map((entry) => entry.label);
    await expect(labels).toContain("Reply to Ana Ruiz");
    await expect(labels).toContain("Retry sending");
    await expect(labels).toContain("Delete unsent message");
    const result = await agent.act({ steps: [{ ref: "Retry sending", action: "press" }] });
    await expect(result.ok, result.error?.message).toBe(true);
    await expect(canvas.getByRole("button", { name: "Retry sending" })).toBeInTheDocument();
  },
};

/** Management's bubble markup today, copied (not imported), beside Avenue's for the same two messages. */
export const BesideManagement: Story = {
  args: { from: "them", sender: people.ana.name },
  render: () => (
    <Window>
      <div className="flex flex-col gap-4 px-3 py-2">
        <p className="text-meta text-muted-foreground">Management today</p>
        <div data-testid="management" className="flex flex-col gap-1">
          <div className="flex items-end gap-[6px]">
            <span className="w-7 shrink-0 self-end">
              <span className="block size-7 rounded-full bg-accent" />
            </span>
            <div className="flex min-w-0 max-w-[82%] flex-col items-start gap-0.5">
              <p className="min-w-0 max-w-full rounded-[1rem] bg-foreground/10 px-3 py-[6px] text-control wrap-break-word whitespace-pre-wrap text-foreground">
                {dmThread.messages[0]!.body}
              </p>
            </div>
          </div>
          <div className="flex flex-row-reverse items-end gap-[6px]">
            <div className="flex min-w-0 max-w-[82%] flex-col items-end gap-0.5">
              <p className="min-w-0 max-w-full rounded-[1rem] bg-primary px-3 py-[6px] text-control wrap-break-word whitespace-pre-wrap text-primary-foreground">
                {dmThread.messages[3]!.body}
              </p>
            </div>
          </div>
        </div>
        <p className="text-meta text-muted-foreground">Avenue</p>
        <div data-testid="avenue" className="flex flex-col gap-1">
          <MessageRun from="them" sender={people.ana.name}>
            <MessageRunAvatar name={people.ana.name} tintKey={people.ana.id} />
            <MessageRunContent>
              <Message>
                <MessageRow>
                  <MessageBubble>{dmThread.messages[0]!.body}</MessageBubble>
                </MessageRow>
              </Message>
            </MessageRunContent>
          </MessageRun>
          <MessageRun from="me" sender={me.name}>
            <MessageRunContent>
              <Message>
                <MessageRow>
                  <MessageBubble>{dmThread.messages[3]!.body}</MessageBubble>
                </MessageRow>
              </Message>
            </MessageRunContent>
          </MessageRun>
        </div>
      </div>
    </Window>
  ),
  play: async ({ canvas }) => {
    const theirs = [...canvas.getByTestId("management").querySelectorAll<HTMLElement>("p")];
    const ours = [...canvas.getByTestId("avenue").querySelectorAll<HTMLElement>("[data-slot=message-bubble]")];
    for (const [i, bubble] of ours.entries()) {
      const a = getComputedStyle(theirs[i]!);
      const b = getComputedStyle(bubble);
      for (const prop of ["backgroundColor", "color", "paddingInlineStart", "fontSize", "lineHeight"] as const) {
        await expect(b[prop], prop).toBe(a[prop]);
      }
      // AVE-2: the corner is xl (14px, 2xl is retired) and the 6px top and bottom padding moves onto the grid at 8px.
      await expect([a.borderTopLeftRadius, b.borderTopLeftRadius]).toEqual(["16px", "14px"]);
      await expect([a.paddingTop, b.paddingTop]).toEqual(["6px", "8px"]);
      await expect(bubble.getBoundingClientRect().height).toBe(theirs[i]!.getBoundingClientRect().height + 4);
      // Same width; theirs starts 2px further in, as the avatar's 6px gap moves onto the grid at 8px.
      await expect(bubble.getBoundingClientRect().width).toBeCloseTo(theirs[i]!.getBoundingClientRect().width, 0);
    }
  },
};
