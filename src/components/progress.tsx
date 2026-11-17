import {
  Progress as ProgressPrimitive,
  ProgressIndicator as ProgressIndicatorPrimitive,
  ProgressLabel as ProgressLabelPrimitive,
  ProgressTrack as ProgressTrackPrimitive,
  ProgressValue as ProgressValuePrimitive,
} from "@ui-sdk/react/progress";
import type { ComponentProps } from "react";
import { defined, type Loose, type NodeChildren } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * How far a task has got (AVE-129): an upload, an import, a send. ui-sdk's Progress supplies the `progressbar` role,
 * its range and value, and the indeterminate state (leave out `value`, or pass `null`); Avenue draws it.
 *
 * Look: Management's activity-card bar (`app/ui/components/activity.tsx`, 8cdf8843): a 6px pill, `bg-primary` fill.
 * The track is `bg-accent`, not Management's `bg-muted`: on the default dark surfaces muted is the card's own colour
 * (onyx-850), so the empty part of a bar inside a dark card vanished and 40% read as a short line, not 40 of 100.
 * Accent is a step off the page and the card in light, dark and lifted surfaces (as Skeleton, AVE-128). The stories
 * fail if the track matches the surface under it.
 *
 * `size="xs"` is a 4px bar with square ends, laid along an edge (the bottom of a photo while it uploads).
 *
 * Name it: a visible `ProgressLabel`, one with `className="sr-only"`, or `aria-label` on `Progress`. `ProgressValue`
 * shows the percent; screen readers hear the value once, from the bar (its children are presentational). Avenue adds no
 * live region: a bar inside FileField must not double FileField's own upload announcements (AVE-35).
 *
 * Not a control: no focus, no touch target. The fill eases between values and an indeterminate bar sweeps; both
 * stop under reduced motion, where an indeterminate bar is a still, faint full-width fill (a full-strength one would
 * read as done).
 */

const sizes = {
  default: "h-1.5 rounded-full",
  xs: "h-1 rounded-none",
} as const;

type ProgressSize = keyof typeof sizes;

type ProgressProps = NodeChildren<Loose<ComponentProps<typeof ProgressPrimitive>>> & {
  size?: ProgressSize | undefined;
  /** Class for the track, e.g. to lay an xs bar along an edge. */
  trackClassName?: string | undefined;
};

/**
 * The bar. Children go above it (a `ProgressLabel` and a `ProgressValue`, which sit on one line, the value at the
 * end); the track and its fill come after them.
 */
function Progress({ className, children, size = "default", trackClassName, ...props }: ProgressProps) {
  return (
    <ProgressPrimitive
      data-size={size}
      className={cn("flex w-full flex-wrap items-baseline gap-x-2 gap-y-2", className)}
      {...defined(props)}
    >
      {children}
      <ProgressTrack size={size} className={trackClassName}>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive>
  );
}

/** The track on its own, for a layout `Progress` doesn't draw. Holds a `ProgressIndicator`. */
function ProgressTrack({
  className,
  size = "default",
  ...props
}: Loose<ComponentProps<typeof ProgressTrackPrimitive>> & { size?: ProgressSize | undefined }) {
  return (
    <ProgressTrackPrimitive
      data-size={size}
      className={cn("relative w-full basis-full overflow-hidden bg-accent", sizes[size], className)}
      {...defined(props)}
    />
  );
}

/** The fill. ui-sdk sets its width from the value; while indeterminate it has none, so Avenue sweeps a highlight. */
function ProgressIndicator({ className, ...props }: Loose<ComponentProps<typeof ProgressIndicatorPrimitive>>) {
  return (
    <ProgressIndicatorPrimitive
      className={cn(
        "h-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none",
        "data-indeterminate:w-2/5 data-indeterminate:animate-progress-sweep",
        "motion-reduce:data-indeterminate:w-full motion-reduce:data-indeterminate:animate-none motion-reduce:data-indeterminate:opacity-40",
        className,
      )}
      {...defined(props)}
    />
  );
}

/** The bar's visible name. Use `className="sr-only"` to keep the name and hide the words. */
function ProgressLabel({ className, ...props }: Loose<ComponentProps<typeof ProgressLabelPrimitive>>) {
  return <ProgressLabelPrimitive className={cn("min-w-0 text-meta text-foreground", className)} {...defined(props)} />;
}

/** The value as text ("40%"), at the end of the label's line. Screen readers hear it from the bar instead. */
function ProgressValue({ className, ...props }: Loose<ComponentProps<typeof ProgressValuePrimitive>>) {
  return (
    <ProgressValuePrimitive
      className={cn("ms-auto text-meta text-muted-foreground tabular-nums", className)}
      {...defined(props)}
    />
  );
}

export { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue, type ProgressSize };
