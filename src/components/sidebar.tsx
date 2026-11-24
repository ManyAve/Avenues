import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import type { ReactNode } from "react";
import { Count } from "#avenue/components/status";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * An app's section list down the side of the window (AVE-219): for a tool with more sections than a TopBar's row
 * holds, or with saved views and a status line that belong beside the sections. Plain links in a navigation
 * landmark; ui-sdk ships nothing for this (its NavigationMenu is a bar of popups), and there is no behaviour to
 * borrow: the links are the tab stops.
 *
 *   Sidebar                  the landmark; name it with `aria-label` ("Main")
 *   ├── SidebarHeader        the product's mark and name
 *   ├── SidebarGroup         a list of links
 *   │   ├── SidebarGroupLabel    what the group is ("Pinned questions"); names the group
 *   │   └── SidebarItem      one link; `current` marks the page you are on, `count` adds a number
 *   └── SidebarFooter        pinned to the bottom: a status line, an account
 *
 * Put an icon first in a SidebarItem and it is sized to 16px. `current` sets aria-current="page", which also draws
 * the fill. Pass `render` for a router's link.
 *
 * 224px wide from `md` up, with a rule on its inner edge, as tall as the page. Narrower than `md` it lies along the
 * top as one scrolling row, so sections stay one tap away on a phone; hide a secondary group or the footer there
 * with `max-md:hidden`.
 *
 * Look: shadcn's sidebar tokens, which Avenue keeps: `sidebar` surface, `sidebar-border` rule, `sidebar-accent` for
 * hover and the current link.
 */
function Sidebar({ className, render, ...props }: OwnPartProps<"nav">) {
  return renderElement(
    "nav",
    mergeProps(
      {
        "data-slot": "sidebar",
        className: cn(
          "flex shrink-0 gap-4 border-sidebar-border bg-sidebar p-3 text-control text-sidebar-foreground",
          "max-md:items-center max-md:overflow-x-auto max-md:border-b max-md:p-2",
          "md:sticky md:top-0 md:h-dvh md:w-56 md:flex-col md:overflow-y-auto md:border-r",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** The product's mark and name, at the top. */
function SidebarHeader({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "sidebar-header",
        className: cn("flex shrink-0 items-center gap-2 px-2 py-1 text-base font-semibold whitespace-nowrap", className),
      },
      defined(props),
    ),
    render,
  );
}

/** A list of links. Give it a SidebarGroupLabel, or an `aria-label`, when the sidebar has more than one. */
function SidebarGroup({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      { "data-slot": "sidebar-group", role: "group" as const, className: cn("flex shrink-0 gap-0.5 md:flex-col", className) },
      defined(props),
    ),
    render,
  );
}

/** What the group is, muted, above its links. Hidden in the phone's row, where there is no room for it. */
function SidebarGroupLabel({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "sidebar-group-label",
        className: cn("px-2 pb-1 font-emphasis text-muted-foreground max-md:hidden", className),
      },
      defined(props),
    ),
    render,
  );
}

/** One link. Its label takes the room; an icon before it is 16px, and `count` sits at the end. */
function SidebarItem({
  current,
  count,
  className,
  children,
  render,
  ...props
}: OwnPartProps<"a"> & {
  /** This link is the page you are on. */
  current?: boolean | undefined;
  /** A number at the link's end, such as how many conversations wait. */
  count?: ReactNode | undefined;
}) {
  return renderElement(
    "a",
    mergeProps(
      {
        "data-slot": "sidebar-item",
        "aria-current": current ? ("page" as const) : undefined,
        className: cn(
          "relative hit-area flex min-h-control-md shrink-0 items-center gap-2 rounded-md px-2 whitespace-nowrap outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:whitespace-normal [&>svg]:size-4 [&>svg]:shrink-0",
          "aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-emphasis aria-[current=page]:text-sidebar-accent-foreground",
          className,
        ),
        children: (
          <>
            {children}
            {count !== undefined && <Count value={count} className="ms-auto" />}
          </>
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** Pinned to the sidebar's bottom (its end, in the phone's row). */
function SidebarFooter({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      { "data-slot": "sidebar-footer", className: cn("flex shrink-0 flex-col gap-0.5 max-md:ms-auto md:mt-auto", className) },
      defined(props),
    ),
    render,
  );
}

export { Sidebar, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarItem };
