import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Composer, ComposerContext, ComposerField, ComposerSend } from "#avenue/components/composer";
import { dmThread, groupThread, messageById, personById } from "./chat-kit";

// AVE-134. The reply box under a chat, in Management's chat window footer, on the shared chat fixture (AVE-133).

const toAna = `Message ${dmThread.title}`;
const toBoard = `Message ${groupThread.title}`;
const anaAsks = messageById(dmThread, "dm-5")!;
const myNote = messageById(dmThread, "dm-4")!;
const anaName = personById(anaAsks.senderId).name;

/** The banner's words for a reply, as Management writes them. */
function ReplyingTo({ yourself = false }: { yourself?: boolean }) {
  const quoted = yourself ? myNote : anaAsks;
  return (
    <>
      Replying to <b className="font-[600]">{yourself ? "yourself" : anaName}</b>: {quoted.body}
    </>
  );
}

const meta = {
  title: "Components/Composer",
  component: Composer,
  args: { onSend: () => {} },
} satisfies Meta<typeof Composer>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The chat window's footer as Management draws it: a 328px window, a rule above, 8px in. */
function Footer({ children, sent = [] }: { children: ReactNode; sent?: string[] }) {
  return (
    <div className="p-inset">
      <div className="w-82 max-w-full rounded-t-xl border bg-popover">
        <ol aria-label="Sent messages" className="flex min-h-12 flex-col items-end gap-1 px-3 py-2 text-control">
          {sent.map((text, i) => (
            <li key={`${i}-${text}`} className="max-w-[82%] rounded-xl bg-primary px-3 py-1 whitespace-pre-wrap text-primary-foreground">
              {text}
            </li>
          ))}
        </ol>
        <div className="border-t p-2">{children}</div>
      </div>
    </div>
  );
}

function Chat({ defaultValue }: { defaultValue?: string }) {
  const [sent, setSent] = useState<string[]>([]);
  return (
    <Footer sent={sent}>
      <Composer onSend={(text) => setSent((list) => [...list, text])}>
        <ComposerField aria-label={toAna} placeholder="Message" maxLength={4000} defaultValue={defaultValue} />
        <ComposerSend />
      </Composer>
    </Footer>
  );
}

const field = (canvas: { getByRole: (role: string, o: { name: string }) => HTMLElement }, name = toAna) =>
  canvas.getByRole("textbox", { name }) as HTMLTextAreaElement;

/** Nothing typed: Send is disabled, still reachable by Tab, and says why. Enter in the empty field sends nothing. */
export const Empty: Story = {
  render: () => <Chat />,
  play: async ({ canvas }) => {
    const box = field(canvas);
    const send = canvas.getByRole("button", { name: "Send" });
    await expect(send).toHaveAttribute("aria-disabled", "true");
    await expect(send).toHaveAccessibleDescription("Type a message first.");
    await userEvent.click(box);
    await userEvent.keyboard("{Enter}");
    await expect(canvas.queryAllByRole("listitem")).toHaveLength(0);
    await userEvent.tab();
    await expect(send).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.queryAllByRole("listitem")).toHaveLength(0);
  },
};

/**
 * Typing and sending. Shift+Enter adds a line, Enter sends, and focus stays in the field. Then Send pressed by Tab
 * and Enter, and by the pointer: each time the field empties and focus is back in it, not on the page.
 */
export const Typing: Story = {
  tags: ["agent"],
  render: () => <Chat />,
  play: async ({ canvas }) => {
    const box = field(canvas);
    const send = canvas.getByRole("button", { name: "Send" });
    await userEvent.click(box);
    await userEvent.keyboard("Is the pool open{Shift>}{Enter}{/Shift}on Sunday?");
    await expect(box).toHaveValue("Is the pool open\non Sunday?");
    await expect(send).not.toHaveAttribute("aria-disabled");
    await expect(send).not.toHaveAccessibleDescription();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getAllByRole("listitem").at(-1)).toHaveTextContent("Is the pool open on Sunday?");
    await expect(box).toHaveValue("");

    await expect(box).toHaveFocus();

    await userEvent.type(box, "  It closes at 8.  ");
    await expect(box).toHaveValue("  It closes at 8.  ");
    await userEvent.tab();
    await expect(send).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getAllByRole("listitem").at(-1)?.textContent).toBe("It closes at 8.");
    await expect(box).toHaveValue("");
    await expect(box).toHaveFocus();

    await userEvent.type(box, "Thanks!");
    await userEvent.click(send);
    await expect(canvas.getAllByRole("listitem")).toHaveLength(3);
    await expect(box).toHaveValue("");
    await expect(box).toHaveFocus();
  },
};

/** A long message grows the field to 112px, then it scrolls inside. */
export const AtMaxHeight: Story = {
  render: () => (
    <Chat
      defaultValue={[
        "Reminder for the board:",
        "1. The gate code changes on the 1st.",
        "2. Pool hours move to 7 to 8 for winter.",
        "3. Leaf pickup is the second Tuesday.",
        "4. Dues statements go out next week.",
        "5. The Maple Court streetlight is fixed.",
        "6. Next meeting is at the clubhouse.",
      ].join("\n")}
    />
  ),
  play: async ({ canvas }) => {
    const box = field(canvas);
    await waitFor(() => expect(box.getBoundingClientRect().height).toBeCloseTo(112, 0));
    await expect(box.scrollHeight).toBeGreaterThan(box.clientHeight);
    await expect(canvas.getByRole("button", { name: "Send" })).not.toHaveAttribute("aria-disabled");
  },
};

/**
 * Sending with a promise (Neighbors' rule): the text stays, read-only, until the server answers; Send is disabled
 * and says "Sending…". Delivered, the field empties; refused, the text stays for another try. Focus never leaves.
 */
export const Sending: Story = {
  render: function Render() {
    const [sent, setSent] = useState<string[]>([]);
    const [error, setError] = useState("");
    const answer = useRef<{ resolve: () => void; reject: () => void } | null>(null);
    return (
      <div className="flex flex-col gap-2">
        <Footer sent={sent}>
          <Composer
            onSend={(text) => {
              setError("");
              return new Promise<void>((resolve, reject) => {
                answer.current = {
                  resolve: () => {
                    setSent((list) => [...list, text]);
                    resolve();
                  },
                  reject: () => {
                    setError("Couldn't send. Check your connection and try again.");
                    reject(new Error("offline"));
                  },
                };
              });
            }}
          >
            <ComposerField aria-label={toBoard} placeholder="Message" />
            <ComposerSend />
          </Composer>
        </Footer>
        <output className="px-inset text-meta text-destructive-subtle-foreground">{error}</output>
        <div className="flex gap-controls px-inset">
          <Button variant="outline" size="sm" onClick={() => answer.current?.resolve()}>
            Deliver it
          </Button>
          <Button variant="outline" size="sm" onClick={() => answer.current?.reject()}>
            Refuse it
          </Button>
        </div>
      </div>
    );
  },
  play: async ({ canvas }) => {
    const box = field(canvas, toBoard);
    const send = canvas.getByRole("button", { name: "Send" });
    const deliver = canvas.getByRole("button", { name: "Deliver it" });
    const refuse = canvas.getByRole("button", { name: "Refuse it" });

    await userEvent.type(box, "Can we add a bench by the mailboxes?{Enter}");
    await expect(box).toHaveValue("Can we add a bench by the mailboxes?");
    await expect(box).toHaveAttribute("readonly");
    await expect(box).toHaveFocus();
    await expect(send).toHaveAttribute("aria-disabled", "true");
    await expect(send).toHaveAccessibleDescription("Sending…");
    await userEvent.keyboard("{Enter}");
    await expect(canvas.queryAllByRole("listitem")).toHaveLength(0);

    refuse.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(box).not.toHaveAttribute("readonly"));
    await expect(box).toHaveValue("Can we add a bench by the mailboxes?");
    await expect(canvas.getByRole("status")).toHaveTextContent("Couldn't send.");
    await expect(box).toHaveFocus();

    await userEvent.tab();
    await expect(send).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(box).toHaveAttribute("readonly");
    await expect(box).toHaveFocus();
    deliver.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(box).toHaveValue(""));
    await expect(box).not.toHaveAttribute("readonly");
    await expect(canvas.getAllByRole("listitem")).toHaveLength(1);
    await expect(box).toHaveFocus();
  },
};

/** The same pending state, held, to see its look: the text read-only and Send dimmed. */
export const SendingHeld: Story = {
  render: () => (
    <Footer>
      <Composer onSend={() => new Promise(() => {})}>
        <ComposerField aria-label={toBoard} defaultValue="Can we add a bench by the mailboxes?" />
        <ComposerSend />
      </Composer>
    </Footer>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(field(canvas, toBoard));
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByRole("button", { name: "Send" })).toHaveAccessibleDescription("Sending…");
  },
};

/**
 * Replying: the banner says to whom, cut to one line. Escape in the field cancels the reply but keeps what was typed;
 * with no banner, Escape is left alone, so it still reaches a dock or dialog around the composer.
 */
export const Replying: Story = {
  render: function Render() {
    const [replying, setReplying] = useState(true);
    const [escapes, setEscapes] = useState(0);
    useEffect(() => {
      // Where a dock or dialog listens: above React's root, so it sees what the composer let through.
      const count = (event: KeyboardEvent) => {
        if (event.key === "Escape" && !event.defaultPrevented) setEscapes((n) => n + 1);
      };
      document.addEventListener("keydown", count);
      return () => document.removeEventListener("keydown", count);
    }, []);
    return (
      <div>
        <Footer>
          <Composer onSend={() => setReplying(false)}>
            {replying ? (
              <ComposerContext onCancel={() => setReplying(false)}>
                <ReplyingTo />
              </ComposerContext>
            ) : null}
            <ComposerField aria-label={toAna} placeholder="Message" />
            <ComposerSend />
          </Composer>
        </Footer>
        <p className="px-inset text-meta text-muted-foreground" data-testid="escapes">
          Escapes that reached the window: {escapes}
        </p>
      </div>
    );
  },
  play: async ({ canvas }) => {
    const box = field(canvas, toAna);
    await expect(canvas.getByRole("button", { name: "Cancel reply" })).toBeVisible();
    await userEvent.type(box, "Thanks");
    await userEvent.keyboard("{Escape}");
    await expect(canvas.queryByRole("button", { name: "Cancel reply" })).toBeNull();
    await expect(box).toHaveValue("Thanks");
    await expect(box).toHaveFocus();
    await expect(canvas.getByTestId("escapes")).toHaveTextContent("0");
    await userEvent.keyboard("{Escape}");
    await expect(canvas.getByTestId("escapes")).toHaveTextContent("1");
  },
};

/** The reply banner's Cancel, pressed from the keyboard, ends the reply and puts focus back in the field. */
export const CancelReplyByKeyboard: Story = {
  render: function Render() {
    const [replying, setReplying] = useState(true);
    return (
      <Footer>
        <Composer onSend={() => {}}>
          {replying ? (
            <ComposerContext onCancel={() => setReplying(false)}>
              <ReplyingTo yourself />
            </ComposerContext>
          ) : null}
          <ComposerField aria-label={toAna} placeholder="Message" />
          <ComposerSend />
        </Composer>
      </Footer>
    );
  },
  play: async ({ canvas }) => {
    const cancel = canvas.getByRole("button", { name: "Cancel reply" });
    cancel.focus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.queryByRole("button", { name: "Cancel reply" })).toBeNull();
    await expect(field(canvas, toAna)).toHaveFocus();
  },
};

function EditingChat() {
  const [draft, setDraft] = useState("The meeting is at 7 in the clubhouse.");
  const [editing, setEditing] = useState(true);
  const [saved, setSaved] = useState<string[]>([]);
  return (
    <Footer sent={saved}>
      <Composer
        onSend={(text) => {
          setSaved((list) => [...list, text]);
          setEditing(false);
        }}
      >
        {editing ? <ComposerContext kind="edit" onCancel={() => setEditing(false)}>Editing message</ComposerContext> : null}
        <ComposerField aria-label={toAna} placeholder="Message" value={draft} onValueChange={setDraft} />
        <ComposerSend />
      </Composer>
    </Footer>
  );
}

/**
 * Editing: the app puts the message's text in the field (controlled), Send becomes "Save edit" with a check, and
 * Escape cancels the edit and empties the field.
 */
export const Editing: Story = {
  render: () => <EditingChat />,
  play: async ({ canvas }) => {
    const box = field(canvas);
    await expect(canvas.getByRole("button", { name: "Save edit" })).not.toHaveAttribute("aria-disabled");
    await userEvent.click(box);
    await userEvent.keyboard("{Escape}");
    await expect(box).toHaveValue("");
    await expect(canvas.getByRole("button", { name: "Send" })).toHaveAttribute("aria-disabled", "true");
    await expect(box).toHaveFocus();
  },
};

/** An edit, saved with the check: the edited text goes out and the field empties. */
export const SaveEdit: Story = {
  render: () => <EditingChat />,
  play: async ({ canvas }) => {
    const box = field(canvas);
    await userEvent.click(box);
    await userEvent.keyboard("{End} Bring a chair.");
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getAllByRole("listitem").at(-1)).toHaveTextContent("The meeting is at 7 in the clubhouse. Bring a chair.");
    await expect(box).toHaveValue("");
    await expect(box).toHaveFocus();
    await expect(canvas.getByRole("button", { name: "Send" })).toBeVisible();
  },
};

/** Off, with the reason under it: the field and Send can't be used, and the reason is read with the field. */
export const Disabled: Story = {
  render: () => (
    <Footer>
      <Composer onSend={() => {}} disabledReason="Replies are closed for this announcement.">
        <ComposerField aria-label={toBoard} placeholder="Message" />
        <ComposerSend />
      </Composer>
    </Footer>
  ),
  play: async ({ canvas }) => {
    await expect(field(canvas, toBoard)).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Send" })).toBeDisabled();
    await expect(field(canvas, toBoard)).toHaveAccessibleDescription("Replies are closed for this announcement.");
  },
};

/** At phone width the field and Send are both 44px tall, 16px apart, and the field's text is 16px. */
export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  render: function Render() {
    const [replying, setReplying] = useState(true);
    return (
      <Footer>
        <Composer onSend={() => {}}>
          {replying ? (
            <ComposerContext onCancel={() => setReplying(false)}>
              <ReplyingTo />
            </ComposerContext>
          ) : null}
          <ComposerField aria-label={toAna} placeholder="Message" />
          <ComposerSend />
        </Composer>
      </Footer>
    );
  },
  play: async ({ canvas }) => {
    const box = field(canvas, toAna);
    await expect(getComputedStyle(box).fontSize).toBe("16px");
    if (matchMedia("(pointer: coarse)").matches) {
      await expect(box.getBoundingClientRect().height).toBe(44);
      await expect(canvas.getByRole("button", { name: "Send" }).getBoundingClientRect().height).toBe(44);
    }
    await userEvent.type(box, "On my way");
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await expect(box).toHaveValue("");
    await expect(box).toHaveFocus();
  },
};
