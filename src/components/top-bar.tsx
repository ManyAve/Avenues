import { CircleHelp } from "lucide-react";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Button } from "#avenue/components/button";
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
 */
function TopBar({
  logo,
  name = "manyave",
  homeHref = "/",
  org,
  actions,
  navLabel = "Neighborhood sections",
  children,
  className,
  ...props
}: ComponentProps<"header"> & {
  /** The brand mark, decorative: the home link is named by `name`. */
  logo?: ReactNode;
  name?: string | undefined;
  homeHref?: string | undefined;
  /** The association's name. */
  org?: ReactNode;
  actions?: ReactNode;
  navLabel?: string | undefined;
}) {
  const nav = useRef<HTMLElement>(null);
  const shown = useRef<Element | null>(null);
  const fade = useEdgeFade(nav);
  useEffect(() => {
    // Bring the current section into the strip when it first shows or changes. Only the strip scrolls:
    // scrollIntoView would also scroll the page back up to the bar on every render. A section the person
    // scrolled away from stays where they left it until the current one changes.
    const strip = nav.current;
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
  return (
    <header
      data-slot="top-bar"
      className={cn(
        "flex min-h-14 flex-wrap items-center gap-4 border-b bg-background px-page py-3 text-meta max-phone:gap-x-3",
        className,
      )}
      {...props}
    >
      <a
        href={homeHref}
        aria-label={`${name} home`}
        className="relative hit-area flex shrink-0 items-center gap-2 rounded-md border-e pe-4 text-post font-[650] tracking-[-0.4px] text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 max-phone:border-0 max-phone:pe-0"
      >
        {logo ? (
          <span aria-hidden className="contents">
            {logo}
          </span>
        ) : null}
        <span aria-hidden className="max-phone:hidden">
          {name}
        </span>
      </a>
      {org ? (
        <span data-slot="top-bar-org" className="min-w-0 max-w-fit flex-1 break-words px-1 text-muted-foreground uppercase">
          {org}
        </span>
      ) : null}
      <nav
        ref={nav}
        aria-label={navLabel}
        data-fade={fade}
        className="flex min-w-0 flex-1 snap-x snap-proximity gap-controls overflow-x-auto [scrollbar-width:none] max-wide:order-last max-wide:-mx-page max-wide:basis-full max-wide:scroll-px-page max-wide:px-page pointer-coarse:-my-2 pointer-coarse:py-2 max-phone:data-[fade=right]:[mask-image:linear-gradient(90deg,#000_calc(100%-28px),transparent)] max-phone:data-[fade=left]:[mask-image:linear-gradient(90deg,transparent,#000_28px)]"
      >
        {children}
      </nav>
      <div data-slot="top-bar-actions" className="ms-auto flex shrink-0 items-center gap-controls">
        {actions ?? (
          <Button variant="ghost" size="icon-sm" aria-label="Help">
            <CircleHelp aria-hidden />
          </Button>
        )}
      </div>
    </header>
  );
}

/**
 * Which side of a scrolling strip to fade: the one with more hidden past it, or none when nothing is hidden. Starts
 * on the right, as the strip opens at its start, so the first paint matches. Physical sides, as the mask is.
 */
function useEdgeFade(strip: { current: HTMLElement | null }) {
  const [side, setSide] = useState<"left" | "right" | undefined>("right");
  useEffect(() => {
    const el = strip.current;
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
  }, [strip]);
  return side;
}

export { TopBar };
