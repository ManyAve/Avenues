import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import type { ComponentProps, ReactNode } from "react";
import { Badge } from "#avenue/components/badge";
import { InfoTip } from "#avenue/components/tooltip";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * ManyAve's Status and Count, ported from the app's app/ui/components/Badge.tsx (e01cc90). Colours unchanged.
 * AVE-2: Count's 4px corner is xs and its 5px side padding 4px; Status's 5px gap is 4px and its 6px side
 * padding 8px. Pills allowed (AVE-2 section 5).
 *
 * Status is as tall as the app's (AVE-56): its meta line plus 1px padding and a 1px border, so 24px on the web
 * scale and 22px on desktop. The app pads its filled pill 3px instead, which is off the grid; here outline and
 * filled share one height, so a register row of mixed labels lines up.
 *
 * `destructive` is the board's "Needs attention" (MANA-1054, added to the app after the port): something the board
 * has to fix, such as an announcement whose emails didn't go out. Same colours as the app's.
 */

/** Small muted count next to a label, e.g. "Households 24". */
function Count({ value, className, render, ...props }: OwnPartProps<"span"> & { value: ReactNode }) {
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "count",
        className: cn("rounded-xs bg-muted px-1 text-meta text-muted-foreground tabular-nums", className),
        children: value,
      },
      defined(props),
    ),
    render,
  );
}

/**
 * A heading's title and its count (PageHeader, SectionCard). The visible Count is hidden from screen readers and the
 * heading's name reads "Complaints, 2 open" instead of "Complaints 2", which in a headings list sounds like a title
 * with a typo (AVE-69). `countLabel` is the word after the number ("open"); without it the name is "Complaints, 2".
 */
function TitleWithCount({
  title,
  count,
  countLabel,
}: {
  title: ReactNode;
  count?: ReactNode | undefined;
  countLabel?: string | undefined;
}) {
  if (count === undefined) return <>{title}</>;
  return (
    <>
      <span>
        {title}
        <span className="sr-only">
          , {count}
          {countLabel ? ` ${countLabel}` : ""}
        </span>
      </span>
      <Count aria-hidden value={count} />
    </>
  );
}

type StatusTone = "success" | "warning" | "destructive" | "primary" | "info" | "neutral";

const dots: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  primary: "bg-primary",
  info: "bg-info",
  neutral: "bg-slate-subtle-foreground",
};

const fills: Record<StatusTone, string> = {
  success: "bg-success-subtle text-success-subtle-foreground",
  warning: "bg-warning-subtle text-warning-subtle-foreground",
  destructive: "bg-destructive-subtle text-destructive-subtle-foreground",
  primary: "bg-primary-subtle text-primary-subtle-foreground",
  info: "bg-info-subtle text-info-subtle-foreground",
  neutral: "bg-slate-subtle text-slate-subtle-foreground",
};

/** A dot's colour: a Status tone, or `current` for the parent's text colour. */
type StatusDotTone = StatusTone | "current";

const dotSizes = {
  sm: "size-1.5",
  md: "size-2",
} as const;

type StatusDotSize = keyof typeof dotSizes;

/**
 * A small filled circle that marks state beside or over something else: needs attention, unread, live now (AVE-130).
 * Avenue's own part: it has no behavior, so there is nothing to take from ui-sdk. Its colours are Status's, so a dot
 * and a Status pill of the same tone always match; Status draws its own dot with it.
 *
 * Colour alone can't carry meaning (WCAG 1.4.1), so by default the dot is hidden from screen readers and the row, tab
 * or nav item it sits in says what it means. When the dot is the only signal (an attention dot over a bottom-nav
 * icon), pass `label` ("New messages"): the dot then holds that text, visually hidden, and is read. It is never
 * focusable.
 *
 * `size` is `sm` (6px, Status's dot) or `md` (8px). `ring` draws a 2px halo in the page colour, for a dot placed over
 * an icon or avatar. Position it yourself (`absolute -top-0.5 -right-0.5` inside a `relative` parent).
 */
function StatusDot({
  tone,
  size = "sm",
  ring = false,
  label,
  className,
  render,
  ...props
}: Omit<OwnPartProps<"span">, "children"> & {
  tone: StatusDotTone;
  size?: StatusDotSize | undefined;
  ring?: boolean | undefined;
  /** What the dot means, read by screen readers, for a dot that is the only signal. Without it the dot is hidden. */
  label?: string | undefined;
}) {
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "status-dot",
        "data-tone": tone,
        "aria-hidden": label ? undefined : true,
        className: cn(
          "inline-block shrink-0 rounded-full",
          dotSizes[size],
          tone === "current" ? "bg-current" : dots[tone],
          ring && "ring-2 ring-background",
          className,
        ),
        children: label ? <span className="sr-only">{label}</span> : undefined,
      },
      defined(props),
    ),
    render,
  );
}

/**
 * A status label: an outlined pill with a coloured dot, or with `filled` a tinted pill. The words carry the
 * meaning and the colour only repeats it, so never pass a status without a label.
 *
 * `help` explains the status. The app put it in a tooltip on the pill itself, a plain span that keyboard and
 * touch users could never open; here it is an InfoTip button beside the pill, which opens on hover, focus and
 * tap. `helpLabel` names that button; it defaults to "About <label>" when the label is plain text.
 */
function Status({
  tone,
  help,
  helpLabel,
  filled = false,
  className,
  children,
  ...props
}: ComponentProps<typeof Badge> & {
  tone: StatusTone;
  help?: ReactNode | undefined;
  helpLabel?: string | undefined;
  filled?: boolean | undefined;
}) {
  const pill = (
    <Badge
      variant="outline"
      data-slot="status"
      data-tone={tone}
      data-filled={filled ? "" : undefined}
      className={cn(
        "h-auto gap-1 bg-background px-2 py-px font-[450] text-muted-foreground",
        filled && ["border-transparent", fills[tone]],
        className,
      )}
      {...props}
    >
      {!filled && <StatusDot tone={tone} />}
      {children}
    </Badge>
  );
  if (!help) return pill;
  const label = helpLabel ?? (typeof children === "string" ? `About ${children}` : undefined);
  if (!label) throw new Error("Status: pass helpLabel when the label isn't plain text.");
  return (
    <span data-slot="status-with-help" className="inline-flex items-center gap-1">
      {pill}
      <InfoTip label={label}>{help}</InfoTip>
    </span>
  );
}

export { Count, Status, StatusDot, TitleWithCount, type StatusDotSize, type StatusDotTone, type StatusTone };
