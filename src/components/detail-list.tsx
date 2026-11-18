import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { LockIcon } from "lucide-react";
import type { ReactNode } from "react";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * Label and value pairs, one under the other (AVE-9): a person's details, a payment's details. A real description
 * list, so a screen reader pairs each value with its label. Values keep their line breaks (an address) and wrap
 * anywhere (a long email), and can be selected for copying. From the app's DetailList (dialogs.tsx).
 *
 * A root and parts, as ui-sdk composes (AVE-149); or `items`, which builds the same parts:
 *
 *   DetailList            the dl
 *   └── DetailListItem    one pair
 *       ├── DetailListTerm    the dt, the label
 *       └── DetailListDetail  the dd, the value
 */
function DetailList({
  items,
  children,
  className,
  render,
  ...props
}: OwnPartProps<"dl"> & {
  /** The pairs, in order. Leave it out and write `DetailListItem`s instead. */
  items?: readonly { label: string; value: ReactNode }[] | undefined;
}) {
  return renderElement(
    "dl",
    mergeProps(
      {
        "data-slot": "detail-list",
        className: cn("grid gap-row-y", className),
        children: (
          <>
            {items?.map((item) => (
              <DetailListItem key={item.label}>
                <DetailListTerm>{item.label}</DetailListTerm>
                <DetailListDetail>{item.value}</DetailListDetail>
              </DetailListItem>
            ))}
            {children}
          </>
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** One label and its value: the `div` a description list may group a dt and its dd in. */
function DetailListItem({ render, ...props }: OwnPartProps<"div">) {
  return renderElement("div", mergeProps({ "data-slot": "detail-list-item" }, defined(props)), render);
}

/** The label. */
function DetailListTerm({ className, render, ...props }: OwnPartProps<"dt">) {
  return renderElement(
    "dt",
    mergeProps({ "data-slot": "detail-list-term", className: cn("font-[550]", className) }, defined(props)),
    render,
  );
}

/** The value: muted, keeping its line breaks, wrapping anywhere, selectable. */
function DetailListDetail({ className, render, ...props }: OwnPartProps<"dd">) {
  return renderElement(
    "dd",
    mergeProps(
      {
        "data-slot": "detail-list-detail",
        className: cn("break-words whitespace-pre-line text-muted-foreground select-text", className),
      },
      defined(props),
    ),
    render,
  );
}

/**
 * One row of a short list inside a section (AVE-9): a document, a payment, a letter. Title, a meta line, an optional
 * note (with a lock: who can see it), and something at the end (an amount, a button). Rows are divided by a line.
 * From the app's ListItem (detail.tsx).
 *
 *   ListItem               the row
 *   ├── ListItemContent    the text column
 *   │   ├── ListItemTitle
 *   │   ├── ListItemMeta
 *   │   └── ListItemNote   with a lock: who can see it
 *   └── ListItemTrailing   an amount, a button
 */
function ListItem({
  title,
  meta,
  note,
  trailing,
  children,
  className,
  render,
  ...props
}: Omit<OwnPartProps<"div">, "title"> & {
  /** @deprecated Use `<ListItemContent><ListItemTitle>` (AVE-149). */
  title?: ReactNode;
  /** @deprecated Use `<ListItemMeta>` (AVE-149). */
  meta?: ReactNode;
  /**
   * Who can see it, e.g. "Board only".
   * @deprecated Use `<ListItemNote>` (AVE-149).
   */
  note?: ReactNode;
  /** @deprecated Use `<ListItemTrailing>` (AVE-149). */
  trailing?: ReactNode;
}) {
  const fromProps = title !== undefined || meta !== undefined;
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "list-item",
        className: cn("flex items-start justify-between gap-row-y py-group text-compact not-last:border-b", className),
        children: (
          <>
            {fromProps && (
              <ListItemContent>
                {title !== undefined && <ListItemTitle>{title}</ListItemTitle>}
                {meta !== undefined && <ListItemMeta>{meta}</ListItemMeta>}
                {note && <ListItemNote>{note}</ListItemNote>}
              </ListItemContent>
            )}
            {trailing}
            {children}
          </>
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** The text column: title, meta line and note. */
function ListItemContent({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps({ "data-slot": "list-item-content", className: cn("min-w-0", className) }, defined(props)),
    render,
  );
}

/** What the row is. Wraps anywhere, so a long file name doesn't push the end of the row off. */
function ListItemTitle({ className, render, ...props }: OwnPartProps<"p">) {
  return renderElement(
    "p",
    mergeProps({ "data-slot": "list-item-title", className: cn("font-[550] break-words", className) }, defined(props)),
    render,
  );
}

/** One muted line under the title: a date, a size, who sent it. */
function ListItemMeta({ className, render, ...props }: OwnPartProps<"p">) {
  return renderElement(
    "p",
    mergeProps(
      { "data-slot": "list-item-meta", className: cn("text-meta text-muted-foreground", className) },
      defined(props),
    ),
    render,
  );
}

/** Who can see it, e.g. "Board only", after a lock. */
function ListItemNote({ className, children, render, ...props }: OwnPartProps<"p">) {
  return renderElement(
    "p",
    mergeProps(
      {
        "data-slot": "list-item-note",
        className: cn("mt-1 flex items-center gap-1 text-meta text-muted-foreground", className),
        children: (
          <>
            <LockIcon className="size-3" aria-hidden /> {children}
          </>
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** Something at the row's end: an amount, a button. Its own box adds no space: it lays its content out as a row. */
function ListItemTrailing({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps({ "data-slot": "list-item-trailing", className: cn("flex", className) }, defined(props)),
    render,
  );
}

export {
  DetailList,
  DetailListDetail,
  DetailListItem,
  DetailListTerm,
  ListItem,
  ListItemContent,
  ListItemMeta,
  ListItemNote,
  ListItemTitle,
  ListItemTrailing,
};
