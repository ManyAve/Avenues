import type { Meta, StoryObj } from "@storybook/react-vite";
import { createAgent } from "@ui-sdk/react/agent";
import { ArchiveIcon, MailOpenIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { SwipeList, SwipeRow, type SwipeRowItem } from "#avenue/components/swipe-list";
import { ToastProvider } from "#avenue/components/toast";

// AVE-199. Rows that slide aside on a phone to show their actions, with the same actions in each row's menu.
// Fictional notices from Sunnydale HOA.

type Notice = { id: string; title: string; meta: string; read: boolean };

const NOTICES: Notice[] = [
  { id: "pool", title: "Pool closes early on Friday", meta: "Pool committee · 9:40 AM", read: false },
  { id: "meeting", title: "Board meeting moves to Tuesday", meta: "Board · Yesterday", read: false },
  { id: "trash", title: "Trash pickup is a day late", meta: "Sunnydale HOA · Mon", read: true },
  { id: "stickers", title: "New parking stickers are ready", meta: "Front office · Nov 14", read: true },
];

function Notices() {
  const [notices, setNotices] = useState(NOTICES);
  const [archived, setArchived] = useState<string[]>([]);
  const items = (notice: Notice): SwipeRowItem[] => [
    {
      value: "read",
      label: notice.read ? "Mark unread" : "Mark read",
      side: "start",
      icon: <MailOpenIcon />,
      onAction: () => setNotices((all) => all.map((n) => (n.id === notice.id ? { ...n, read: !n.read } : n))),
      undo: {
        id: "read-notice",
        title: notice.read ? "Marked unread" : "Marked read",
        elsewhere: "You can change it back from the notice's menu.",
        onUndo: () => setNotices((all) => all.map((n) => (n.id === notice.id ? { ...n, read: notice.read } : n))),
      },
    },
    {
      value: "archive",
      label: "Archive",
      icon: <ArchiveIcon />,
      onAction: () => setArchived((ids) => [...ids, notice.id]),
      undo: {
        id: "archive-notice",
        title: (count) => (count === 1 ? "Notice archived" : `${count} notices archived`),
        elsewhere: (count) => `You can also restore ${count === 1 ? "it" : "them"} from Archived.`,
        onUndo: () => setArchived((ids) => ids.filter((id) => id !== notice.id)),
      },
    },
    {
      value: "delete",
      label: "Delete",
      icon: <TrashIcon />,
      destructive: true,
      onAction: () => setNotices((all) => all.filter((n) => n.id !== notice.id)),
      confirm: {
        title: "Delete this notice?",
        description: "It's gone for everyone, and can't be restored.",
        action: "Delete forever",
        agent: `Deletes "${notice.title}" for everyone`,
      },
    },
  ];
  const shown = notices.filter((notice) => !archived.includes(notice.id));
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl border">
      <SwipeList aria-label="Notices" className="divide-y">
        {shown.map((notice) => (
          <SwipeRow key={notice.id} value={notice.id} label={notice.title} items={items(notice)}>
            <p className={notice.read ? "text-sm" : "text-sm font-emphasis"}>{notice.title}</p>
            <p className="text-meta text-muted-foreground">{notice.meta}</p>
          </SwipeRow>
        ))}
      </SwipeList>
      <p className="sr-only" data-testid="archived">
        {archived.join(",")}
      </p>
    </div>
  );
}

const meta = {
  title: "Components/Swipe list",
  component: SwipeList,
  render: () => (
    <ToastProvider>
      <Notices />
    </ToastProvider>
  ),
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="min-h-96">{Story()}</div>],
} satisfies Meta<typeof SwipeList>;
export default meta;
type Story = StoryObj<typeof meta>;

const row = (title: string) => screen.getByText(title).closest<HTMLElement>("[data-slot=swipe-list-row]")!;
const content = (title: string) => row(title).querySelector<HTMLElement>("[data-slot=swipe-list-content]")!;
const actions = (title: string, side: "start" | "end") =>
  row(title).querySelector<HTMLElement>(`[data-slot=swipe-list-actions][data-side=${side}]`)!;
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** Drags across a row's content by `dx` pixels, in steps, with a finger (or `pointerType`), then lets go. */
async function swipe(title: string, dx: number, pointerType: "touch" | "mouse" = "touch") {
  const el = content(title);
  const box = el.getBoundingClientRect();
  const y = box.top + box.height / 2;
  let x = dx < 0 ? box.right - 40 : box.left + 40;
  const fire = (type: string, buttons: number, movementX = 0) =>
    el.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 1,
        pointerType,
        isPrimary: true,
        clientX: x,
        clientY: y,
        movementX,
        button: 0,
        buttons,
      }),
    );
  fire("pointerdown", 1);
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    x += dx / steps;
    fire("pointermove", 1, dx / steps);
    await frame();
  }
  fire("pointerup", 0);
  await frame();
}

const offset = (title: string) => Number.parseFloat(content(title).style.getPropertyValue("--swipe-x") || "0");

/** At rest: each row shows its content and its menu button; the actions behind it are inert. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("list", { name: "Notices" })).toBeInTheDocument();
    await expect(canvas.getAllByRole("listitem")).toHaveLength(4);
    await expect(actions("Pool closes early on Friday", "end")).toHaveAttribute("inert");
    await expect(actions("Pool closes early on Friday", "start")).toHaveAttribute("inert");
    await expect(canvas.getByRole("button", { name: "Actions for Pool closes early on Friday" })).toBeVisible();
  },
};

/** A finger swipes a row toward the start: Archive and Delete show behind it, `gap-controls` apart, no longer inert. */
export const SwipedOpen: Story = {
  play: async () => {
    await swipe("Board meeting moves to Tuesday", -150);
    const end = actions("Board meeting moves to Tuesday", "end");
    await waitFor(() => expect(end).not.toHaveAttribute("inert"));
    await expect(content("Board meeting moves to Tuesday")).toHaveAttribute("data-swipe", "end");
    const archive = within(end).getByRole("button", { name: "Archive" });
    const remove = within(end).getByRole("button", { name: "Delete" });
    // gap-controls: 16px on a phone, 8px with a mouse.
    const gap = matchMedia("(pointer: coarse)").matches ? 16 : 8;
    await expect(remove.getBoundingClientRect().left - archive.getBoundingClientRect().right).toBe(gap);
    // Only one row opens at a time: swiping another closes this one.
    await swipe("Pool closes early on Friday", -150);
    await waitFor(() => expect(end).toHaveAttribute("inert"));
    await waitFor(() => expect(actions("Pool closes early on Friday", "end")).not.toHaveAttribute("inert"));
  },
};

/** A long swipe runs the side's first action, Archive, which is reversible, and the Undo toast brings it back. */
export const FullSwipeArchives: Story = {
  play: async ({ canvas }) => {
    await swipe("Trash pickup is a day late", -340);
    await waitFor(() => expect(canvas.getByTestId("archived")).toHaveTextContent("trash"));
    await waitFor(() => expect(canvas.queryByText("Trash pickup is a day late")).toBeNull());
    const undo = await screen.findByRole("button", { name: "Undo" });
    await expect(screen.getByText("Notice archived")).toBeInTheDocument();
    undo.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.getByText("Trash pickup is a day late")).toBeInTheDocument());
  },
};

/** A long swipe toward the end runs Mark read, the start side's first action. */
export const FullSwipeMarksRead: Story = {
  play: async ({ canvas }) => {
    await swipe("Pool closes early on Friday", 340);
    await waitFor(() => expect(canvas.getByText("Pool closes early on Friday")).not.toHaveClass("font-emphasis"));
    await expect(await screen.findByText("Marked read")).toBeInTheDocument();
  },
};

/** Delete never runs on a swipe: it's a button behind the row that asks first, and its answer needs a person. */
export const DeleteAsksFirst: Story = {
  play: async ({ canvas }) => {
    await swipe("New parking stickers are ready", -150);
    const remove = within(actions("New parking stickers are ready", "end")).getByRole("button", { name: "Delete" });
    await waitFor(() => expect(actions("New parking stickers are ready", "end")).not.toHaveAttribute("inert"));
    remove.focus();
    await userEvent.keyboard("{Enter}");
    const question = await screen.findByRole("alertdialog", { name: "Delete this notice?" });
    const forever = screen.getByRole("button", { name: "Delete forever" });
    await expect(forever).toHaveAttribute("data-agent-confirm", 'Deletes "New parking stickers are ready" for everyone');
    await waitFor(() => expect(question.contains(document.activeElement)).toBe(true));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await expect(canvas.getByText("New parking stickers are ready")).toBeInTheDocument();
  },
};

/** With a mouse the row doesn't swipe: the menu button is the way to its actions. */
export const MouseDoesNotSwipe: Story = {
  play: async () => {
    await swipe("Board meeting moves to Tuesday", -340, "mouse");
    await expect(offset("Board meeting moves to Tuesday")).toBe(0);
    await expect(actions("Board meeting moves to Tuesday", "end")).toHaveAttribute("inert");
    await expect(screen.queryByText("Notice archived")).toBeNull();
  },
};

/** The keyboard's way: Tab to a row's menu button, open it, and every action is there, Delete asking first. */
export const MenuByKeyboard: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Actions for Pool closes early on Friday" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const menu = await screen.findByRole("menu");
    const names = [...menu.querySelectorAll("[role=menuitem]")].map((item) => item.textContent);
    await expect(names).toEqual(["Mark read", "Archive", "Delete"]);
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.getByTestId("archived")).toHaveTextContent("pool"));
    await expect(await screen.findByText("Notice archived")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    const meeting = canvas.getByRole("button", { name: "Actions for Board meeting moves to Tuesday" });
    meeting.focus();
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("menu");
    await userEvent.keyboard("{End}{Enter}");
    await screen.findByRole("alertdialog", { name: "Delete this notice?" });
    await userEvent.keyboard("{Tab}{Enter}");
    await waitFor(() => expect(canvas.queryByText("Board meeting moves to Tuesday")).toBeNull());
  },
};

/** A row whose only action behind it asks first. */
function Messages() {
  const [messages, setMessages] = useState(["From Ana Ruiz: Gate code changed"]);
  return (
    <SwipeList aria-label="Messages" className="mx-auto w-full max-w-md overflow-hidden rounded-xl border">
      {messages.map((message) => (
        <SwipeRow
          key={message}
          value={message}
          label={message}
          items={[
            {
              value: "delete",
              label: "Delete",
              icon: <TrashIcon />,
              destructive: true,
              onAction: () => setMessages([]),
              confirm: {
                title: "Delete this message?",
                action: "Delete forever",
                agent: "Deletes the message",
              },
            },
          ]}
        >
          <p className="text-sm">{message}</p>
        </SwipeRow>
      ))}
    </SwipeList>
  );
}

/** A long swipe never deletes: with Delete first behind the row, it only opens the row, and nothing asks. */
export const FullSwipeNeverDeletes: Story = {
  render: () => (
    <ToastProvider>
      <Messages />
    </ToastProvider>
  ),
  play: async ({ canvas }) => {
    await swipe("From Ana Ruiz: Gate code changed", -340);
    await waitFor(() => expect(actions("From Ana Ruiz: Gate code changed", "end")).not.toHaveAttribute("inert"));
    await expect(screen.queryByRole("alertdialog")).toBeNull();
    await expect(canvas.getByText("From Ana Ruiz: Gate code changed")).toBeInTheDocument();
  },
};

let approve = false;
const agent = createAgent({ allow: (step) => !step.confirm || approve });

/** An agent runs a row's actions through its menu; Delete forever waits for the person. */
export const Agent: Story = {
  tags: ["agent"],
  play: async ({ canvas }) => {
    const components = agent.snapshot().filter((entry) => !entry.offPage && entry.component !== "more");
    const labels = components.map((entry) => entry.label);
    await expect(labels).toContain("Actions for Pool closes early on Friday");
    const archived = await agent.act({
      steps: [{ ref: "Actions for Pool closes early on Friday", action: "press", args: ["Archive"] }],
    });
    await expect(archived.ok, archived.error?.message).toBe(true);
    await waitFor(() => expect(canvas.getByTestId("archived")).toHaveTextContent("pool"));
    const remove = {
      steps: [
        { ref: "Actions for Trash pickup is a day late", action: "press", args: ["Delete"] },
        { ref: "Delete this notice?", action: "press", args: ["Delete forever"] },
      ],
    };
    approve = false;
    await expect((await agent.act(remove)).ok).toBe(false);
    // The question stays open for the person to answer; here they keep the notice.
    await screen.findByRole("alertdialog", { name: "Delete this notice?" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await expect(canvas.getByText("Trash pickup is a day late")).toBeInTheDocument();
    approve = true;
    const removed = await agent.act(remove);
    await expect(removed.ok, removed.error?.message).toBe(true);
    await waitFor(() => expect(canvas.queryByText("Trash pickup is a day late")).toBeNull());
  },
};
