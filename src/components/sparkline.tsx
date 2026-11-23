import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * The shape of a trend in the space of a word (AVE-219): beside a Stat's figure, or in a table cell, to show whether a
 * number is rising, falling or steady. It has no axis, no values and no hover, so it is never the only place a number
 * lives: put the figure that matters next to it as text, and use a real chart when people need to read values.
 *
 * One part. `values` run oldest first; the lowest sits at the bottom and the highest at the top, so two sparklines
 * aren't comparable by height. `variant="bar"` draws separate counts (sign-ups per day) where `line` draws a level
 * over time.
 *
 * An image named by `label`, which says what the picture says ("Trials started, rising over 8 weeks"): a screen
 * reader and an agent get the label, not the points. Not a control: no focus, no touch target.
 *
 * It draws in the text colour of its `tone`. `neutral` (the default) is `muted-foreground`: the trend is information.
 * Use a state tone only when the trend itself is the news, and say so in the label, because colour never carries it
 * alone. There is no warning tone: its fill is under 3:1 on a light surface, too faint for a thin line.
 *
 * 80 by 20px, the height of a Badge. Size it with a class (`w-24`, `h-6`); the picture stretches to fill.
 */
type SparklineTone = "neutral" | "primary" | "success" | "destructive";
type SparklineVariant = "line" | "bar";

const tones: Record<SparklineTone, string> = {
  neutral: "text-muted-foreground",
  // Dark: the subtle-foreground tone, as Button link and Badge link, because primary is 3.2:1 on the dark page.
  primary: "text-primary dark:text-primary-subtle-foreground",
  success: "text-success",
  destructive: "text-destructive",
};

// The drawing's own units: the picture stretches, and its strokes keep their width (non-scaling-stroke).
const WIDTH = 100;
const HEIGHT = 24;
const PAD = 2;

function Sparkline({
  values,
  label,
  variant = "line",
  tone = "neutral",
  className,
  render,
  ...props
}: Omit<OwnPartProps<"span">, "children" | "role" | "aria-label"> & {
  /** The points, oldest first. */
  values: readonly number[];
  /** What the picture says, for people who can't see it: "Requests, rising over the last 7 days". */
  label: string;
  variant?: SparklineVariant | undefined;
  tone?: SparklineTone | undefined;
}) {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  // A flat run draws along the middle, not along the floor.
  const y = (value: number) => (high === low ? HEIGHT / 2 : HEIGHT - PAD - ((value - low) / span) * (HEIGHT - PAD * 2));
  const step = values.length > 1 ? WIDTH / (values.length - 1) : 0;
  const slot = WIDTH / Math.max(values.length, 1);
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "sparkline",
        "data-variant": variant,
        "data-tone": tone,
        role: "img" as const,
        "aria-label": label,
        className: cn("inline-block h-5 w-20 shrink-0 align-middle", tones[tone], className),
        children: (
          <svg
            aria-hidden
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            className="block size-full overflow-visible"
            fill="none"
          >
            {variant === "line" ? (
              <polyline
                points={values.map((value, index) => `${index * step},${y(value)}`).join(" ")}
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ) : (
              values.map((value, index) => {
                // Every bar shows, the lowest too: a bar of no height reads as a missing day.
                const height = Math.max(HEIGHT - y(value), PAD);
                return (
                  <rect
                    // oxlint-disable-next-line react/no-array-index-key -- the points have no identity but their place
                    key={index}
                    x={index * slot + slot * 0.15}
                    y={HEIGHT - height}
                    width={slot * 0.7}
                    height={height}
                    fill="currentColor"
                  />
                );
              })
            )}
          </svg>
        ),
      },
      defined(props),
    ),
    render,
  );
}

export { Sparkline, type SparklineTone, type SparklineVariant };
