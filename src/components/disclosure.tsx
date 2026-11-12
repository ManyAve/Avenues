import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
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
 * Replaces the app's native details/summary blocks: the summary is a real button with a visible focus ring and
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
    <Collapsible.Root
      {...(defaultOpen !== undefined ? { defaultOpen } : {})}
      {...(open !== undefined ? { open } : {})}
      {...(onOpenChange ? { onOpenChange: (next: boolean) => onOpenChange(next) } : {})}
      disabled={disabled}
      data-slot="disclosure"
      className={cn("text-meta text-muted-foreground", className)}
    >
      <Collapsible.Trigger
        className={cn(
          "group/disclosure -mx-1 inline-flex items-center gap-1 rounded-xs px-1 text-meta text-muted-foreground outline-none select-none",
          "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-panel-open:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <ChevronRightIcon
          aria-hidden
          className="size-4 shrink-0 transition-transform duration-150 group-data-panel-open/disclosure:rotate-90 motion-reduce:transition-none"
        />
        {summary}
      </Collapsible.Trigger>
      <Collapsible.Panel className={cn("mt-2 grid gap-2 ps-5", panelClassName)}>{children}</Collapsible.Panel>
    </Collapsible.Root>
  );
}
