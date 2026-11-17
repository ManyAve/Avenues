import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { useEffect, useRef } from "react";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * Placeholder shapes shown while a card or page loads, and the region that says it is loading (AVE-128). Avenue's
 * own parts: ui-sdk 0.1 has no skeleton, and there is no behavior to take from it (nothing here is a control).
 *
 * Fill: `bg-accent`, as Neighbors draws them. The funnel chose `bg-muted` (AVE-128), but on the default dark surfaces
 * muted is the card's own colour (onyx-850), so a skeleton inside a dark card vanished. Accent is a step off both the
 * page and the card in light, dark and lifted surfaces; it is also the hover fill, but a skeleton is never hovered or
 * pressed, so the two can't be confused. The stories fail if a shape matches the surface under it. Corners follow what a shape stands for: text `rounded-sm`, a block `rounded-md`, an
 * avatar `rounded-full`.
 *
 * Accessibility: every shape is `aria-hidden`. Wrap them in `Loading`, which marks the region `aria-busy` and gives
 * one visually hidden polite status, "Loading <label>", so a screen reader hears it once, not once per bar.
 *
 * When to use one (NN/g, "Skeleton Screens 101"): a load of about 1 to 10 seconds where the layout is known. Show
 * it after about 300ms so a fast load doesn't flash, and keep the real layout's size so nothing jumps when the
 * content arrives. For a short or unknown shape, use a line of text instead.
 */

const shapes = {
  // A block keeps the height the caller gives it (h-*, size-*, aspect-*).
  block: "rounded-md",
  // One line of text, as tall as the line it stands for: the box is the line height (1lh) of the inherited or
  // given text size (text-meta, text-compact, text-title...), and the visible bar is the font size (1em) centred in
  // it, so a skeleton line lines up with the text it replaces in both the web and desktop type scales.
  text: "h-lh w-full rounded-sm bg-clip-content py-[calc((1lh-1em)/2)]",
  circle: "aspect-square rounded-full",
} as const;

type SkeletonShape = keyof typeof shapes;

const pulse = "animate-pulse bg-accent motion-reduce:animate-none";

/**
 * One placeholder shape. `shape="text"` is one line of the text it stands for (set its size with a text class, its
 * width with `w-*`); `"circle"` an avatar (set `size-*`); `"block"` (the default) anything else (set `h-*`).
 */
function Skeleton({
  className,
  shape = "block",
  render,
  ...props
}: OwnPartProps<"div"> & { shape?: SkeletonShape | undefined }) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "skeleton",
        "data-shape": shape,
        "aria-hidden": true,
        className: cn("shrink-0", pulse, shapes[shape], className),
      },
      defined(props),
    ),
    render,
  );
}

/**
 * A paragraph of placeholder lines: every line full width but the last, which stops at 60% the way a paragraph
 * ends. Lines stack with no gap, as text does; set the text size on it (`text-meta`, `text-title`).
 */
function SkeletonText({
  className,
  lines = 3,
  render,
  ...props
}: OwnPartProps<"div"> & { lines?: number | undefined }) {
  const count = Math.max(1, Math.floor(lines));
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "skeleton-text",
        "aria-hidden": true,
        className: cn("flex w-full flex-col", className),
        children: Array.from({ length: count }, (_, i) => (
          <Skeleton key={i} shape="text" className={i === count - 1 && count > 1 ? "w-3/5" : undefined} />
        )),
      },
      defined(props),
    ),
    render,
  );
}

/**
 * The region that is loading. It is `aria-busy` and holds the placeholder shapes; beside it sits one visually hidden
 * polite status, "Loading <label>" (`label` names what is loading: "households", "the dues card"). The status text
 * is filled in just after it mounts, because a live region that arrives already holding its text isn't read by
 * every screen reader. Replace the whole `Loading` with the content when it arrives; nothing announces "loaded",
 * the content itself is the news. The region is `inert`, so nothing inside takes focus or a click, even a real control
 * an app leaves in it while it loads, and Tab goes straight past it. The status sits outside it, so it is still read.
 */
function Loading({
  label,
  className,
  render,
  ...props
}: OwnPartProps<"div"> & { label: string }) {
  // The status is an `output` (role status, polite). Its text is written after mount, so the live region exists
  // empty first and then changes, which is what every screen reader announces.
  const status = useRef<HTMLOutputElement>(null);
  useEffect(() => {
    if (status.current) status.current.textContent = `Loading ${label}`;
  }, [label]);
  return (
    <>
      <output ref={status} data-slot="loading-status" className="sr-only" />
      {renderElement(
        "div",
        mergeProps({ "data-slot": "loading", "aria-busy": true, inert: true, className }, defined(props)),
        render,
      )}
    </>
  );
}

export { Loading, Skeleton, SkeletonText, type SkeletonShape };
