import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { StatusDot, type StatusDotTone } from "#avenue/components/status";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * What happened, in order (AVE-219): a household's or an association's history, the steps a job ran, an audit trail.
 * Each entry is a dot on a line, what happened, and a quiet line for when and where. An ordered list, so a screen
 * reader hears how many entries there are and their order.
 *
 *   Timeline              the ordered list and its line
 *   └── TimelineItem      one entry; `tone` colours its dot
 *       ├── TimelineTitle     what happened
 *       ├── TimelineMeta      when, where, who: one muted line
 *       └── (anything else)   a note, a Badge row, a link, under the title
 *
 * Newest first for a history people check ("what changed?"), oldest first for steps that ran in order.
 *
 * The dot is a StatusDot. `neutral` (the default) for an ordinary entry; a state tone marks the entry that is the
 * news (a failed payment, a fix shipped), and the words still say so, because the dot is hidden from screen readers
 * and colour never carries a meaning alone. The line joins each dot to the next and stops at the last.
 *
 * Not a ListItem: list rows are things (a document, a payment) divided by rules, with something at the row's end;
 * timeline entries are moments joined by a line. Not a MessageList either, which is a conversation.
 */
function Timeline({ className, render, ...props }: OwnPartProps<"ol">) {
  return renderElement(
    "ol",
    mergeProps({ "data-slot": "timeline", className: cn("grid text-compact", className) }, defined(props)),
    render,
  );
}

/** One entry: its dot, then the title, meta line and anything else in a column beside it. */
function TimelineItem({
  tone = "neutral",
  className,
  children,
  render,
  ...props
}: OwnPartProps<"li"> & {
  /** The dot's colour. Neutral unless this entry is the news; the words carry the meaning either way. */
  tone?: StatusDotTone | undefined;
}) {
  return renderElement(
    "li",
    mergeProps(
      {
        "data-slot": "timeline-item",
        "data-tone": tone,
        className: cn(
          "relative grid grid-cols-[auto_1fr] gap-x-3 pb-4 last:pb-0",
          // The line: from under this entry's dot to the next entry's, centred on the 8px dot column.
          "not-last:before:absolute not-last:before:top-6 not-last:before:bottom-0 not-last:before:left-1 not-last:before:w-px not-last:before:-translate-x-1/2 not-last:before:bg-border",
          className,
        ),
        children: (
          <>
            {/* As tall as the title's first line, so the dot sits beside it whatever follows. */}
            <span data-slot="timeline-marker" className="flex h-6 w-2 items-center justify-center">
              <StatusDot tone={tone} size="md" />
            </span>
            <div data-slot="timeline-content" className="grid min-w-0 gap-1">
              {children}
            </div>
          </>
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** What happened. Wraps anywhere, so a long name doesn't widen the page. */
function TimelineTitle({ className, render, ...props }: OwnPartProps<"p">) {
  return renderElement(
    "p",
    mergeProps({ "data-slot": "timeline-title", className: cn("wrap-break-word", className) }, defined(props)),
    render,
  );
}

/** One muted line: when it happened, where it was recorded, who did it. Put the date in a `time` element. */
function TimelineMeta({ className, render, ...props }: OwnPartProps<"p">) {
  return renderElement(
    "p",
    mergeProps(
      {
        "data-slot": "timeline-meta",
        className: cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted-foreground", className),
      },
      defined(props),
    ),
    render,
  );
}

export { Timeline, TimelineItem, TimelineMeta, TimelineTitle };
