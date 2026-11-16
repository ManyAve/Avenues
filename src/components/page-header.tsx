import type { ComponentProps, ReactNode } from "react";
import { TitleWithCount } from "#avenue/components/status";
import { cn } from "#avenue/lib/utils";

/**
 * The top of a page (AVE-9): an optional eyebrow, the title (the page's one h1, `heading` 24px), an optional count,
 * a one-line description, and the page's actions at the end of the title line. On a phone the actions wrap under the
 * title instead of squeezing it. From the app's PageHeader (detail.tsx) and Neighbors' hub pages (NEI-101).
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
export function PageHeader({
  eyebrow,
  title,
  count,
  countLabel,
  description,
  actions,
  className,
  ...props
}: Omit<ComponentProps<"header">, "title"> & {
  /** A short label above the title: the section, or "Household". */
  eyebrow?: ReactNode | undefined;
  title: string;
  /** Beside the title: how many things the page lists. */
  count?: ReactNode | undefined;
  /** What a screen reader hears after the count: "open" reads the heading as "Complaints, 2 open". */
  countLabel?: string | undefined;
  /** One line under the title. */
  description?: ReactNode | undefined;
  actions?: ReactNode | undefined;
}) {
  return (
    <header
      data-slot="page-header"
      className={cn("flex flex-wrap items-end justify-between gap-x-group gap-y-row-y", className)}
      {...props}
    >
      <div className="min-w-0 basis-full sm:basis-auto">
        {eyebrow && <p className="text-meta text-muted-foreground">{eyebrow}</p>}
        <h1 className="flex items-center gap-group text-heading font-[620] tracking-[-0.7px] break-words">
          <TitleWithCount title={title} count={count} countLabel={countLabel} />
        </h1>
        {description && <p className="mt-0.5 text-meta text-muted-foreground">{description}</p>}
      </div>
      {actions && (
        <div data-slot="page-header-actions" className="flex flex-wrap items-center gap-controls">
          {actions}
        </div>
      )}
    </header>
  );
}
