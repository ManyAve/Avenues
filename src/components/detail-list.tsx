import { LockIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "#avenue/lib/utils";

/**
 * Label and value pairs, one under the other (AVE-9): a person's details, a payment's details. A real description
 * list, so a screen reader pairs each value with its label. Values keep their line breaks (an address) and wrap
 * anywhere (a long email), and can be selected for copying. From the app's DetailList (dialogs.tsx).
 */
export function DetailList({
  items,
  className,
  ...props
}: Omit<ComponentProps<"dl">, "children"> & { items: readonly { label: string; value: ReactNode }[] }) {
  return (
    <dl data-slot="detail-list" className={cn("grid gap-row-y", className)} {...props}>
      {items.map((item) => (
        <div key={item.label}>
          <dt className="font-[550]">{item.label}</dt>
          <dd className="break-words whitespace-pre-line text-muted-foreground select-text">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * One row of a short list inside a section (AVE-9): a document, a payment, a letter. Title, a meta line, an optional
 * note (with a lock: who can see it), and something at the end (an amount, a button). Rows are divided by a line.
 * From the app's ListItem (detail.tsx).
 */
export function ListItem({
  title,
  meta,
  note,
  trailing,
  className,
  ...props
}: Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  meta: ReactNode;
  /** Who can see it, e.g. "Board only". */
  note?: ReactNode | undefined;
  trailing?: ReactNode | undefined;
}) {
  return (
    <div
      data-slot="list-item"
      className={cn("flex items-start justify-between gap-row-y py-group text-compact not-last:border-b", className)}
      {...props}
    >
      <div className="min-w-0">
        <p className="font-[550] break-words">{title}</p>
        <p className="text-meta text-muted-foreground">{meta}</p>
        {note && (
          <p className="mt-1 flex items-center gap-1 text-meta text-muted-foreground">
            <LockIcon className="size-3" aria-hidden /> {note}
          </p>
        )}
      </div>
      {trailing}
    </div>
  );
}
