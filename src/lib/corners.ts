/**
 * Nested corners (AVE-2 section 4, AVE-211): the corner a part may take inside a rounded container.
 *
 * 1. Concentric when tight: when the gap to the container's edge is smaller than its corner, the inner corner is the
 *    outer corner minus the gap, rounded down to a step and never below `xs`.
 * 2. Never rounder than the container: when the gap is at least the corner, the part keeps its own corner, up to the
 *    container's.
 *
 * Each rounded container works this out once, for its own corner and inset, and sets the answer as `--nested-corner`
 * (a private variable, like Card's `--card-spacing`, not a token): Card `[--nested-corner:var(--radius-xl)]` (xl, 16px
 * inset), `xs` at size sm (xl, 12px inset: 14 - 12 = 2, so xs); Dialog, Alert dialog and Drawer through `modalSurface`
 * (xl, 16px); Popover `lg` (lg, 16px). A part that sits inside them takes `rounded-nested-<own corner>` (avenue.css),
 * which draws `min(<own corner>, var(--nested-corner))`: its own corner where there is room, the concentric one where
 * there isn't, and its own corner on the page, where nothing sets the variable. `scripts/nested-corners.test.ts` holds
 * each container's class to `nestedCorner` below, so a change to a corner or an inset can't leave its parts behind.
 *
 * No step is added: the result is always one of Avenue's five corners.
 */

/** Avenue's corner steps in CSS pixels (avenue.css's `--radius-*`, from the 10px `--radius`). */
export const CORNERS = { xs: 4, sm: 6, md: 8, lg: 10, xl: 14 } as const;
export type Corner = keyof typeof CORNERS;

/** The largest corner a part `gap` pixels inside a container with corner `outer` may take. */
export function nestedCorner(outer: Corner, gap: number): Corner {
  const radius = CORNERS[outer];
  if (gap >= radius) return outer;
  let fit: Corner = "xs";
  for (const [step, px] of Object.entries(CORNERS) as [Corner, number][]) if (px <= radius - gap) fit = step;
  return fit;
}
