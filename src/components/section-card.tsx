import type { ComponentProps } from "react";
import { Card, CardTitle } from "#avenue/components/card";
import { TitleCount } from "#avenue/components/status";
import { defined, type Loose } from "#avenue/lib/props";
import { floatingEdge } from "#avenue/lib/popup";
import { cn } from "#avenue/lib/utils";

/**
 * A titled section of a record page (AVE-9): the household's Dues, People, Complaints. Title and optional count on
 * the header line, one action at its end (the year Select, Add person), then the content. From the app's
 * SectionCard (detail.tsx).
 *
 * Built on Card's parts (AVE-149): SectionCard is the Card, and its header, action and content are Card's own.
 *
 *   SectionCard                the Card, with the section's outline and shadow
 *   ├── CardHeader
 *   │   ├── SectionCardTitle   Card's title as an h2
 *   │   │   └── SectionCardCount
 *   │   └── CardAction         one control, sm size
 *   └── CardContent            compact text
 *
 * The action follows AVE-2's corner rule through Card: on the title's line, a full 16px from the top and right
 * edges, sm size (28px, 8px corner), never a pill. The title is a level-2 heading under the page's h1.
 *
 * It is a raised card (AVE-208): `shadow-card` and the floating edge (`ring-border-floating`, real 1px border in forced
 * colours), where a flat Card keeps `ring-border`.
 *
 * No `title`: it was the slot prop for the title part (AVE-149), and an HTML tooltip in its place would hide a
 * stale call.
 */
function SectionCard({ className, ...props }: Omit<Loose<ComponentProps<typeof Card>>, "title">) {
  return (
    <Card
      data-section=""
      className={cn("shadow-card *:data-[slot=card-content]:text-compact", floatingEdge, className)}
      {...defined(props)}
    />
  );
}

/** The section's title: Card's title drawn as an h2 under the page's h1. `render={<h3 />}` for a section inside one. */
function SectionCardTitle({ className, render, ...props }: Loose<ComponentProps<typeof CardTitle>>) {
  return (
    <CardTitle
      // oxlint-disable-next-line jsx-a11y/heading-has-content -- CardTitle passes its children into the heading.
      render={render ?? <h2 />}
      className={cn("flex items-center gap-group group-data-[size=sm]/card:text-compact", className)}
      {...defined(props)}
    />
  );
}

/** Beside the title: a number, or text such as "2 open". `label` is what a screen reader hears after it. */
function SectionCardCount(props: ComponentProps<typeof TitleCount>) {
  return <TitleCount data-section-card-count="" {...props} />;
}

export { SectionCard, SectionCardCount, SectionCardTitle };
