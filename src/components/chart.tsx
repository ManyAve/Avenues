import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { createContext, use, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { Legend, Tooltip, type LegendPayload, type TooltipContentProps } from "recharts";
import { defined, type Loose, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * Charts (AVE-219): values over time or across categories, with an axis people can read. Avenue doesn't draw charts
 * itself: the drawing, scales, hover and keyboard are Recharts', composed as Recharts documents (`LineChart`,
 * `BarChart`, `AreaChart` and their `Line`, `Bar`, `XAxis`, `CartesianGrid` imported from `recharts`). These parts are
 * shadcn's Chart, which gives a Recharts chart Avenue's look: the series colours, axis and grid in Avenue's tokens,
 * and a tooltip and legend drawn as Avenue's.
 *
 *   ChartContainer            the frame; `config` names each series and gives it a colour, `label` names the chart
 *   └── (a Recharts chart)    pass `responsive`, so it fills the frame, and `accessibilityLayer`
 *       ├── ChartTooltip      Recharts' Tooltip
 *       │   └── content={<ChartTooltipContent />}
 *       └── ChartLegend       Recharts' Legend
 *           └── content={<ChartLegendContent />}
 *
 * `config` maps each series' data key to its label and colour. Colours default to `chart-1` to `chart-5` in config
 * order, and each is exposed to the chart as `var(--color-<key>)`: `<Line dataKey="trials" stroke="var(--color-trials)" />`.
 * Five series at most; past that a chart stops being readable, and a table does better.
 *
 * `label` is required and names the chart for screen readers. With `accessibilityLayer` on the Recharts chart, it is
 * one tab stop and the arrow keys move the tooltip point to point. A chart is still a picture: where the values
 * matter, put them in a Table beside it or under it.
 *
 * 16:9 and as wide as its container by default; size it with a class (`aspect-auto h-64`). For a trend with no axis
 * in the space of a word, use Sparkline; for a handful of amounts compared by length, BarList.
 */
type ChartConfig = Record<string, { label: ReactNode; color?: string | undefined }>;

const ChartContext = createContext<ChartConfig | null>(null);

function useChart(part: string): ChartConfig {
  const config = use(ChartContext);
  if (!config) throw new Error(`${part} must be inside a ChartContainer.`);
  return config;
}

const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function ChartContainer({
  config,
  label,
  className,
  style,
  render,
  ...props
}: Omit<OwnPartProps<"div">, "role" | "aria-label"> & {
  /** Each series, by its data key: the label people read and, to override the palette, its colour. */
  config: ChartConfig;
  /** The chart's name: what it shows, for people who can't see it. */
  label: string;
}) {
  const colors = Object.fromEntries(
    Object.entries(config).map(([key, series], index) => [`--color-${key}`, series.color ?? PALETTE[index % PALETTE.length]]),
  ) as CSSProperties;
  return (
    <ChartContext.Provider value={config}>
      {renderElement(
        "div",
        mergeProps(
          {
            "data-slot": "chart",
            role: "group" as const,
            "aria-label": label,
            style: { ...colors, ...style },
            className: cn(
              "aspect-video w-full min-w-0 text-meta",
              // Recharts' `responsive` chart measures its own box: give it the frame's.
              "[&>.recharts-wrapper]:size-full",
              // Recharts' own marks, in Avenue's tokens.
              "[&_.recharts-cartesian-axis-tick-value]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border [&_.recharts-cartesian-axis-line]:stroke-border [&_.recharts-cartesian-axis-tick-line]:stroke-border",
              "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted",
              // The chart is the tab stop; its ring is Avenue's, on the frame.
              "rounded-md has-[.recharts-surface:focus-visible]:ring-3 has-[.recharts-surface:focus-visible]:ring-ring/50 [&_.recharts-surface]:outline-none [&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none",
              className,
            ),
          },
          defined(props),
        ),
        render,
      )}
    </ChartContext.Provider>
  );
}

/** Recharts' Tooltip. Give it `content={<ChartTooltipContent />}` to draw it as Avenue's. */
function ChartTooltip(props: Loose<ComponentProps<typeof Tooltip>>) {
  return <Tooltip {...defined(props)} />;
}

/** A colour key: the square beside a series' name in the tooltip and the legend. */
function Swatch({ color }: { color: string | undefined }) {
  return <span aria-hidden data-slot="chart-swatch" className="size-2 shrink-0 rounded-xs" style={{ background: color }} />;
}

/**
 * What the tooltip shows: the point's label, then each series' colour, name and value. Recharts passes it the point;
 * `hideLabel` drops the first line where the series name already says it.
 */
function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel = false,
  valueFormatter,
  className,
}: {
  active?: TooltipContentProps["active"] | undefined;
  payload?: TooltipContentProps["payload"] | undefined;
  label?: TooltipContentProps["label"] | undefined;
  hideLabel?: boolean | undefined;
  /** How a value reads: `(value) => "$" + value`. Defaults to the locale's number format. */
  valueFormatter?: ((value: number | string) => ReactNode) | undefined;
  className?: string | undefined;
}) {
  const config = useChart("ChartTooltipContent");
  if (!active || !payload?.length) return null;
  return (
    <div
      data-slot="chart-tooltip"
      className={cn(
        "grid min-w-32 gap-1 rounded-lg bg-popover px-3 py-2 text-meta text-popover-foreground shadow-popover",
        className,
      )}
    >
      {!hideLabel && label !== undefined && <p className="font-emphasis">{label}</p>}
      {payload.map((item) => {
        const key = String(item.dataKey ?? item.name ?? "");
        const value = item.value as number | string | undefined;
        return (
          <p key={key} className="flex items-center gap-2 tabular-nums">
            <Swatch color={item.color} />
            <span className="text-muted-foreground">{config[key]?.label ?? item.name}</span>
            <span className="ms-auto ps-3 font-emphasis">
              {value === undefined ? "" : valueFormatter ? valueFormatter(value) : value.toLocaleString()}
            </span>
          </p>
        );
      })}
    </div>
  );
}

/** Recharts' Legend. Give it `content={<ChartLegendContent />}` to draw it as Avenue's. */
function ChartLegend(props: Loose<ComponentProps<typeof Legend>>) {
  return <Legend {...defined(props)} />;
}

/** What the legend shows: each series' colour and name, on one wrapping line under the chart. */
function ChartLegendContent({
  payload,
  className,
}: {
  payload?: readonly LegendPayload[] | undefined;
  className?: string | undefined;
}) {
  const config = useChart("ChartLegendContent");
  if (!payload?.length) return null;
  // In config order, as the palette is; Recharts sorts a legend by name.
  const order = Object.keys(config);
  const place = (key: string) => (order.includes(key) ? order.indexOf(key) : order.length);
  const entries = payload
    .map((item) => ({ key: String(item.dataKey ?? item.value ?? ""), item }))
    .sort((a, b) => place(a.key) - place(b.key));
  return (
    <ul data-slot="chart-legend" className={cn("flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3 text-meta", className)}>
      {entries.map(({ key, item }) => (
        <li key={key} className="flex items-center gap-2 text-muted-foreground">
          <Swatch color={item.color} />
          {config[key]?.label ?? item.value}
        </li>
      ))}
    </ul>
  );
}

export { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig };
