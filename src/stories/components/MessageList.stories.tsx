import type { Meta, StoryObj } from "@storybook/react-vite";
import { createAgent } from "@ui-sdk/react/agent";
import { Fragment, useState, type ReactNode } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Composer, ComposerField, ComposerSend } from "#avenue/components/composer";
import { InitialsAvatar } from "#avenue/components/initials-avatar";
import {
  Message,
  MessageBubble,
  MessageMeta,
  MessageRow,
  MessageRun,
  MessageRunAvatar,
  MessageRunContent,
} from "#avenue/components/message";
import { MessageList, MessageListDay, type MessageListStatus } from "#avenue/components/message-list";
import { cn } from "#avenue/lib/utils";
import {
  chatNow,
  chatRuns,
  chatTime,
  chatTimeZone,
  dmThread,
  earlierMessages,
  me,
  people,
  type ChatMessage,
} from "./chat-kit";

// AVE-132. A chat thread's messages: follows new ones at the end, keeps the reader's place when they scroll up.
// Threads come from the shared chat fixture (chat-kit.ts), drawn with Avenue's message bubbles (AVE-133).

const meta = {
  title: "Components/Message list",
  component: MessageList,
} satisfies Meta<typeof MessageList>;
export default meta;
type Story = StoryObj<typeof meta>;
type Canvas = Parameters<NonNullable<Story["play"]>>[0]["canvas"];

const dateIn = (at: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: chatTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(at),
  );
const today = dateIn(chatNow);
const yesterday = dateIn(new Date(Date.parse(chatNow) - 86_400_000).toISOString());

/** The day row's words, as both apps write them. Grouping by day is the app's; this is the story's own. */
function dayLabel(at: string) {
  const date = dateIn(at);
  if (date === today) return "Today";
  if (date === yesterday) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", { timeZone: chatTimeZone, weekday: "short", month: "short", day: "numeric" }).format(
    new Date(at),
  );
}

/** A day's messages as runs of Avenue's bubbles (AVE-133); grouping into runs and days is the app's, here the story's. */
function Rows({ messages }: { messages: ChatMessage[] }) {
  const days: ChatMessage[][] = [];
  for (const message of messages) {
    const day = days.at(-1);
    if (day && dateIn(day[0]!.at) === dateIn(message.at)) day.push(message);
    else days.push([message]);
  }
  return days.map((day) => (
    <Fragment key={dateIn(day[0]!.at)}>
      <MessageListDay>{dayLabel(day[0]!.at)}</MessageListDay>
      {chatRuns(day).map((run) => (
        <MessageRun key={run.key} from={run.from} sender={run.sender.name}>
          {run.from === "them" && <MessageRunAvatar name={run.sender.name} tintKey={run.sender.id} />}
          <MessageRunContent>
            {run.messages.map((message, i) => (
              <Message key={message.id} data-message={message.id} time={chatTime(message.at, "full")}>
                <MessageRow>
                  <MessageBubble>{message.body}</MessageBubble>
                </MessageRow>
                {i === run.messages.length - 1 && <MessageMeta>{chatTime(message.at)}</MessageMeta>}
              </Message>
            ))}
          </MessageRunContent>
        </MessageRun>
      ))}
    </Fragment>
  ));
}

/** A dock window's body: the list takes the room above a stand-in composer. */
function Frame({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return (
    <div className={cn("flex h-96 w-82 max-w-full flex-col overflow-hidden rounded-xl border bg-popover", className)}>
      {children}
    </div>
  );
}

/** A page of history before the DM, so the thread is long enough to scroll. */
const longThread = [...earlierMessages(dmThread, 12, 1), ...dmThread.messages];
const lastPage = 3;

function Thread({
  initial = longThread,
  earlier = false,
  status = "ready",
  typing,
  empty,
  className,
}: {
  initial?: ChatMessage[];
  /** Whether "Earlier messages" loads more pages of history above. */
  earlier?: boolean;
  status?: MessageListStatus;
  typing?: string;
  empty?: ReactNode;
  className?: string;
}) {
  const [messages, setMessages] = useState(initial);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(0);
  const [state, setState] = useState(status);
  const add = (mine: boolean, text = "On my way to the clubhouse.") => {
    const n = sent + 1;
    setSent(n);
    const message: ChatMessage = mine
      ? { id: `arrival-${n}`, senderId: me.id, at: chatNow, body: text }
      : { id: `arrival-${n}`, senderId: people.ana.id, at: chatNow, body: `New note ${n} from Ana.` };
    setMessages((m) => [...m, message]);
  };
  const last = messages.at(-1);
  return (
    <div className="flex flex-col gap-4 p-inset">
      <Frame className={className}>
        <MessageList
          aria-label={`Messages with ${dmThread.title}`}
          count={messages.length}
          newest={last?.id}
          newestMine={last?.senderId === me.id}
          hasEarlier={earlier && page < lastPage}
          loadingEarlier={loading}
          onLoadEarlier={() => {
            setLoading(true);
            setTimeout(() => {
              setMessages((m) => [...earlierMessages(dmThread, 12, page + 1), ...m]);
              setPage(page + 1);
              setLoading(false);
            }, 300);
          }}
          status={state}
          onRetry={() => setState("ready")}
          empty={empty}
          typing={typing}
          typingAvatar={<InitialsAvatar name={people.ana.name} tintKey={people.ana.id} decorative />}
        >
          <Rows messages={messages} />
        </MessageList>
        <div className="border-t p-2">
          <Composer onSend={(text) => add(true, text)}>
            <ComposerField aria-label={`Message ${dmThread.title}`} placeholder="Message" />
            <ComposerSend />
          </Composer>
        </div>
      </Frame>
      <div className="flex flex-wrap gap-controls">
        <Button variant="outline" size="sm" onClick={() => add(false)}>
          Ana sends one
        </Button>
        <Button variant="outline" size="sm" onClick={() => add(true)}>
          You send one
        </Button>
      </div>
    </div>
  );
}

const logOf = (canvas: Canvas) => canvas.getByRole("log", { name: "Messages with Ana Ruiz" });
const distanceFromEnd = (el: HTMLElement) => el.scrollHeight - el.scrollTop - el.clientHeight;
const atEnd = (el: HTMLElement) => expect(distanceFromEnd(el)).toBeLessThan(2);
const jumpOf = (canvas: Canvas) => canvas.queryByRole("button", { name: /new message/ });

async function scrollUp(log: HTMLElement) {
  log.scrollTop = 0;
  log.dispatchEvent(new Event("scroll"));
  await waitFor(() => expect(distanceFromEnd(log)).toBeGreaterThan(100));
}

/** A thread open at its newest message, with day rows and the typing line. */
export const Default: Story = {
  args: { count: 0 },
  render: () => <Thread typing="Ana is typing" />,
  play: async ({ canvas }) => {
    const log = logOf(canvas);
    await expect(log).toHaveAttribute("aria-relevant", "additions");
    await waitFor(() => atEnd(log));
    // The typing line is its own polite status, outside the log, so it is heard but never logged.
    const typing = canvas.getByRole("status");
    await expect(typing).toHaveTextContent("Ana is typing");
    await expect(log.contains(typing)).toBe(false);
    // Day rows are plain text in the log, read as the reader passes them.
    await expect(canvas.getByText("Yesterday")).toHaveAttribute("data-slot", "message-list-day");
    await expect(log.contains(canvas.getByText("Yesterday"))).toBe(true);
    // The log is a Tab stop, so the keyboard can scroll it.
    await userEvent.tab();
    await expect(log).toHaveFocus();
    await expect(jumpOf(canvas)).toBeNull();
    // Management's spacing: 4px between rows.
    await expect(getComputedStyle(log).rowGap).toBe("4px");
  },
};

/** At the end, a new message scrolls into view; scrolled up, the reader keeps their place and gets a count. */
export const ArrivalWhileScrolledUp: Story = {
  args: { count: 0 },
  render: () => <Thread />,
  play: async ({ canvas }) => {
    const log = logOf(canvas);
    await waitFor(() => atEnd(log));
    await userEvent.click(canvas.getByRole("button", { name: "Ana sends one" }));
    await waitFor(() => expect(log).toHaveTextContent("New note 1 from Ana."));
    await waitFor(() => atEnd(log));
    await expect(jumpOf(canvas)).toBeNull();

    await scrollUp(log);
    const top = log.scrollTop;
    await userEvent.click(canvas.getByRole("button", { name: "Ana sends one" }));
    const jump = await canvas.findByRole("button", { name: "New message" });
    await expect(log.scrollTop).toBe(top);
    await userEvent.click(canvas.getByRole("button", { name: "Ana sends one" }));
    await userEvent.click(canvas.getByRole("button", { name: "Ana sends one" }));
    await waitFor(() => expect(jump).toHaveTextContent("3 new messages"));
    await expect(log.scrollTop).toBe(top);
    // It floats over the log's bottom edge, which fades out under it while the reader is scrolled up.
    const box = jump.getBoundingClientRect();
    const end = log.getBoundingClientRect();
    await expect(box.bottom).toBeLessThan(end.bottom);
    await expect(box.top).toBeGreaterThan(end.bottom - 64);
    await expect(getComputedStyle(log).maskImage).toContain("gradient");
    // Not a live region of its own: the log already announced each message.
    await expect(jump.closest("[aria-live],[role=status]")).toBeNull();

    // By keyboard: Shift+Tab from the story's buttons reaches the jump button; Enter scrolls down, focus stays in the log.
    jump.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => atEnd(log));
    await expect(log).toHaveFocus();
    await waitFor(() => expect(jumpOf(canvas)).toBeNull());
    // At the end the last message shows whole: no fade.
    await waitFor(() => expect(getComputedStyle(log).maskImage).toBe("none"));
  },
};

/** The reader's own message scrolls to the end, wherever they were. */
export const OwnMessageFollows: Story = {
  args: { count: 0 },
  render: () => <Thread />,
  play: async ({ canvas }) => {
    const log = logOf(canvas);
    await waitFor(() => atEnd(log));
    await scrollUp(log);
    // Sent from the composer under it: the list follows to the reader's own message, and focus stays in the field.
    const field = canvas.getByRole("textbox", { name: "Message Ana Ruiz" });
    await userEvent.click(field);
    await userEvent.keyboard("See you there{Enter}");
    await waitFor(() => expect(log).toHaveTextContent("See you there"));
    await waitFor(() => atEnd(log));
    await expect(field).toHaveFocus();
    await expect(jumpOf(canvas)).toBeNull();
  },
};

/** "Earlier messages" loads history above without moving what the reader sees. */
export const EarlierMessages: Story = {
  args: { count: 0 },
  render: () => <Thread earlier />,
  play: async ({ canvas }) => {
    const log = logOf(canvas);
    await waitFor(() => atEnd(log));
    await scrollUp(log);
    const earlier = canvas.getByRole("button", { name: "Earlier messages" });
    const first = log.querySelector<HTMLElement>(`[data-message="${longThread[0]!.id}"]`)!;
    const before = first.getBoundingClientRect().top;
    earlier.focus();
    await userEvent.keyboard("{Enter}");
    // While it loads the button says so, and keeps focus, so the keyboard isn't dropped to the page.
    const loading = await canvas.findByRole("button", { name: "Loading…" });
    await expect(loading).toHaveAttribute("aria-disabled", "true");
    await expect(loading).toHaveFocus();
    await waitFor(() => expect(log.querySelector(`[data-message="${dmThread.id}-earlier-13"]`)).not.toBeNull());
    await waitFor(() => expect(Math.abs(first.getBoundingClientRect().top - before)).toBeLessThan(2));
    // Arrivals still count after a load above.
    await expect(jumpOf(canvas)).toBeNull();
  },
};

/** The first page is loading: a line in place of the log, which mounts once messages are in. */
export const Loading: Story = {
  args: { count: 0 },
  render: () => <Thread status="loading" />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Loading messages…");
    await expect(canvas.queryByRole("log")).toBeNull();
  },
};

/** The thread couldn't load: the line and Try again, pressed by keyboard. */
export const Failed: Story = {
  args: { count: 0 },
  render: () => <Thread status="failed" />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Couldn’t load these messages.")).toBeVisible();
    await expect(canvas.queryByRole("log")).toBeNull();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Try again" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => atEnd(logOf(canvas)));
  },
};

/** No messages yet: the app's words, inside the log, so the first message is announced when it comes. */
export const Empty: Story = {
  args: { count: 0 },
  render: () => <Thread initial={[]} empty="This is the start of your conversation with Ana Ruiz." />,
  play: async ({ canvas }) => {
    const log = logOf(canvas);
    await expect(log).toHaveTextContent("This is the start of your conversation with Ana Ruiz.");
    await userEvent.click(canvas.getByRole("button", { name: "Ana sends one" }));
    await waitFor(() => expect(log).toHaveTextContent("New note 1 from Ana."));
    await expect(log).not.toHaveTextContent("This is the start");
  },
};

/** At phone width the window spans the screen. */
export const Phone: Story = {
  args: { count: 0 },
  globals: { viewport: { value: "phone" } },
  render: () => <Thread className="w-full" />,
  play: async ({ canvas }) => {
    const log = logOf(canvas);
    await waitFor(() => atEnd(log));
    await scrollUp(log);
    await userEvent.click(canvas.getByRole("button", { name: "Ana sends one" }));
    await expect(await canvas.findByRole("button", { name: "New message" })).toBeVisible();
  },
};

/** An agent finds the list's jump and earlier-messages actions by the log's name. */
export const Agent: Story = {
  args: { count: 0 },
  tags: ["agent"],
  render: () => <Thread earlier />,
  play: async ({ canvas }) => {
    const log = logOf(canvas);
    await waitFor(() => atEnd(log));
    const agent = createAgent();
    const entry = agent.snapshot().find((e) => !e.offPage && e.component === "message-list");
    await expect(entry, JSON.stringify(agent.snapshot())).toBeDefined();
    const result = await agent.act({ steps: [{ ref: entry!.ref, action: "loadEarlier", args: [] }] });
    await expect(result.ok, result.error?.message).toBe(true);
    await waitFor(() => expect(log.querySelector(`[data-message="${dmThread.id}-earlier-13"]`)).not.toBeNull());
  },
};
