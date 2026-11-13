import type { ComponentProps, ReactNode } from "react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "#avenue/components/card";
import { TitleWithCount } from "#avenue/components/status";
import { cn } from "#avenue/lib/utils";

/**
 * A titled section of a record page (AVE-9): the household's Dues, People, Complaints. Title and optional count on
 * the header line, one action at its end (the year Select, Add person), then the content. From the app's
 * SectionCard (detail.tsx).
 *
 * The action follows AVE-2's corner rule through Card: on the title's line, a full 16px from the top and right
 * edges, sm size (28px, 8px corner), never a pill. The title is a level-2 heading under the page's h1.
 *
 * The outline is the app's border colour (`ring-border`, AVE-70), not Card's 10% foreground ring.
 */
export function SectionCard({
  title,
  count,
  countLabel,
  action,
  children,
  className,
  ...props
}: Omit<ComponentProps<typeof Card>, "title"> & {
  title: string;
  /** Beside the title: a number, or text such as "2 open". */
  count?: ReactNode | undefined;
  /** What a screen reader hears after the count: "open" reads the heading as "Complaints, 2 open". */
  countLabel?: string | undefined;
  /** One control, sm size. */
  action?: ReactNode | undefined;
}) {
  return (
    <Card data-section="" className={cn("shadow-card ring-border", className)} {...props}>
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-group text-compact">
            <TitleWithCount title={title} count={count} countLabel={countLabel} />
          </h2>
        </CardTitle>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="text-compact">{children}</CardContent>
    </Card>
  );
}
