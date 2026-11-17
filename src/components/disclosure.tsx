import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { ChevronRightIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { defined, type Loose } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * Any other prop of ui-sdk's Collapsible root (a ref, an id, aria-* or data-*) lands on the root (AVE-138). The root's
 * data-slot is ui-sdk's, `collapsible`: an Avenue name passed to it never reached the page, so it is gone.
 */
export interface DisclosureProps
  extends Omit<Loose<ComponentProps<typeof Collapsible>>, "children" | "defaultOpen" | "open" | "onOpenChange" | "disabled" | "className"> {
  /** The always-visible line that opens and closes it ("Advanced", "Show the follow-up question"). */
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  /** Extra classes for the content under the summary. */
  panelClassName?: string | undefined;
}

/**
 * Shows or hides secondary detail under a one-line summary (the admin-only Advanced block, a workbook's sheets).
 * Built on ui-sdk's Collapsible. Replaces the app's native details/summary blocks: the summary is a real button with a visible focus ring and
 * aria-expanded, Enter or Space toggles it, and the chevron turns to show the state.
 *
 * Against the app's summary (AVE-58): the text stays muted when open, as the app's does; the chevron stands in for
 * the browser's marker and turns to show the state. The 4px side padding and xs corner give the focus ring room,
 * and the -4px margin keeps the label where the app's sits. The trigger is as wide as its label, not the whole line,
 * so a tap beside it doesn't toggle the section.
 */
export function Disclosure({
  summary,
  children,
  defaultOpen,
  open,
  onOpenChange,
  disabled,
  className,
  panelClassName,
  ...props
}: DisclosureProps) {
  return (
    <Collapsible
      {...defined(props)}
      {...defined({ defaultOpen, open, disabled })}
      {...(onOpenChange ? { onOpenChange: (next: boolean) => onOpenChange(next) } : {})}
      className={cn("text-meta text-muted-foreground", className)}
    >
      <CollapsibleTrigger
        className={cn(
          "group/disclosure relative hit-area -mx-1 inline-flex items-center gap-1 rounded-xs px-1 text-meta text-muted-foreground outline-none select-none",
          "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        )}
      >
        <ChevronRightIcon
          aria-hidden
          className="size-4 shrink-0 transition-transform duration-150 group-data-open/disclosure:rotate-90 motion-reduce:transition-none"
        />
        {summary}
      </CollapsibleTrigger>
      <CollapsiblePanel className={cn("mt-2 grid gap-2 ps-5", panelClassName)}>{children}</CollapsiblePanel>
    </Collapsible>
  );
}
