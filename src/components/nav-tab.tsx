import { mergeProps, renderElement, type PartProps } from "@ui-sdk/react/primitive";
import { Count } from "#avenue/components/status";
import { cn } from "#avenue/lib/utils";

/**
 * One section link in ManyAve's top bar (the app's app/ui/components/TopBar.tsx at e01cc90). A real link:
 * `current` sets aria-current="page", which also draws the muted fill. Pass `render` for a router's link.
 * Changes from the app, all AVE-2: sm height (28px, was 29 with 5px padding); the md control corner (8px)
 * instead of a pill, because a link acts (section 5); gap 7px to 8px and side padding 11px to 12px. The count
 * hides at 700px and narrower, as in the app.
 */
function NavTab({
  current,
  count,
  className,
  children,
  render,
  ...props
}: PartProps<"a"> & { current?: boolean | undefined; count?: number | undefined }) {
  return renderElement(
    "a",
    mergeProps(
      {
        "data-slot": "nav-tab",
        "aria-current": current ? ("page" as const) : undefined,
        className: cn(
          "relative hit-area inline-flex h-control-sm shrink-0 snap-start items-center gap-2 rounded-md px-3 text-control whitespace-nowrap text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          "aria-[current=page]:bg-muted aria-[current=page]:font-[550] aria-[current=page]:text-foreground",
          className,
        ),
        children: (
          <>
            {children}
            {count !== undefined && (
              <Count value={count} className="bg-transparent px-0 opacity-85 max-[700px]:hidden" />
            )}
          </>
        ),
      },
      props,
    ),
    render,
  );
}

export { NavTab };
