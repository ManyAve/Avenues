import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { Check } from "lucide-react";
import { useEffect, useState, type ComponentProps, type FocusEvent, type ReactNode } from "react";
import { Count } from "#avenue/components/status";
import { Toggle } from "#avenue/components/toggle";
import { type NodeChildren, defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * ManyAve's filter chip (the app's app/ui/components/Chip.tsx at e01cc90), on Avenue's Toggle (ui-sdk toggle).
 * A filter chip is a token in a chip row, so it stays a pill (AVE-2 section 5). Changes from the app:
 * - AVE-2: md height (32px, was 30) so chips line up with the toolbar's other controls; the 5px gap becomes 4px.
 * - Selected adds a 16px check before the label (UI Designer, AVE-8, for WCAG 1.4.1: in dark the tint tells the
 *   states apart mostly by hue). The check replaces `icon` while selected and is aria-hidden, because
 *   aria-pressed carries the state. Nothing reserves its space: the chip grows when selected.
 */
function Chip({
  count,
  icon,
  children,
  className,
  ...props
}: NodeChildren<ComponentProps<typeof Toggle>> & {
  count?: number | undefined;
  /** A leading icon, shown while the chip is not selected. */
  icon?: ReactNode;
}) {
  return (
    <Toggle
      variant="outline"
      className={cn(
        "group/chip h-control-md shrink-0 snap-start gap-1 rounded-full border-border bg-background px-2 text-control font-normal text-muted-foreground",
        "data-pressed:chosen",
        className,
      )}
      {...props}
    >
      <Check aria-hidden data-slot="chip-check" className="hidden size-4 group-data-pressed/chip:block" />
      {icon ? (
        <span data-slot="chip-icon" aria-hidden className="contents group-data-pressed/chip:hidden">
          {icon}
        </span>
      ) : null}
      {children}
      {count !== undefined && <Count value={count} className="bg-transparent px-0 text-current opacity-80" />}
    </Toggle>
  );
}

/**
 * A row of chips. `wrap` (the default) wraps onto more lines. `scroll` keeps one line for a phone filter bar,
 * as the app's three scroll strips do (TopBar, the household detail's section nav and the phone toolbar at
 * e01cc90): it snaps, and at 700px and narrower fades its last 28px, with 32px of room after the last chip so it can
 * scroll clear of the fade. Chips never shrink or truncate; the row
 * scrolls instead. A chip that gets focus, by keyboard or by being picked, scrolls fully into view: the end
 * scroll padding clears the fade. Nothing off-screen is hidden from screen readers.
 */
function ChipRow({
  overflow = "wrap",
  className,
  onFocus,
  render,
  ...props
}: OwnPartProps<"div"> & { overflow?: "wrap" | "scroll" | undefined }) {
  // The end fade hides once the row is scrolled to its end, where nothing is left to hint at (AVE-86).
  // The row's element, held in state so the measuring below follows it when `render` swaps the element.
  const [el, setRow] = useState<HTMLDivElement | null>(null);
  const [atEnd, setAtEnd] = useState(false);
  useEffect(() => {
    if (overflow !== "scroll" || !el) return;
    const measure = () => setAtEnd(Math.ceil(el.scrollLeft + el.clientWidth) >= el.scrollWidth - 1);
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [overflow, el]);
  const reveal = (event: FocusEvent<HTMLDivElement>) => {
    onFocus?.(event);
    if (overflow === "scroll" && event.target !== event.currentTarget) {
      event.target.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "chip-row",
        ref: setRow,
        "data-overflow": overflow,
        "data-scroll-end": (overflow === "scroll" && atEnd) || undefined,
        onFocus: reveal,
        className: cn(
          "flex gap-controls",
          overflow === "wrap"
            ? "flex-wrap"
            : // A scroller clips its children's overflow, so on a phone it pads 8px above and below (and takes it
              // back with a negative margin) to keep each chip's 44px tap area inside it (AVE-22).
              "snap-x snap-proximity scroll-px-page overflow-x-auto pointer-coarse:-my-2 pointer-coarse:py-2 [scrollbar-width:none] max-phone:scroll-pe-8 max-phone:pe-8 max-phone:[mask-image:linear-gradient(90deg,#000_calc(100%-28px),transparent)] data-scroll-end:[mask-image:none]",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

export { Chip, ChipRow };
