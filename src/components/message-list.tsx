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
     * Who is typing, as "Ana is typing", or "" when nobody is: a bubble of three dots and these words under the log,
     * outside it, in a polite status, so it's heard but never logged. Leave it out where the app has no typing.
     */
    typing?: string | undefined;
    /** Who is typing, drawn beside the typing bubble as the runs draw theirs (`MessageRunAvatar`'s 28px avatar). */
    typingAvatar?: ReactNode | undefined;
  };

/**
 * A chat thread's messages (AVE-132): newest at the bottom, a WAI-ARIA `log` that a screen reader reads politely as
 * each message arrives. It follows new messages while the reader is at the end, or when the newest is their own;
 * scrolled up, it keeps their place and floats a "New message" or "N new messages" pill over the log's faded bottom
 * edge, which scrolls back down and leaves focus in the log. The pill only shows while the reader is scrolled up,
 * so it never covers the newest message (Neighbors' NEI-68 problem). "Earlier
 * messages" loads history above without moving the view. The behavior is the `message-list` primitive
 * (src/lib/message-list.ts) on ui-sdk's `createStickToBottom`.
 *
 * The log is a Tab stop so the keyboard can scroll it. Grouping messages into runs and days stays in the app;
 * `MessageListDay` draws the day row. Put it in a box with a height (a dock window, a page's pane): the log takes
 * the room left and scrolls.
 *
 * The look is Management's chat window: 4px between rows, the day label centred in meta text. The jump pill is an
 * outline button on the popover surface with a shadow, so it reads as floating (a pill is allowed for a floating
 * chip, AVE-2); the typing bubble is a them-side bubble of three dots that rise in turn (still under reduced motion).
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
  typingAvatar,
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
        <div className="relative flex min-h-0 flex-1 flex-col">
          <parts.Log
            {...defined({ "aria-label": label, "aria-labelledby": labelledBy })}
            className={({ atBottom }) =>
              cn(
                "flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
                // Scrolled up, the last line fades out under the floating pill instead of stopping at a hard edge.
                !atBottom && "mask-b-from-[calc(100%-5rem)] mask-b-to-[calc(100%-1rem)]",
              )
            }
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
          <parts.Jump className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            {({ unseen }) => (
              // Not a live region: the log already announced the messages it counts.
              <Button
                variant="outline"
                size="xs"
                className="pointer-events-auto rounded-full bg-popover shadow-popover motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-moderate dark:bg-popover"
                onClick={() => handle.api.jumpToLatest()}
              >
                {unseen === 1 ? "New message" : `${unseen} new messages`}
                <ArrowDown data-icon="inline-end" aria-hidden />
              </Button>
            )}
          </parts.Jump>
        </div>
        {typing !== undefined && (
          // Always in the page, so a screen reader hears it when it fills; it takes no room while nobody types.
          <output className="block shrink-0 px-3 empty:hidden">
            {typing && (
              <span className="flex items-center gap-2 pb-2">
                <span className="w-7 shrink-0" aria-hidden>
                  {typingAvatar}
                </span>
                <span aria-hidden className="flex h-8 items-center gap-1 rounded-xl bg-foreground/10 px-3">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="size-1.5 rounded-full bg-muted-foreground motion-safe:animate-typing-dot"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </span>
                <span className="text-meta text-muted-foreground">{typing}</span>
              </span>
            )}
          </output>
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
        className: cn("my-2 text-center text-meta font-emphasis text-muted-foreground", className),
      },
      defined(props),
    ),
    render,
  );
}
