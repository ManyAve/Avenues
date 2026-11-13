import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { defined } from "#avenue/lib/picker";
import { cn } from "#avenue/lib/utils";

export interface DisclosureProps {
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
}: DisclosureProps) {
  return (
    <Collapsible
      {...defined({ defaultOpen, open, disabled })}
      {...(onOpenChange ? { onOpenChange: (next: boolean) => onOpenChange(next) } : {})}
      data-slot="disclosure"
      className={cn("text-meta text-muted-foreground", className)}
    >
      <CollapsibleTrigger
        className={cn(
          "group/disclosure -mx-1 inline-flex items-center gap-1 rounded-xs px-1 text-meta text-muted-foreground outline-none select-none",
          "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-open:text-foreground",
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
