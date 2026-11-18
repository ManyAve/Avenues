import type { Collapsible } from "@ui-sdk/react/collapsible";
import type { ComponentProps, ReactNode } from "react";
import {
  CollapsibleSection,
  CollapsibleSectionPanel,
  CollapsibleSectionTrigger,
} from "#avenue/components/collapsible-section";
import type { Loose } from "#avenue/lib/props";

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
  /** Gets the new state and ui-sdk Collapsible's details, passed on unchanged (AVE-145). */
  onOpenChange?: Loose<ComponentProps<typeof Collapsible>>["onOpenChange"];
  disabled?: boolean | undefined;
  className?: string | undefined;
  /** Extra classes for the content under the summary. */
  panelClassName?: string | undefined;
}

/**
 * Shows or hides secondary detail under a one-line summary (the admin-only Advanced block, a workbook's sheets).
 * Built from CollapsibleSection's parts with `variant="disclosure"`, which is the same look.
 *
 * @deprecated Use `<CollapsibleSection variant="disclosure">` with a `CollapsibleSectionTrigger` (the summary) and a
 * `CollapsibleSectionPanel` (v0.30.0, AVE-149). Removed in v0.31.0.
 */
export function Disclosure({ summary, children, panelClassName, ...props }: DisclosureProps) {
  return (
    <CollapsibleSection variant="disclosure" {...props}>
      <CollapsibleSectionTrigger>{summary}</CollapsibleSectionTrigger>
      <CollapsibleSectionPanel className={panelClassName}>{children}</CollapsibleSectionPanel>
    </CollapsibleSection>
  );
}
