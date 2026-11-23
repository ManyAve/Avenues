import {
  Timeline as TimelinePrimitive,
  TimelineConnector as TimelineConnectorPrimitive,
  TimelineDescription as TimelineDescriptionPrimitive,
  TimelineItem as TimelineItemPrimitive,
  TimelineMarker as TimelineMarkerPrimitive,
  TimelineTime as TimelineTimePrimitive,
  TimelineTitle as TimelineTitlePrimitive,
  createTimelineController,
  type TimelineStatus,
} from "@ui-sdk/react/timeline";
import type { ComponentProps } from "react";
import { StatusDot, type StatusDotTone } from "#avenue/components/status";
import { defined, type Loose, type NodeChildren } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * What happened, in order (AVE-219): a household's or an association's history, the steps a job ran, an audit trail.
 * ui-sdk's Timeline supplies the list, one tab stop with Up, Down, Home and End between entries, `status` for a
 * process, and `feed` for a list that loads more; Avenue draws it.
 *
 *   Timeline                      the list
 *   └── TimelineItem              one entry
 *       ├── TimelineMarker        the dot on the line; `tone` colours it
 *       ├── TimelineConnector     the line to the next entry
 *       ├── TimelineTitle         what happened
 *       ├── TimelineTime          when; pass `dateTime`
 *       └── TimelineDescription   where, who, a note, a Badge row
 *
 * Newest first for a history people check ("what changed?"), oldest first for steps that ran in order.
 *
 * Look: an 8px StatusDot beside the title's first line, a 1px `border` line from under it to the next dot, the title
 * at `text-compact`, the time and description muted at `text-meta`. `tone` on the marker is `neutral` unless this
 * entry is the news (a failed payment, a fix shipped); the words still say so, because ui-sdk hides the marker and
 * the line from screen readers and colour never carries a meaning alone. Put an icon in the marker in place of the
 * dot by giving it children.
 *
 * Not a ListItem: list rows are things (a document, a payment) divided by rules, with something at the row's end;
 * timeline entries are moments joined by a line. Not a MessageList either, which is a conversation.
 */
function Timeline({ className, ...props }: Loose<ComponentProps<typeof TimelinePrimitive>>) {
  return <TimelinePrimitive className={cn("grid text-compact", className)} {...defined(props)} />;
}

/** One entry: the marker and line in a narrow column, the title, time and description beside them. */
function TimelineItem({ className, ...props }: Loose<ComponentProps<typeof TimelineItemPrimitive>>) {
  return (
    <TimelineItemPrimitive
      className={cn(
        "group/timeline-item relative grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md pb-4 outline-none last:pb-0 focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      {...defined(props)}
    />
  );
}

/** The dot on the line, as tall as the title's first line so it sits beside it whatever follows. */
function TimelineMarker({
  tone = "neutral",
  className,
  children,
  ...props
}: NodeChildren<Loose<ComponentProps<typeof TimelineMarkerPrimitive>>> & {
  /** The dot's colour. Neutral unless this entry is the news; the words carry the meaning either way. */
  tone?: StatusDotTone | undefined;
}) {
  return (
    <TimelineMarkerPrimitive
      data-tone={tone}
      className={cn("col-start-1 row-start-1 flex h-6 w-2 items-center justify-center", className)}
      {...defined(props)}
    >
      {children ?? <StatusDot tone={tone} size="md" />}
    </TimelineMarkerPrimitive>
  );
}

/** The line from under this entry's dot to the next entry's. The last entry draws none. */
function TimelineConnector({ className, ...props }: Loose<ComponentProps<typeof TimelineConnectorPrimitive>>) {
  return (
    <TimelineConnectorPrimitive
      className={cn(
        "absolute top-6 bottom-0 left-1 w-px -translate-x-1/2 bg-border group-last/timeline-item:hidden group-data-last/timeline-item:hidden",
        className,
      )}
      {...defined(props)}
    />
  );
}

/** What happened. Wraps anywhere, so a long name doesn't widen the page. */
function TimelineTitle({ className, ...props }: Loose<ComponentProps<typeof TimelineTitlePrimitive>>) {
  return <TimelineTitlePrimitive className={cn("col-start-2 min-w-0 wrap-break-word", className)} {...defined(props)} />;
}

/** When it happened, muted. Pass `dateTime` so the date is machine readable while the text stays friendly. */
function TimelineTime({ className, ...props }: Loose<ComponentProps<typeof TimelineTimePrimitive>>) {
  return (
    <TimelineTimePrimitive className={cn("col-start-2 text-meta text-muted-foreground", className)} {...defined(props)} />
  );
}

/** One muted line or more under the title: where it was recorded, who did it, a note, a Badge row. */
function TimelineDescription({ className, ...props }: Loose<ComponentProps<typeof TimelineDescriptionPrimitive>>) {
  return (
    <TimelineDescriptionPrimitive
      className={cn(
        "col-start-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted-foreground",
        className,
      )}
      {...defined(props)}
    />
  );
}

export {
  Timeline,
  TimelineConnector,
  TimelineDescription,
  TimelineItem,
  TimelineMarker,
  TimelineTime,
  TimelineTitle,
  createTimelineController,
  type TimelineStatus,
};
