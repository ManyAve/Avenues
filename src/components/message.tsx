import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { createContext, useContext } from "react";
import { InitialsAvatar } from "#avenue/components/initials-avatar";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * Chat messages (AVE-133): one sender's run of messages, and each message in it. Avenue's own parts: ui-sdk 0.1 has
 * no chat bubble, and nothing here is a control (the app's Reply, Retry and other buttons go in the slots).
 *
 * Look: Management's board chat (app/ui/components/chat.tsx, MessageRun and Bubble). Yours on the end side in the
 * primary fill, theirs on the start side in `foreground/10`, the run at most 82% of the row, the sender's name over a
 * group run and a 28px avatar at its foot. AVE-2 moves its corner to `rounded-xl` (14px; 2xl is retired) and its 6px
 * steps onto the 4px grid (bubble `py-2`, avatar gap 8px), so a one-line bubble is 36px, not 32. Neighbors' muted fill and tucked corner are dropped
 * for parity (AVE-125).
 *
 * Who spoke (WCAG 1.3.1, 1.4.1): side and colour don't say it, so every bubble starts with hidden sender text ("You:",
 * "Ana Ruiz:") and the drawn name is hidden instead, so each message in the log reads whole and the name is read once.
 * The full time is hidden text at the bubble's end: a description (`aria-describedby`) on a paragraph that can't be
 * focused isn't read by screen readers in browse mode, and a `title` can't be reached by touch or keyboard.
 *
 * States, each with text: deleted ("Message deleted", dashed and italic, the body is never drawn), pending (a greyed fill, and
 * `MessageStatus` says "Sending…"), failed (a destructive ring, and `MessageStatus` says "Not sent" beside the app's
 * Retry and Delete), edited ("edited" after the body).
 *
 * Grouping (which messages form a run, day labels), reactions and the react, reply and options bar stay in the apps;
 * the actions go in `MessageActions`, which shows on hover and focus, and always on a touch screen.
 */

type From = "me" | "them";

const RunContext = createContext<{ from: From; sender: string }>({ from: "them", sender: "" });

const MessageContext = createContext<{
  deleted: boolean;
  delivery: MessageDelivery;
  edited: boolean;
  time: string | undefined;
}>({ deleted: false, delivery: "sent", edited: false, time: undefined });

export type MessageDelivery = "sent" | "pending" | "failed";

/**
 * One sender's run: a group named by its sender. `from="me"` puts it on the end side. Holds `MessageRunAvatar`
 * (theirs only) and `MessageRunContent`.
 */
function MessageRun({
  from,
  sender,
  className,
  render,
  ...props
}: OwnPartProps<"div"> & {
  from: From;
  /** Who sent the run, as the thread names them. Read before every message of theirs; yours read "You". */
  sender: string;
}) {
  const name = from === "me" ? "You" : sender;
  return (
    <RunContext.Provider value={{ from, sender: name }}>
      {renderElement(
        "div",
        mergeProps(
          {
            "data-slot": "message-run",
            "data-from": from,
            role: "group",
            "aria-label": from === "me" ? "Your messages" : `Messages from ${sender}`,
            className: cn("flex items-end gap-2", from === "me" && "flex-row-reverse", className),
          },
          defined(props),
        ),
        render,
      )}
    </RunContext.Provider>
  );
}

/** The sender's avatar at the run's foot, 28px. Decorative: every bubble already says who sent it. */
function MessageRunAvatar({
  name,
  tintKey,
  className,
  render,
  ...props
}: OwnPartProps<"span"> & {
  name: string;
  /** The person's stable id, so they keep one tint everywhere (InitialsAvatar). */
  tintKey?: string | undefined;
}) {
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "message-run-avatar",
        className: cn("w-7 shrink-0 self-end", className),
        children: <InitialsAvatar name={name} tintKey={tintKey} decorative />,
      },
      defined(props),
    ),
    render,
  );
}

/** The run's column of messages, at most 82% of the row, aligned to the run's side. */
function MessageRunContent({ className, render, ...props }: OwnPartProps<"div">) {
  const { from } = useContext(RunContext);
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "message-run-content",
        className: cn(
          "flex min-w-0 max-w-[82%] flex-col gap-0.5",
          from === "me" ? "items-end" : "items-start",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** The sender's name over a group run. Hidden from screen readers, since every bubble starts with it. */
function MessageRunSender({ className, render, ...props }: OwnPartProps<"span">) {
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "message-run-sender",
        "aria-hidden": true,
        className: cn("ps-3 text-meta text-muted-foreground", className),
      },
      defined(props),
    ),
    render,
  );
}

/**
 * One message: its quote, its row (bubble and actions), anything the app adds under it (reactions), and its status.
 * Its state is read by the parts inside it.
 */
function Message({
  deleted = false,
  delivery = "sent",
  edited = false,
  time,
  className,
  render,
  ...props
}: OwnPartProps<"div"> & {
  /** Draws "Message deleted" in place of the body. */
  deleted?: boolean | undefined;
  delivery?: MessageDelivery | undefined;
  /** Adds "edited" after the body. */
  edited?: boolean | undefined;
  /** When it was sent, in full ("Thursday, November 12, 4:28 PM"), read at the end of the bubble. */
  time?: string | undefined;
}) {
  const { from } = useContext(RunContext);
  return (
    <MessageContext.Provider value={{ deleted, delivery, edited, time }}>
      {renderElement(
        "div",
        mergeProps(
          {
            "data-slot": "message",
            "data-delivery": delivery,
            ...(deleted ? { "data-deleted": "" } : {}),
            className: cn(
              "group/message flex min-w-0 max-w-full flex-col gap-0.5",
              from === "me" ? "items-end" : "items-start",
              // On a touch screen the actions always show, and their 44px reach would overlap the next message's.
              "pointer-coarse:has-data-[slot=message-actions]:py-1",
              className,
            ),
          },
          defined(props),
        ),
        render,
      )}
    </MessageContext.Provider>
  );
}

/** The bubble and its actions, side by side; the actions sit on the inner side. */
function MessageRow({ className, render, ...props }: OwnPartProps<"div">) {
  const { from } = useContext(RunContext);
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "message-row",
        className: cn("flex max-w-full min-w-0 items-center gap-0.5", from === "me" && "flex-row-reverse", className),
      },
      defined(props),
    ),
    render,
  );
}

/** The message itself. Its children are the body; a deleted message draws "Message deleted" instead. */
function MessageBubble({ className, render, children, ...props }: OwnPartProps<"p">) {
  const { from, sender } = useContext(RunContext);
  const { deleted, delivery, edited, time } = useContext(MessageContext);
  return renderElement(
    "p",
    mergeProps(
      {
        "data-slot": "message-bubble",
        className: cn(
          "max-w-full min-w-0 rounded-xl px-3 py-2 text-control wrap-anywhere whitespace-pre-wrap",
          deleted
            ? "border border-dashed bg-transparent text-muted-foreground italic"
            : from === "me"
              ? "bg-primary text-primary-foreground"
              : "bg-foreground/10 text-foreground",
          // Not opacity: a faded bubble takes its text under 4.5:1. A desaturated fill keeps the text's contrast.
          delivery === "pending" && "saturate-[.35]",
          delivery === "failed" && "ring-2 ring-destructive/50",
          className,
        ),
        children: (
          <>
            {sender && <span className="sr-only">{sender}: </span>}
            {deleted ? "Message deleted" : children}
            {edited && !deleted && (
              <>
                <span className="sr-only">, </span>
                <span className="ms-2 text-meta">edited</span>
              </>
            )}
            {time && <span className="sr-only">, {time}</span>}
          </>
        ),
      },
      defined(props),
    ),
    render,
  );
}

/**
 * The message it replies to, above the bubble. Its children are the quoted text; `sender` is read first ("Replying to
 * Ana Ruiz:"), and `deleted` says the quoted message is gone.
 */
function MessageQuote({
  sender,
  deleted = false,
  className,
  render,
  children,
  ...props
}: OwnPartProps<"span"> & {
  /** Who wrote the quoted message: "you" for the reader. */
  sender: string;
  deleted?: boolean | undefined;
}) {
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "message-quote",
        className: cn(
          "max-w-full truncate rounded-xl bg-accent px-3 py-1 text-meta text-muted-foreground",
          className,
        ),
        children: (
          <>
            <QuoteGlyph />
            <span className="sr-only">Replying to {sender}: </span>
            {deleted ? <em>Message deleted</em> : children}
          </>
        ),
      },
      defined(props),
    ),
    render,
  );
}

const QuoteGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    className="me-1 inline size-3 rtl:-scale-x-100"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    <path d="m9 17-5-5 5-5" />
  </svg>
);

/**
 * The app's controls for a message (react, reply, options), beside the bubble. Shown on hover and while focus is
 * inside the message, always on a touch screen; never hidden from the keyboard (they only fade, so Tab still
 * reaches them). Leave it out while a message is pending, failed or deleted.
 */
function MessageActions({ className, render, ...props }: OwnPartProps<"span">) {
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "message-actions",
        className: cn(
          "flex shrink-0 items-center gap-controls opacity-0 transition-opacity motion-reduce:transition-none",
          "group-focus-within/message:opacity-100 group-hover/message:opacity-100 has-aria-expanded:opacity-100 pointer-coarse:opacity-100",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

/**
 * The line under a pending or failed message: "Sending…" (polite) or "Not sent" (an alert), then its children (the
 * app's Retry and Delete). Shows nothing for a sent message. Put it under a run's last pending message only.
 */
function MessageStatus({ className, render, children, ...props }: OwnPartProps<"span">) {
  const { delivery, deleted } = useContext(MessageContext);
  if (delivery === "sent" || deleted) return null;
  const failed = delivery === "failed";
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "message-status",
        "data-delivery": delivery,
        className: cn(
          "flex items-center gap-controls text-meta",
          // The app's Retry and Delete are text-high; on a touch screen this keeps their 44px reach off the bubble.
          "pointer-coarse:has-[button]:py-3",
          failed ? "text-destructive-subtle-foreground" : "text-muted-foreground",
          className,
        ),
        children: (
          <>
            <span role={failed ? "alert" : "status"}>{failed ? "Not sent" : "Sending…"}</span>
            {failed && children}
          </>
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** The time under a run's last message ("4:28 PM"). Hidden from screen readers: the bubble already reads it in full. */
function MessageMeta({ className, render, ...props }: OwnPartProps<"span">) {
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "message-meta",
        "aria-hidden": true,
        className: cn("px-1 text-meta text-muted-foreground", className),
      },
      defined(props),
    ),
    render,
  );
}

export {
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
};
