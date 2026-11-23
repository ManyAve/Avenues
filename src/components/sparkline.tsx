import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { Bar, BarChart, Line, LineChart, YAxis } from "recharts";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * The shape of a trend in the space of a word (AVE-219): beside a Stat's figure, or in a table cell, to show whether a
 * number is rising, falling or steady. Drawn by Recharts, as Chart is, with everything but the line taken away: no
 * axis, no values and no hover, so it is never the only place a number lives. Put the figure that matters next to it
 * as text, and use Chart when people need to read values.
 *
 * One part. `values` run oldest first. A line runs from its lowest value at the bottom to its highest at the top, so
 * two sparklines aren't comparable by height; a flat run draws along the middle, and one value is a dot.
 * `variant="bar"` draws separate counts (sign-ups per day): bars measure from zero, and nothing is a 2px stub, so a
 * day of nothing doesn't read as a missing day.
 *
 * An image named by `label`, which says what the picture says ("Trials started, rising over 8 weeks"): a screen
 * reader and an agent get the label, not the points. Not a control: no focus, no touch target.
 *
 * It draws in the text colour of its `tone`. `neutral` (the default) is `muted-foreground`: the trend is information.
 * Use a state tone only when the trend itself is the news, and say so in the label, because colour never carries it
 * alone. There is no warning tone: its fill is under 3:1 on a light surface, too faint for a thin line.
 *
 * 80 by 20px, the height of a Badge. Size it with a class (`w-24`, `h-6`); the picture fills it.
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

// Room for the line's own width at the picture's edges, so a peak isn't clipped.
const MARGIN = { top: 2, right: 2, bottom: 2, left: 2 };
const FILL = { width: "100%", height: "100%" } as const;

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
  const data = values.map((value, index) => ({ index, value }));
  const low = Math.min(...values);
  const high = Math.max(...values);
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
          // The picture is the span's: hidden, never focused, with Recharts' keyboard layer off.
          <span aria-hidden className="block size-full">
            {variant === "line" ? (
              <LineChart responsive data={data} margin={MARGIN} accessibilityLayer={false} style={FILL}>
                {/* A flat run gets a range around it, so it draws along the middle, not along the floor. */}
                <YAxis hide domain={high === low ? [low - 1, high + 1] : [low, high]} />
                <Line
                  dataKey="value"
                  type="linear"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  // One value has no line to draw: it is a dot.
                  dot={values.length === 1 ? { r: 1.5, fill: "currentColor", stroke: "currentColor" } : false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            ) : (
              <BarChart responsive data={data} margin={MARGIN} barCategoryGap="15%" accessibilityLayer={false} style={FILL}>
                <YAxis hide domain={[0, high > 0 ? high : 1]} />
                <Bar dataKey="value" fill="currentColor" minPointSize={2} isAnimationActive={false} />
              </BarChart>
            )}
          </span>
        ),
      },
      defined(props),
    ),
    render,
  );
}

export { Sparkline, type SparklineTone, type SparklineVariant };
