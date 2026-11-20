import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { ChevronRightIcon } from "lucide-react";
import { createContext, useContext, type ComponentProps } from "react";
import { defined, type Loose, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * A full-width row that opens a section of its own (AVE-121): the board's sticky day header in the activity list, the
 * "7 AM – 9 AM · nothing scheduled" fold in the time grid, and a message row that opens to show the message. The
 * Disclosure is the other shape, a muted one-line summary as wide as its label.
 *
 * Behavior is ui-sdk's Collapsible: the trigger is a real button with aria-expanded and aria-controls, Enter and
 * Space toggle it, and closing it with focus inside the panel puts focus back on the trigger.
 *
 *   CollapsibleSection           root, the open state (ui-sdk Collapsible)
 *   ├── CollapsibleSectionHeader the row's look, per `variant`; holds the trigger and anything beside it
 *   │   └── CollapsibleSectionTrigger  the button; a leading chevron in `bar` and `fold`
 *   └── CollapsibleSectionPanel  what opens (ui-sdk CollapsiblePanel)
 *
 * Variants, from the board's three hand-drawn rows:
 * - `bar`: the day header, a 44px muted bar with the 14px corner. The trigger fills it, a summary can sit at its end.
 * - `fold`: the quiet-hours fold, a muted band with a bottom border, muted meta text, darker on hover.
 * - `plain`: no chrome, for a row whose container draws it, such as a message card. No chevron: the row itself is
 *   the control, and its state shows in what it reveals.
 * - `disclosure`: secondary detail under a muted one-line summary (the admin-only Advanced block, a workbook's
 *   sheets), the shape `Disclosure` drew (AVE-149 folds it in here). The trigger sits in the root with no header,
 *   as wide as its label, so a tap beside it doesn't toggle the section; the panel is indented under the label.
 *   Against the app's native summary (AVE-58): the text stays muted when open, as the app's does, and darkens on
 *   hover; the chevron stands in for the browser's marker and turns to show the state. The 4px side padding and xs
 *   corner give the focus ring room, and the -4px margin keeps the label where the app's sits.
 *
 * A fold whose content shows elsewhere (the time grid draws the extra hours in its own rows) leaves the panel out;
 * the trigger still reports aria-expanded. The panel opens without a height animation, as the board's rows do, so
 * a long list under a sticky header doesn't move under the reader.
 */

export type CollapsibleSectionVariant = "bar" | "fold" | "plain" | "disclosure";

const VariantContext = createContext<CollapsibleSectionVariant>("bar");

function CollapsibleSection({
  variant = "bar",
  className,
  ...props
}: Loose<ComponentProps<typeof Collapsible>> & { variant?: CollapsibleSectionVariant | undefined }) {
  return (
    <VariantContext.Provider value={variant}>
      <Collapsible
        data-variant={variant}
        className={cn(variant === "disclosure" ? "text-meta text-muted-foreground" : "min-w-0", className)}
        {...defined(props)}
      />
    </VariantContext.Provider>
  );
}

const headerLook: Record<CollapsibleSectionVariant, string> = {
  bar: "flex h-11 items-center gap-2 rounded-xl bg-muted px-3 text-meta text-muted-foreground",
  fold: "flex items-center border-b bg-muted/50 px-2 text-meta text-muted-foreground hover:bg-muted",
  plain: "grid",
  disclosure: "",
};

function CollapsibleSectionHeader({ className, render, ...props }: OwnPartProps<"div">) {
  const variant = useContext(VariantContext);
  return renderElement(
    "div",
    mergeProps({ "data-slot": "collapsible-section-header", className: cn(headerLook[variant], className) }, defined(props)),
    render,
  );
}

const triggerLook: Record<CollapsibleSectionVariant, string> = {
  // Stretched to the bar's 44px, so the whole height takes the tap; -4px keeps the chevron where the app's sits while
  // the 4px padding gives the ring room.
  bar: "-mx-1 flex min-w-0 flex-1 items-center gap-2 self-stretch rounded-md px-1 text-start",
  // On a phone the fold grows to a 44px row: the hours above and below it can hold events, so an invisible
  // extension would overlap them.
  fold: "flex min-w-0 flex-1 items-center gap-1 rounded-xs py-1 text-start pointer-coarse:min-h-11",
  plain: "grid w-full gap-1 rounded-xs text-start",
  disclosure: "-mx-1 inline-flex items-center gap-1 rounded-xs px-1 text-meta text-muted-foreground hover:text-foreground",
};

/** The chevron per variant: the disclosure's is 16px and takes the label's colour, so it darkens with it on hover. */
const chevronLook: Record<Exclude<CollapsibleSectionVariant, "plain">, string> = {
  bar: "size-3.5 text-muted-foreground",
  fold: "size-3.5 text-muted-foreground",
  disclosure: "size-4",
};

function CollapsibleSectionTrigger({ className, children, ...props }: Loose<ComponentProps<typeof CollapsibleTrigger>>) {
  const variant = useContext(VariantContext);
  return (
    <CollapsibleTrigger
      className={cn(
        "group/section-trigger relative hit-area outline-none select-none",
        "focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        triggerLook[variant],
        className,
      )}
      {...defined(props)}
    >
      {(state) => (
        <>
          {variant !== "plain" && (
            <ChevronRightIcon
              aria-hidden
              className={cn(
                "shrink-0 transition-transform duration-moderate group-data-open/section-trigger:rotate-90 motion-reduce:transition-none",
                chevronLook[variant],
              )}
            />
          )}
          {typeof children === "function" ? children(state) : children}
        </>
      )}
    </CollapsibleTrigger>
  );
}

function CollapsibleSectionPanel({ className, ...props }: Loose<ComponentProps<typeof CollapsiblePanel>>) {
  const variant = useContext(VariantContext);
  return (
    <CollapsiblePanel
      className={cn(variant === "disclosure" ? "mt-2 grid gap-2 ps-5" : "min-w-0", className)}
      {...defined(props)}
    />
  );
}

export { CollapsibleSection, CollapsibleSectionHeader, CollapsibleSectionPanel, CollapsibleSectionTrigger };
