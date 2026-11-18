import { mergeProps, renderElement, type RenderProp } from "@ui-sdk/react/primitive";
import { CircleHelp } from "lucide-react";
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Button } from "#avenue/components/button";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * ManyAve's top bar (the app's app/ui/components/TopBar.tsx at e01cc90): the home link, the association's name, the
 * section links (NavTab) and trailing actions, which default to a Help button. Avenue never ships ManyAve's logo
 * file, so the app passes its mark as `logo`.
 *
 * From 1100px down the section links take their own full-width row; at 700px and narrower they are one scrolling
 * strip that keeps the current section in view, and the brand shows its mark only. The strip fades its last 28px on
 * the side with more sections out of view, as the chip row does (AVE-22), and not at all once both ends show
 * (AVE-91).
 *
 * Changes from the app (AVE-2): 56px tall (was 53), its sides take the page inset (was 20px, 14px on a phone), the
 * brand's off-grid 7px gap becomes 8px, the section links' 4px gap becomes gap-controls (they are tap targets),
 * and the actions keep 8px between them. When the links take their own row, it sits 16px under the first, as in the app,
 * so their tap areas on a phone don't reach the Help button's, and the strip runs to the bar's edges
 * with the page inset as scroll padding, so a link it snaps to the edge keeps its whole tap area inside it.
 *
 * The home link is the app's to handle (AVE-110). `homeRender` swaps the link for the app's own, such as its router's
 * link, as NavTab's `render` does. `onHome` runs on a plain click or Enter instead of following `homeHref`; a click
 * with cmd, ctrl, shift or alt, or one a handler already prevented, still follows the link, so it can open in a new
 * tab or window. `windowDrag` makes the bar the desktop window's drag area (Electron's `-webkit-app-region`) with
 * the home link, the section links and the actions left clickable, and stops text selecting as the window is
 * dragged. It does nothing in a browser.
 */
type TopBarContextValue = { windowDrag: boolean };
const TopBarContext = createContext<TopBarContextValue>({ windowDrag: false });

/** Keeps a part clickable when the bar is the desktop window's drag area. */
function useNoDrag() {
  return useContext(TopBarContext).windowDrag && "[-webkit-app-region:no-drag]";
}

type TopBarProps = OwnPartProps<"header"> & {
  /** The bar is the desktop window's drag area; its links and actions stay clickable. */
  windowDrag?: boolean | undefined;
  /** @deprecated Use TopBarHome's `logo` (v0.30.0, AVE-149). */
  logo?: ReactNode;
  /** @deprecated Use TopBarHome's `name` (v0.30.0, AVE-149). */
  name?: string | undefined;
  /** @deprecated Use TopBarHome's `href` (v0.30.0, AVE-149). */
  homeHref?: string | undefined;
  /** @deprecated Use TopBarHome's `render` (v0.30.0, AVE-149). */
  homeRender?: RenderProp | undefined;
  /** @deprecated Use TopBarHome's `onHome` (v0.30.0, AVE-149). */
  onHome?: (() => void) | undefined;
  /** @deprecated Use `<TopBarOrg>` (v0.30.0, AVE-149). */
  org?: ReactNode;
  /** @deprecated Use `<TopBarActions>` (v0.30.0, AVE-149). */
  actions?: ReactNode;
  /** @deprecated Use TopBarNav's `aria-label` (v0.30.0, AVE-149). */
  navLabel?: string | undefined;
};

const PARTS = new Set<unknown>();

/**
 * The bar. Written with parts (`TopBarHome`, `TopBarOrg`, `TopBarNav`, `TopBarActions`), or in one tag with today's
 * props, whose children are the section links. It tells the two apart by its children: any part among them means
 * parts.
 */
function TopBar({
  logo,
  name,
  homeHref,
  homeRender,
  onHome,
  windowDrag = false,
  org,
  actions,
  navLabel,
  children,
  className,
  render,
  ...props
}: TopBarProps) {
  const parts = Children.toArray(children).some((child) => isValidElement(child) && PARTS.has(child.type));
  return (
    <TopBarContext.Provider value={{ windowDrag }}>
      {renderElement(
        "header",
        mergeProps(
          {
            "data-slot": "top-bar",
            "data-window-drag": windowDrag ? "" : undefined,
            className: cn(
              "flex min-h-14 flex-wrap items-center gap-4 border-b bg-background px-page py-3 text-meta max-phone:gap-x-3",
              windowDrag && "select-none [-webkit-app-region:drag]",
              className,
            ),
            children: parts ? (
              children
            ) : (
              <>
                <TopBarHome logo={logo} name={name} href={homeHref} render={homeRender} onHome={onHome} />
                {org ? <TopBarOrg>{org}</TopBarOrg> : null}
                <TopBarNav aria-label={navLabel}>{children}</TopBarNav>
                <TopBarActions>
                  {actions ?? (
                    <Button variant="ghost" size="icon-sm" aria-label="Help">
                      <CircleHelp aria-hidden />
                    </Button>
                  )}
                </TopBarActions>
              </>
            ),
          },
          defined(props),
        ),
        render,
      )}
    </TopBarContext.Provider>
  );
}

/**
 * The home link (AVE-110): the brand mark and name, named "{name} home". `render` swaps the link for the app's own,
 * such as its router's link, as NavTab's does. `onHome` runs on a plain click or Enter instead of following `href`; a
 * click with cmd, ctrl, shift or alt, or one a handler already prevented, still follows the link, so it can open in a
 * new tab or window.
 */
function TopBarHome({
  logo,
  name = "manyave",
  href = "/",
  onHome,
  className,
  render,
  ...props
}: Omit<OwnPartProps<"a">, "children"> & {
  /** The brand mark, decorative: the link is named by `name`. */
  logo?: ReactNode;
  name?: string | undefined;
  /** Runs on a plain click or Enter instead of following `href`. Modified clicks still follow it. */
  onHome?: (() => void) | undefined;
}) {
  const noDrag = useNoDrag();
  return renderElement(
    "a",
    mergeProps(
      {
        "data-slot": "top-bar-home",
        href,
        "aria-label": `${name} home`,
        className: cn(
          "relative hit-area flex shrink-0 items-center gap-2 rounded-md border-e pe-4 text-post font-[650] tracking-[-0.4px] text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 max-phone:border-0 max-phone:pe-0",
          noDrag,
          className,
        ),
        children: (
          <>
            {logo ? (
              <span aria-hidden className="contents">
                {logo}
              </span>
            ) : null}
            <span aria-hidden className="max-phone:hidden">
              {name}
            </span>
          </>
        ),
      },
      defined(props),
      { onClick: onHome && openHome(onHome) },
    ),
    render,
  );
}

/** The association's name, after the home link. */
function TopBarOrg({ className, render, ...props }: OwnPartProps<"span">) {
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "top-bar-org",
        className: cn("min-w-0 max-w-fit flex-1 break-words px-1 text-muted-foreground uppercase", className),
      },
      defined(props),
    ),
    render,
  );
}

/**
 * The section links (NavTab), a `nav` named "Neighborhood sections" unless given an `aria-label`. From 1100px down it
 * takes its own row; at 700px and narrower it is one scrolling strip that keeps the current section in view.
 */
function TopBarNav({ className, render, "aria-label": label, ...props }: OwnPartProps<"nav">) {
  // The strip's element, held in state (not a ref object, which mergeProps doesn't take) so the measuring follows it
  // when `render` swaps the element.
  const [strip, setStrip] = useState<HTMLElement | null>(null);
  const shown = useRef<Element | null>(null);
  const fade = useEdgeFade(strip);
  const noDrag = useNoDrag();
  useEffect(() => {
    // Bring the current section into the strip when it first shows or changes. Only the strip scrolls:
    // scrollIntoView would also scroll the page back up to the bar on every render. A section the person
    // scrolled away from stays where they left it until the current one changes.
    const link = strip?.querySelector("[aria-current=page]") ?? null;
    if (!strip || !link || link === shown.current) return;
    shown.current = link;
    const box = strip.getBoundingClientRect();
    const at = link.getBoundingClientRect();
    const style = getComputedStyle(strip);
    const start = box.left + (Number.parseFloat(style.scrollPaddingLeft) || 0);
    const end = box.right - (Number.parseFloat(style.scrollPaddingRight) || 0);
    if (at.left < start) strip.scrollBy({ left: at.left - start });
    else if (at.right > end) strip.scrollBy({ left: Math.min(at.right - end, at.left - start) });
  });
  return renderElement(
    "nav",
    mergeProps(
      {
        ref: setStrip,
        "aria-label": label ?? "Neighborhood sections",
        "data-fade": fade,
        className: cn(
          "flex min-w-0 flex-1 snap-x snap-proximity gap-controls overflow-x-auto [scrollbar-width:none] max-wide:order-last max-wide:-mx-page max-wide:basis-full max-wide:scroll-px-page max-wide:px-page pointer-coarse:-my-2 pointer-coarse:py-2 max-phone:data-[fade=right]:[mask-image:linear-gradient(90deg,#000_calc(100%-28px),transparent)] max-phone:data-[fade=left]:[mask-image:linear-gradient(90deg,transparent,#000_28px)]",
          noDrag,
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** What sits at the bar's end: the Help button, the account menu. 8px apart, 16px on a phone. */
function TopBarActions({ className, render, ...props }: OwnPartProps<"div">) {
  const noDrag = useNoDrag();
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "top-bar-actions",
        className: cn("ms-auto flex shrink-0 items-center gap-controls", noDrag, className),
      },
      defined(props),
    ),
    render,
  );
}

for (const part of [TopBarHome, TopBarOrg, TopBarNav, TopBarActions]) PARTS.add(part);

/**
 * The home link's click: a plain one (the main button, no modifier key, not already handled; Enter counts) runs
 * `onHome` instead of following the link. Any other follows it, so the home view can open in a new tab or window.
 */
function openHome(onHome: () => void) {
  return (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onHome();
  };
}

/**
 * Which side of a scrolling strip to fade: the one with more hidden past it, or none when nothing is hidden. Starts
 * on the right, as the strip opens at its start, so the first paint matches. Physical sides, as the mask is.
 */
function useEdgeFade(el: HTMLElement | null) {
  const [side, setSide] = useState<"left" | "right" | undefined>("right");
  useEffect(() => {
    if (!el) return;
    const measure = () => {
      const hidden = el.scrollWidth - el.clientWidth;
      // In right-to-left, scrollLeft runs from 0 down to -hidden.
      const left = getComputedStyle(el).direction === "rtl" ? hidden + el.scrollLeft : el.scrollLeft;
      const right = hidden - left;
      setSide(left <= 1 && right <= 1 ? undefined : right >= left ? "right" : "left");
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [el]);
  return side;
}

export { TopBar, TopBarActions, TopBarHome, TopBarNav, TopBarOrg };
