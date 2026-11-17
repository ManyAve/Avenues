import {
  Tabs as TabsPrimitive,
  TabsList as TabsListPrimitive,
  TabsPanel as TabsPanelPrimitive,
  TabsTab as TabsTabPrimitive,
} from "@ui-sdk/react/tabs";
import type { ComponentProps } from "react";
import { cn } from "#avenue/lib/utils";
import { defined, type Loose } from "#avenue/lib/props";

/**
 * Tabs (AVE-117): views that share one space, one shown at a time. ui-sdk's tabs: one Tab stop into the list, the
 * arrow keys move and select (Home and End too), a disabled tab still takes focus, and a panel with nothing focusable
 * in it is a Tab stop of its own.
 *
 * The look is the app's `line` tabs (app/ui/components/ui/tabs.tsx, as the announcements composer draws them): text
 * tabs, left-aligned with 16px between labels on a 40px list with a bottom border, the chosen one in the foreground
 * with a 2px underline as wide as its label. Avenue ships only this look: a muted pill row would look like the
 * single-choice ToggleGroup, which behaves differently (AVE-106).
 *
 * Departures from the app, all AVE-117: the list scrolls sideways when its tabs don't fit, so a phone never wraps or
 * overflows them; for that, each tab keeps 4px inside the list for its focus ring, so a label starts 8px in (the
 * composer's px-5 list becomes px-3 to keep its labels in place). The underline covers the border line instead of hanging
 * 1px below it. On a phone the list is 48px tall and labels 24px apart (gap-controls), so every tap area is 44px. A
 * panel shows a focus ring when it takes focus; the app's had none.
 *
 * Horizontal only. The parts take ui-sdk's names (Tabs, TabsList, TabsTab, TabsPanel) and its data-slot names (tabs,
 * tabs-list, tabs-tab, tabs-panel); TabsTrigger and TabsContent stay as deprecated aliases (AVE-144).
 */
function Tabs({ className, ...props }: Loose<Omit<ComponentProps<typeof TabsPrimitive>, "orientation">>) {
  return <TabsPrimitive className={cn("flex flex-col gap-2", className)} {...defined(props)} />;
}

function TabsList({ className, ...props }: Loose<ComponentProps<typeof TabsListPrimitive>>) {
  return (
    <TabsListPrimitive
      className={cn(
        // The bottom border is an inset shadow and the tabs keep 4px inside the list, because a scrolling list clips
        // what crosses its edge: the border under a tab's underline, and a focus ring.
        "flex h-10 w-full shrink-0 items-stretch justify-start gap-controls overflow-x-auto px-1 shadow-[inset_0_-1px_0_var(--color-border)] [scrollbar-width:none] pointer-coarse:h-12",
        className,
      )}
      {...defined(props)}
    />
  );
}

function TabsTab({ className, ...props }: Loose<ComponentProps<typeof TabsTabPrimitive>>) {
  return (
    <TabsTabPrimitive
      className={cn(
        "relative hit-area my-2 inline-flex shrink-0 items-center px-1 gap-1 rounded-md text-control font-medium whitespace-nowrap text-foreground/60 outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none dark:text-muted-foreground dark:hover:text-foreground",
        "aria-selected:text-foreground dark:aria-selected:text-foreground",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:text-foreground/60 dark:data-disabled:hover:text-muted-foreground",
        // The underline is ::before, because hit-area owns ::after. It covers the list's 1px border line.
        "before:absolute before:inset-x-1 before:-bottom-2 before:h-0.5 before:bg-foreground before:opacity-0 aria-selected:before:opacity-100",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...defined(props)}
    />
  );
}

function TabsPanel({ className, ...props }: Loose<ComponentProps<typeof TabsPanelPrimitive>>) {
  return (
    <TabsPanelPrimitive
      className={cn("flex-1 rounded-md text-control outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}
      {...defined(props)}
    />
  );
}

/** @deprecated Use TabsTab. */
const TabsTrigger = TabsTab;
/** @deprecated Use TabsPanel. */
const TabsContent = TabsPanel;

export { Tabs, TabsList, TabsPanel, TabsTab };
export { TabsContent, TabsTrigger };
