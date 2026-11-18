import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import type { ComponentProps, ReactNode } from "react";
import { TitleCount } from "#avenue/components/status";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * The top of a page (AVE-9): an optional eyebrow, the title (the page's one h1, `heading` 24px), an optional count,
 * a one-line description, and the page's actions at the end of the title line. On a phone the actions wrap under the
 * title instead of squeezing it. From the app's PageHeader (detail.tsx) and Neighbors' hub pages (NEI-101).
 *
 * A root and parts, as ui-sdk composes (AVE-149):
 *
 *   PageHeader                 root, the header landmark
 *   ├── PageHeaderContent      the text column
 *   │   ├── PageHeaderEyebrow
 *   │   ├── PageHeaderTitle    the h1
 *   │   │   └── PageHeaderCount
 *   │   └── PageHeaderDescription
 *   └── PageHeaderActions
 *
 * The actions are things you tap, so they sit `gap-controls` apart (8px with a mouse, 16px on a phone, AVE-69), in
 * case an app's own control there doesn't grow to 44px.
 *
 * The title is the `heading` step, 24px on a 30px line, where the app's is 24px on a 24px line (an arbitrary
 * `text-[1.5rem]` that inherits the body's line, AVE-70). Kept: a page title wraps on a phone, and on a 24px line two
 * lines of 24px text touch.
 *
 * The header doesn't pad itself: put it inside the page's frame (px-page, max-w-reading or max-w-layout), so the title
 * and the content under it share an edge.
 */
function PageHeader({
  eyebrow,
  title,
  count,
  countLabel,
  description,
  actions,
  children,
  className,
  render,
  ...props
}: Omit<OwnPartProps<"header">, "title"> & {
  /** @deprecated Use `<PageHeaderEyebrow>` (AVE-149). */
  eyebrow?: ReactNode;
  /** @deprecated Use `<PageHeaderTitle>` inside `PageHeaderContent` (AVE-149). */
  title?: string | undefined;
  /** @deprecated Use `<PageHeaderCount value={…}>` inside the title (AVE-149). */
  count?: ReactNode;
  /** @deprecated Use PageHeaderCount's `label` (AVE-149). */
  countLabel?: string | undefined;
  /** @deprecated Use `<PageHeaderDescription>` (AVE-149). */
  description?: ReactNode;
  /** @deprecated Use `<PageHeaderActions>` (AVE-149). */
  actions?: ReactNode;
}) {
  return renderElement(
    "header",
    mergeProps(
      {
        "data-slot": "page-header",
        className: cn("flex flex-wrap items-end justify-between gap-x-group gap-y-row-y", className),
        children: (
          <>
            {title !== undefined && (
              <PageHeaderContent>
                {eyebrow && <PageHeaderEyebrow>{eyebrow}</PageHeaderEyebrow>}
                <PageHeaderTitle>
                  {title}
                  {count !== undefined && <PageHeaderCount value={count} label={countLabel} />}
                </PageHeaderTitle>
                {description && <PageHeaderDescription>{description}</PageHeaderDescription>}
              </PageHeaderContent>
            )}
            {actions && <PageHeaderActions>{actions}</PageHeaderActions>}
            {children}
          </>
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** The text column: eyebrow, title and description. The whole row on a phone, so the actions wrap under it. */
function PageHeaderContent({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      { "data-slot": "page-header-content", className: cn("min-w-0 basis-full sm:basis-auto", className) },
      defined(props),
    ),
    render,
  );
}

/** A short label above the title: the section, or "Household". */
function PageHeaderEyebrow({ className, render, ...props }: OwnPartProps<"p">) {
  return renderElement(
    "p",
    mergeProps(
      { "data-slot": "page-header-eyebrow", className: cn("text-meta text-muted-foreground", className) },
      defined(props),
    ),
    render,
  );
}

/** The page's one h1. A `PageHeaderCount` inside sits beside the title. */
function PageHeaderTitle({ className, render, ...props }: OwnPartProps<"h1">) {
  return renderElement(
    "h1",
    mergeProps(
      {
        "data-slot": "page-header-title",
        className: cn("flex items-center gap-group text-heading font-[620] tracking-[-0.7px] break-words", className),
      },
      defined(props),
    ),
    render,
  );
}

/**
 * Beside the title: how many things the page lists. `label` is what a screen reader hears after the number: "open"
 * reads the heading as "Complaints, 2 open".
 */
function PageHeaderCount(props: ComponentProps<typeof TitleCount>) {
  return <TitleCount data-page-header-count="" {...props} />;
}

/** One line under the title. */
function PageHeaderDescription({ className, render, ...props }: OwnPartProps<"p">) {
  return renderElement(
    "p",
    mergeProps(
      { "data-slot": "page-header-description", className: cn("mt-0.5 text-meta text-muted-foreground", className) },
      defined(props),
    ),
    render,
  );
}

/** The page's actions, at the end of the title line. */
function PageHeaderActions({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      { "data-slot": "page-header-actions", className: cn("flex flex-wrap items-center gap-controls", className) },
      defined(props),
    ),
    render,
  );
}

export {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderCount,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
};
