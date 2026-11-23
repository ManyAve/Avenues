import type { Meta, StoryObj } from "@storybook/react-vite";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { expect, userEvent, waitFor } from "storybook/test";
import { CardContent, CardHeader } from "#avenue/components/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "#avenue/components/chart";
import { SectionCard, SectionCardTitle } from "#avenue/components/section-card";
import { Rows } from "./story-kit";

const meta = {
  title: "Components/Chart",
  component: ChartContainer,
} satisfies Meta<typeof ChartContainer>;
export default meta;
type Story = StoryObj;

// Fictional figures for a made-up product.
const weeks = [
  { week: "Oct 5", trials: 3, activated: 1 },
  { week: "Oct 12", trials: 4, activated: 2 },
  { week: "Oct 19", trials: 4, activated: 1 },
  { week: "Oct 26", trials: 6, activated: 3 },
  { week: "Nov 2", trials: 5, activated: 3 },
  { week: "Nov 9", trials: 7, activated: 3 },
  { week: "Nov 16", trials: 9, activated: 4 },
];

const funnel = {
  trials: { label: "Trials started" },
  activated: { label: "Activated" },
} satisfies ChartConfig;

/** The chart's drawing: Recharts' svg inside the frame, once it has measured its container. */
async function drawn(frame: HTMLElement) {
  await waitFor(() => expect(frame.querySelector(".recharts-surface path.recharts-curve, .recharts-surface .recharts-bar-rectangle")).not.toBeNull());
  return frame.querySelector<SVGSVGElement>("svg.recharts-surface")!;
}

/**
 * Two series over time, with a legend. The frame names the chart; the series take the palette in config order.
 * Tab to the chart and press Right: the tooltip moves point to point.
 */
export const Lines: Story = {
  render: () => (
    <Rows>
      <SectionCard className="max-w-reading">
        <CardHeader>
          <SectionCardTitle>Trials, last 7 weeks</SectionCardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={funnel} label="Trials started and activated each week, both rising over 7 weeks">
            <LineChart responsive accessibilityLayer data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis width={28} tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line dataKey="trials" type="monotone" stroke="var(--color-trials)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="activated" type="monotone" stroke="var(--color-activated)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </SectionCard>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByRole("group", { name: /Trials started and activated each week/ });
    const svg = await drawn(frame);
    // Two lines, each in its own palette colour, which the frame hands the chart by series key.
    const lines = [...svg.querySelectorAll<SVGPathElement>("path.recharts-line-curve")];
    await expect(lines).toHaveLength(2);
    await expect(lines[0]).toHaveAttribute("stroke", "var(--color-trials)");
    await expect(getComputedStyle(lines[0]!).stroke).not.toBe(getComputedStyle(lines[1]!).stroke);
    await expect(frame.style.getPropertyValue("--color-trials")).toBe("var(--chart-1)");
    await expect(frame.style.getPropertyValue("--color-activated")).toBe("var(--chart-2)");
    // The legend reads the config's labels, not the data keys.
    const legend = frame.querySelector("[data-slot=chart-legend]")!;
    await expect(legend).toHaveTextContent("Trials startedActivated");
    // Fills its container at 16:9.
    const box = frame.getBoundingClientRect();
    await expect(Math.abs(box.width / box.height - 16 / 9)).toBeLessThan(0.02);
    // By keyboard: one tab stop, then the arrow keys move the tooltip point to point.
    await userEvent.tab();
    await expect(svg).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(frame.querySelector("[data-slot=chart-tooltip]")).not.toBeNull());
    const tooltip = () => frame.querySelector<HTMLElement>("[data-slot=chart-tooltip]")!;
    const first = tooltip().textContent;
    await expect(first).toMatch(/Trials started\d+Activated\d+$/);
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(tooltip().textContent).not.toBe(first));
  },
};

const months = [
  { month: "Jun", collected: 18400 },
  { month: "Jul", collected: 21250 },
  { month: "Aug", collected: 19800 },
  { month: "Sep", collected: 24100 },
  { month: "Oct", collected: 26750 },
  { month: "Nov", collected: 12300 },
];

const dues = { collected: { label: "Dues collected" } } satisfies ChartConfig;
const dollars = (value: number | string) => `$${Number(value).toLocaleString("en-US")}`;

/** Separate amounts per period as bars, from zero. One series needs no legend; `valueFormatter` gives the tooltip its unit. */
export const Bars: Story = {
  render: () => (
    <Rows>
      <ChartContainer config={dues} label="Dues collected each month, June to November; November is part way through" className="max-w-reading">
        <BarChart responsive accessibilityLayer data={months} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis width={44} tickLine={false} axisLine={false} tickFormatter={(value: number) => `$${value / 1000}k`} />
          <ChartTooltip content={<ChartTooltipContent valueFormatter={dollars} />} />
          <Bar dataKey="collected" fill="var(--color-collected)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByRole("group", { name: /Dues collected each month/ });
    const svg = await drawn(frame);
    const bars = [...svg.querySelectorAll<SVGGraphicsElement>(".recharts-bar-rectangle path, .recharts-bar-rectangle rect")];
    await expect(bars).toHaveLength(months.length);
    // Bars measure from zero: the best month is the tallest, the part month the shortest.
    const heights = bars.map((bar) => bar.getBoundingClientRect().height);
    await expect(Math.max(...heights)).toBe(heights[4]);
    await expect(Math.min(...heights)).toBe(heights[5]);
    // Axis text is Avenue's muted text, not Recharts' grey.
    const tick = svg.querySelector<SVGTextElement>(".recharts-cartesian-axis-tick-value")!;
    const grid = svg.querySelector<SVGLineElement>(".recharts-cartesian-grid line")!;
    const rule = document.createElement("span");
    rule.className = "border border-border";
    document.body.append(rule);
    await expect(getComputedStyle(grid).stroke).toBe(getComputedStyle(rule).borderTopColor);
    rule.remove();
    const muted = document.createElement("span");
    muted.className = "text-muted-foreground";
    document.body.append(muted);
    await expect(getComputedStyle(tick).fill).toBe(getComputedStyle(muted).color);
    muted.remove();
    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(frame.querySelector("[data-slot=chart-tooltip]")).toHaveTextContent(/Dues collected\$[\d,]+$/));
  },
};

const balance = { owed: { label: "Dues outstanding", color: "var(--chart-3)" } } satisfies ChartConfig;
const owed = [
  { month: "Jun", owed: 9200 },
  { month: "Jul", owed: 7400 },
  { month: "Aug", owed: 8100 },
  { month: "Sep", owed: 5600 },
  { month: "Oct", owed: 4300 },
  { month: "Nov", owed: 3900 },
];

/** A level over time as an area, shorter than 16:9, with the series colour set in the config. */
export const AreaSized: Story = {
  name: "Area, sized",
  render: () => (
    <Rows>
      <ChartContainer config={balance} label="Dues outstanding at each month's end, falling from June to November" className="aspect-auto h-48 max-w-reading">
        <AreaChart responsive accessibilityLayer data={owed} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent valueFormatter={dollars} hideLabel />} />
          <Area dataKey="owed" type="monotone" stroke="var(--color-owed)" fill="var(--color-owed)" fillOpacity={0.2} strokeWidth={2} isAnimationActive={false} />
        </AreaChart>
      </ChartContainer>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByRole("group", { name: /Dues outstanding/ });
    await drawn(frame);
    await expect(frame.getBoundingClientRect().height).toBe(192);
    await expect(frame.style.getPropertyValue("--color-owed")).toBe("var(--chart-3)");
  },
};
