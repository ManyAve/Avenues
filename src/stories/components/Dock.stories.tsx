import type { Meta, StoryObj } from "@storybook/react-vite";
import { createAgent } from "@ui-sdk/react/agent";
import { EllipsisIcon, MessageCircleIcon, SendHorizontalIcon, SquarePenIcon } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import {
  Dock,
  DockWindow,
  DockWindowActions,
  DockWindowBadge,
  DockWindowBody,
  DockWindowClose,
  DockWindowHeader,
  DockWindowTitle,
  DockWindowTrigger,
  type DockWindowWidth,
} from "#avenue/components/dock";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "#avenue/components/dropdown-menu";
import { InitialsAvatar } from "#avenue/components/initials-avatar";
import { MessageList } from "#avenue/components/message-list";
import { Textarea } from "#avenue/components/textarea";
import { cn } from "#avenue/lib/utils";
import { dmThread, groupThread, me, people, personById, type ChatMessage, type ChatThread } from "./chat-kit";

// AVE-135. The docked chat windows: a header that folds the window away, its own actions and Close, side by side at
// the bottom right. Threads come from the shared chat fixture (chat-kit.ts); the rows and the composer are plain
// stand-ins for Avenue's message bubbles (AVE-133) and Composer (AVE-134) until those land. All names are made up.

const meta = {
  title: "Components/Dock",
  component: DockWindow,
  args: { label: "Ana Ruiz" },
} satisfies Meta<typeof DockWindow>;
export default meta;
type Story = StoryObj<typeof meta>;
type Canvas = Parameters<NonNullable<Story["play"]>>[0]["canvas"];

/** The page under the dock: a board screen's height, as the app's own dock story draws it. */
function Page({ children }: { children: ReactNode }) {
  return <div className="h-[560px] bg-background p-inset text-compact text-muted-foreground">{children}</div>;
}

/** A stand-in bubble: the sides, fills and hidden sender prefix both apps' bubbles have. */
function Row({ message }: { message: ChatMessage }) {
  const mine = message.senderId === me.id;
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <p
        className={cn(
          "max-w-[82%] rounded-xl px-3 py-1 text-control break-words",
          mine ? "bg-primary text-primary-foreground" : "bg-foreground/10",
        )}
      >
        <span className="sr-only">{mine ? "You" : personById(message.senderId).name}: </span>
        {message.deleted ? "Message deleted" : message.body}
      </p>
    </div>
  );
}

/** A stand-in for Avenue's Composer (AVE-134) in Management's composer look: Send waits for words. */
function ComposerStandIn({ label }: { label: string }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="flex items-end gap-2 border-t p-2 pointer-coarse:gap-controls">
      <Textarea
        aria-label={`Message ${label}`}
        placeholder="Message"
        rows={1}
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        className="min-h-8 resize-none rounded-xl bg-muted/40 py-1 pointer-coarse:min-h-11"
      />
      <Button size="icon" aria-label="Send" disabled={draft.trim() === ""} onClick={() => setDraft("")}>
        <SendHorizontalIcon aria-hidden />
      </Button>
    </div>
  );
}

/** A chat window: the thread's list and a stand-in composer whose draft must survive a fold. */
function ChatWindow({
  thread,
  label = thread.title,
  unread = 0,
  defaultOpen,
  open,
  onOpenChange,
  onClose = fn(),
}: {
  thread: ChatThread;
  label?: string;
  unread?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}) {
  const last = thread.messages.at(-1);
  const other = thread.members.find((person) => person.id !== me.id) ?? people.ana;
  return (
    <DockWindow label={label} defaultOpen={defaultOpen} open={open} onOpenChange={onOpenChange}>
      <DockWindowHeader>
        <DockWindowTrigger>
          <InitialsAvatar decorative name={thread.kind === "dm" ? other.name : thread.title} tintKey={thread.id} />
          <DockWindowTitle>{label}</DockWindowTitle>
          <DockWindowBadge count={unread} />
        </DockWindowTrigger>
        <DockWindowActions>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Options for ${label}`} />}>
              <EllipsisIcon aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuItem>Mute {label}</DropdownMenuItem>
              <DropdownMenuItem>Open in Messages</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DockWindowActions>
        <DockWindowClose onClick={onClose} />
      </DockWindowHeader>
      <DockWindowBody>
        <MessageList aria-label={`Messages with ${label}`} count={thread.messages.length} newest={last?.id} newestMine={last?.senderId === me.id}>
          {thread.messages.map((message) => (
            <Row key={message.id} message={message} />
          ))}
        </MessageList>
        <ComposerStandIn label={label} />
      </DockWindowBody>
    </DockWindow>
  );
}

/** The chat list window: a list in the body and a New chat action, as Management's Chat window. */
function ListWindow({ width = "default", label = "Chat", defaultOpen }: { width?: DockWindowWidth; label?: string; defaultOpen?: boolean }) {
  const threads = [dmThread, groupThread];
  return (
    <DockWindow label={label} width={width} defaultOpen={defaultOpen}>
      <DockWindowHeader>
        <DockWindowTrigger>
          <MessageCircleIcon aria-hidden className="size-4 text-muted-foreground" />
          <DockWindowTitle>{label}</DockWindowTitle>
          <DockWindowBadge count={4} />
        </DockWindowTrigger>
        <DockWindowActions>
          <Button variant="ghost" size="icon-sm" aria-label="New chat">
            <SquarePenIcon aria-hidden />
          </Button>
        </DockWindowActions>
        <DockWindowClose />
      </DockWindowHeader>
      <DockWindowBody className="overflow-y-auto">
        <ul aria-label="Chats" className="grid gap-1 p-2">
          {threads.map((thread) => (
            <li key={thread.id}>
              <Button variant="ghost" className="h-auto w-full justify-start gap-2 py-2 text-start">
                <InitialsAvatar decorative name={thread.title} tintKey={thread.id} />
                <span className="grid min-w-0">
                  <span className="truncate font-[600]">{thread.title}</span>
                  <span className="truncate text-meta text-muted-foreground">{thread.messages.at(-1)?.body}</span>
                </span>
              </Button>
            </li>
          ))}
        </ul>
      </DockWindowBody>
    </DockWindow>
  );
}

/** A window's width: its own, or the screen's below 640px, where it spans the width (the touch project is a phone). */
const widthOr = (px: number) => (window.innerWidth < 640 ? window.innerWidth : px);
const regionOf = (canvas: Canvas, name: string) => canvas.getByRole("region", { name });
const foldOf = (canvas: Canvas, name: RegExp) => canvas.getByRole("button", { name });

/** One chat window open over the page, with its options and Close. */
export const Default: Story = {
  render: () => (
    <Page>
      <Dock>
        <ChatWindow thread={dmThread} />
      </Dock>
    </Page>
  ),
  play: async ({ canvas }) => {
    const region = regionOf(canvas, "Ana Ruiz");
    // Non-modal: a named region, not a dialog, so nothing traps focus.
    await expect(region.tagName).toBe("SECTION");
    await expect(canvas.queryByRole("dialog")).toBeNull();
    const fold = foldOf(canvas, /^Ana Ruiz$/);
    await expect(fold).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByRole("button", { name: "Close Ana Ruiz" })).toBeVisible();
    // Management's frame: 328px wide (the screen's width on a phone), open to 32rem.
    await expect(region.getBoundingClientRect().width).toBe(widthOr(328));
    await expect(region.getBoundingClientRect().height).toBe(512);
    await expect(canvas.getByRole("log", { name: "Messages with Ana Ruiz" })).toBeVisible();
  },
};

/** Folded, only the header shows, with the unread count in the fold button's name. */
export const Folded: Story = {
  render: () => (
    <Page>
      <Dock>
        <ChatWindow thread={dmThread} defaultOpen={false} unread={3} />
      </Dock>
    </Page>
  ),
  play: async ({ canvas }) => {
    const fold = foldOf(canvas, /^Ana Ruiz/);
    // The hidden count is its own span, so the name reads with a space before the comma (as TitleWithCount's).
    await expect(fold).toHaveAccessibleName(/^Ana Ruiz ?, 3 unread$/);
    await expect(fold).toHaveAttribute("aria-expanded", "false");
    await expect(regionOf(canvas, "Ana Ruiz").getBoundingClientRect().height).toBe(44);
    // Kept mounted, so the draft survives, but hidden.
    await expect(canvas.getByRole("textbox", { name: "Message Ana Ruiz", hidden: true })).not.toBeVisible();
  },
};

/** The chat list beside two chats, newest nearest the edge; the board's chat is folded with unread messages. */
export const SideBySide: Story = {
  name: "Side by side",
  render: () => (
    <Page>
      <Dock>
        <ListWindow />
        <ChatWindow thread={dmThread} />
        <ChatWindow thread={groupThread} defaultOpen={false} unread={2} />
      </Dock>
    </Page>
  ),
  play: async ({ canvas }) => {
    const list = regionOf(canvas, "Chat").getBoundingClientRect();
    const ana = regionOf(canvas, "Ana Ruiz").getBoundingClientRect();
    const board = regionOf(canvas, "Sunnydale HOA board").getBoundingClientRect();
    if (window.innerWidth < 640) {
      // On a phone they stack, the first at the bottom, 12px apart.
      await expect(list.top - ana.bottom).toBe(12);
      await expect(ana.top - board.bottom).toBe(12);
    } else {
      // The first window sits nearest the right edge; 12px between windows, as the app's dock.
      await expect(list.left - ana.right).toBe(12);
      await expect(ana.left - board.right).toBe(12);
      // All three sit on the bottom edge.
      await expect(list.bottom).toBe(ana.bottom);
      await expect(board.bottom).toBe(ana.bottom);
    }
    // Two Close buttons, told apart by their window's name.
    await expect(canvas.getByRole("button", { name: "Close Sunnydale HOA board" })).toBeVisible();
  },
};

/** The Messages inbox is wider: 416px. */
export const Wide: Story = {
  render: () => (
    <Page>
      <Dock>
        <ListWindow width="wide" label="Messages" />
      </Dock>
    </Page>
  ),
  play: async ({ canvas }) => {
    await expect(regionOf(canvas, "Messages").getBoundingClientRect().width).toBe(widthOr(416));
  },
};

const longTitle = "Sunnydale HOA landscaping and common-area maintenance committee";

/** A long title is cut short with an ellipsis; the actions and Close keep their place. */
export const LongTitle: Story = {
  name: "Long title",
  render: () => (
    <Page>
      <Dock>
        <ChatWindow thread={{ ...groupThread, title: longTitle }} unread={128} />
      </Dock>
    </Page>
  ),
  play: async ({ canvas }) => {
    const title = canvas.getByText(longTitle);
    await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    await expect(foldOf(canvas, /^Sunnydale HOA landscaping/)).toHaveAccessibleName(new RegExp(`^${longTitle} ?, 128 unread$`));
    await expect(canvas.getByText("99+")).toBeVisible();
    const close = canvas.getByRole("button", { name: `Close ${longTitle}` }).getBoundingClientRect();
    await expect(regionOf(canvas, longTitle).getBoundingClientRect().right - close.right).toBe(5);
  },
};

/** At phone width a window spans the screen. */
export const Phone: Story = {
  globals: { viewport: { value: "phone" } },
  render: () => (
    <Page>
      <Dock>
        <ChatWindow thread={dmThread} />
      </Dock>
    </Page>
  ),
  play: async ({ canvas }) => {
    await expect(regionOf(canvas, "Ana Ruiz").getBoundingClientRect().width).toBe(390);
  },
};

/** A launcher, as both apps have: it opens the window, and Close puts focus back on it. */
function WithLauncher() {
  const [shown, setShown] = useState(true);
  const [open, setOpen] = useState(true);
  const launcher = useRef<HTMLButtonElement>(null);
  return (
    <Page>
      <Button
        ref={launcher}
        variant="outline"
        onClick={() => {
          setShown(true);
          setOpen(true);
        }}
      >
        Chat with Ana
      </Button>
      <Dock>
        {shown && (
          <ChatWindow
            thread={dmThread}
            open={open}
            onOpenChange={setOpen}
            onClose={() => {
              setShown(false);
              launcher.current?.focus();
            }}
          />
        )}
      </Dock>
    </Page>
  );
}

/** By keyboard: fold and unfold from the header, a typed draft survives, Tab skips a folded body, Close returns focus. */
export const Keyboard: Story = {
  render: () => <WithLauncher />,
  play: async ({ canvas, step }) => {
    const draft = "See you at the clubhouse";
    const fold = foldOf(canvas, /^Ana Ruiz$/);

    await step("type a draft", async () => {
      await userEvent.click(canvas.getByRole("textbox", { name: "Message Ana Ruiz" }));
      await userEvent.keyboard(draft);
    });

    await step("Escape in the window does nothing", async () => {
      await userEvent.keyboard("{Escape}");
      await expect(fold).toHaveAttribute("aria-expanded", "true");
    });

    await step("Tab reaches the fold button with a visible ring; Enter folds", async () => {
      canvas.getByRole("button", { name: "Chat with Ana" }).focus();
      await userEvent.tab();
      await expect(fold).toHaveFocus();
      await expect(getComputedStyle(fold).boxShadow).not.toBe("none");
      await userEvent.keyboard("{Enter}");
      await expect(fold).toHaveAttribute("aria-expanded", "false");
      await expect(fold).toHaveFocus();
    });

    await step("folded, Tab skips the body: the options, then Close", async () => {
      await userEvent.tab();
      await expect(canvas.getByRole("button", { name: "Options for Ana Ruiz" })).toHaveFocus();
      await userEvent.tab();
      await expect(canvas.getByRole("button", { name: "Close Ana Ruiz" })).toHaveFocus();
      await userEvent.tab();
      await expect(regionOf(canvas, "Ana Ruiz").contains(document.activeElement)).toBe(false);
    });

    await step("Space unfolds; the draft is still there", async () => {
      fold.focus();
      await userEvent.keyboard(" ");
      await expect(fold).toHaveAttribute("aria-expanded", "true");
      await expect(canvas.getByRole("textbox", { name: "Message Ana Ruiz" })).toHaveValue(draft);
    });

    await step("the fold button controls the body", async () => {
      const body = fold.getAttribute("aria-controls");
      await expect(body).toBeTruthy();
      await expect(canvas.getByRole("log", { name: "Messages with Ana Ruiz" }).closest(`[id="${body}"]`)).not.toBeNull();
    });

    await step("Close removes the window and focus goes back to the launcher", async () => {
      canvas.getByRole("button", { name: "Close Ana Ruiz" }).focus();
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(canvas.queryByRole("region", { name: "Ana Ruiz" })).toBeNull());
      await expect(canvas.getByRole("button", { name: "Chat with Ana" })).toHaveFocus();
    });

    await step("the launcher opens it again", async () => {
      await userEvent.keyboard("{Enter}");
      await expect(foldOf(canvas, /^Ana Ruiz$/)).toHaveAttribute("aria-expanded", "true");
    });
  },
};

/** An agent finds the window's fold button by its name, folds it, and the body hides. */
export const Agent: Story = {
  tags: ["agent"],
  render: () => (
    <Page>
      <Dock>
        <ChatWindow thread={dmThread} />
      </Dock>
    </Page>
  ),
  play: async ({ canvas }) => {
    const agent = createAgent();
    const found = agent.snapshot().filter((entry) => !entry.offPage && entry.label === "Ana Ruiz");
    await expect(found).toHaveLength(1);
    await expect(found[0]?.["open"]).toBe(true);
    const result = await agent.act({ steps: [{ ref: found[0]!.ref, action: "setOpen", args: [false] }] });
    await expect(result.ok, result.error?.message).toBe(true);
    await expect(foldOf(canvas, /^Ana Ruiz$/)).toHaveAttribute("aria-expanded", "false");
  },
};
