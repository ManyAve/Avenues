import { createParts, mergeProps, renderElement, usePart, usePrimitive, type PartProps } from "@ui-sdk/react/primitive";
import { ArrowDown } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "#avenue/components/button";
import { messageList, type MessageListOptions } from "#avenue/lib/message-list";
import { defined, type Loose, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

// ui-sdk 0.1 beta types definePrimitive's `options` as `Record | undefined`, which createParts' `Primitive` refuses
// under exactOptionalPropertyTypes; this list always has options, so narrow it. Remove when ui-sdk fixes the type.
const typed = messageList as typeof messageList & { options: NonNullable<typeof messageList.options> };
const parts = createParts(typed, { log: "div", jump: "div" });

export type MessageListStatus = "loading" | "failed" | "ready";

export type MessageListProps = Loose<Omit<PartProps<"div">, "children" | "className">> &
  MessageListOptions & {
    /** The log's name, unique on the page: "Messages with Ana Ruiz". Or name it with `aria-labelledby`. */
    "aria-label"?: string | undefined;
    "aria-labelledby"?: string | undefined;
    className?: string | undefined;
    /** The messages, oldest first, with `MessageListDay` rows between days. */
    children?: ReactNode | undefined;
    /**
     * `loading` and `failed` show a line in place of the log; the log mounts at `ready`, once the first page is in,
     * so a screen reader doesn't hear the history read out as new.
     */
    status?: MessageListStatus | undefined;
    loadingText?: ReactNode | undefined;
    failedText?: ReactNode | undefined;
    /** Shows Try again beside the failed line. */
    onRetry?: (() => void) | undefined;
    /** What an empty thread shows, inside the log, such as "This is the start of your conversation." */
    empty?: ReactNode | undefined;
    /**
     * Who is typing, as "Ana is typing…", or "" when nobody is. A polite status under the log, outside it, so it's
     * heard but never logged. Leave it out where the app has no typing.
     */
    typing?: string | undefined;
  };

/**
 * A chat thread's messages (AVE-132): newest at the bottom, a WAI-ARIA `log` that a screen reader reads politely as
 * each message arrives. It follows new messages while the reader is at the end, or when the newest is their own;
 * scrolled up, it keeps their place and shows "New message" or "N new messages" under the log, in the flow (above
 * the app's composer, never over the last bubble), which scrolls back down and leaves focus in the log. "Earlier
 * messages" loads history above without moving the view. The behavior is the `message-list` primitive
 * (src/lib/message-list.ts) on ui-sdk's `createStickToBottom`.
 *
 * The log is a Tab stop so the keyboard can scroll it. Grouping messages into runs and days stays in the app;
 * `MessageListDay` draws the day row. Put it in a box with a height (a dock window, a page's pane): the log takes
 * the room left and scrolls.
 *
 * The look is Management's chat window: 4px between rows, the day label centred in meta text, the jump button a
 * small secondary pill (allowed for a floating chip, AVE-2).
 */
export function MessageList({
  count,
  newest,
  newestMine,
  hasEarlier,
  loadingEarlier,
  onLoadEarlier,
  "aria-label": label,
  "aria-labelledby": labelledBy,
  className,
  children,
  status = "ready",
  loadingText = "Loading messages…",
  failedText = "Couldn’t load these messages.",
  onRetry,
  empty,
  typing,
  ...props
}: MessageListProps) {
  const handle = usePrimitive(typed, defined({ count, newest, newestMine, hasEarlier, loadingEarlier, onLoadEarlier }));
  const body =
    status === "loading" ? (
      <output className="m-auto block text-meta text-muted-foreground">{loadingText}</output>
    ) : status === "failed" ? (
      <div className="m-auto flex flex-col items-center gap-2 px-6 text-center">
        <p className="text-meta text-muted-foreground">{failedText}</p>
        {onRetry && (
          <Button variant="secondary" size="xs" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    ) : (
      <>
        <parts.Log
          {...defined({ "aria-label": label, "aria-labelledby": labelledBy })}
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
        >
          {hasEarlier && (
            <Button
              variant="ghost"
              size="xs"
              className="mx-auto mb-1"
              // Its own label says why it's unavailable; a disabledReason line would grow the log under the reader.
              disabled={loadingEarlier}
              focusableWhenDisabled
              onClick={() => handle.api.loadEarlier()}
            >
              {loadingEarlier ? "Loading…" : "Earlier messages"}
            </Button>
          )}
          {count === 0 && empty !== undefined && (
            <div className="m-auto flex flex-col items-center gap-2 px-6 text-center text-meta text-muted-foreground">
              {empty}
            </div>
          )}
          {children}
        </parts.Log>
        <parts.Jump className="flex shrink-0 justify-center py-2">
          {({ unseen }) => (
            // Not a live region: the log already announced the messages it counts.
            <Button
              variant="secondary"
              size="xs"
              className="rounded-full shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-150"
              onClick={() => handle.api.jumpToLatest()}
            >
              {unseen === 1 ? "New message" : `${unseen} new messages`}
              <ArrowDown data-icon="inline-end" aria-hidden />
            </Button>
          )}
        </parts.Jump>
        {typing !== undefined && (
          <output className="block h-4 shrink-0 ps-12 pe-3 text-meta text-muted-foreground">{typing}</output>
        )}
      </>
    );
  return usePart(
    handle,
    "root",
    {},
    { ...defined(props), className: cn("flex min-h-0 flex-1 flex-col", className), children: body },
    "div",
  );
}

/** A day's row between messages, such as "Today" or "Mon, Nov 16". Plain text in the log, read as it passes. */
export function MessageListDay({ className, render, ...props }: OwnPartProps<"p">) {
  return renderElement(
    "p",
    mergeProps(
      {
        "data-slot": "message-list-day",
        className: cn("my-2 text-center text-meta font-[550] text-muted-foreground", className),
      },
      defined(props),
    ),
    render,
  );
}
