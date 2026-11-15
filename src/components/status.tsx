import type { ComponentProps, ReactNode } from "react";
import { Badge } from "#avenue/components/badge";
import { InfoTip } from "#avenue/components/tooltip";
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
function Count({ value, className, ...props }: ComponentProps<"span"> & { value: ReactNode }) {
  return (
    <span
      data-slot="count"
      className={cn("rounded-xs bg-muted px-1 text-meta text-muted-foreground tabular-nums", className)}
      {...props}
    >
      {value}
    </span>
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
      {!filled && <span aria-hidden className={cn("size-1.5 rounded-full", dots[tone])} />}
      {children as ReactNode}
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

export { Count, Status, TitleWithCount, type StatusTone };
