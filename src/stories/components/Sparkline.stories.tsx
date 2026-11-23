import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { Sparkline, type SparklineTone } from "#avenue/components/sparkline";
import { Stat, StatLabel, StatValue } from "#avenue/components/stat";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#avenue/components/table";
import { Row, Rows } from "./story-kit";

const rising = [12, 14, 13, 17, 16, 21, 24];

const meta = {
  title: "Components/Sparkline",
  component: Sparkline,
  args: { values: rising, label: "Requests, rising over the last 7 days" },
} satisfies Meta<typeof Sparkline>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The line Recharts drew, once it has measured the picture. */
async function curve(image: HTMLElement) {
  await waitFor(() => expect(image.querySelector("path.recharts-line-curve")).not.toBeNull());
  return image.querySelector<SVGPathElement>("path.recharts-line-curve")!;
}

/** The points of a straight-segment path ("M2,18L14.6,15…"), in the picture's own pixels. */
function points(path: SVGPathElement) {
  return [...path.getAttribute("d")!.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
}

/** The bars Recharts drew, once it has measured the picture, as heights in pixels. */
async function barHeights(image: HTMLElement, count: number) {
  await waitFor(() => expect(image.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(count));
  return [...image.querySelectorAll(".recharts-bar-rectangle")].map((bar) => Math.round(bar.getBoundingClientRect().height * 10) / 10);
}

/** A trend beside the figure it belongs to: the number is text, and the picture only shows its direction. */
export const Default: Story = {
  render: (args) => (
    <Rows>
      <div className="flex items-end gap-group">
        <Stat>
          <StatValue>48</StatValue>
          <StatLabel>requests this week</StatLabel>
        </Stat>
        <Sparkline {...args} className="mb-1" />
      </div>
    </Rows>
  ),
  play: async ({ canvas, canvasElement }) => {
    // One image, named by what the picture says; the drawing inside is hidden from screen readers.
    const image = canvas.getByRole("img", { name: "Requests, rising over the last 7 days" });
    const line = await curve(image);
    await expect(image.querySelector("svg")!.closest("[aria-hidden]")).not.toBeNull();
    await expect(canvasElement.querySelectorAll("[role=img]")).toHaveLength(1);
    // The height of a Badge, four times as wide, and nothing in it to focus.
    const box = image.getBoundingClientRect();
    await expect(box.height).toBe(20);
    await expect(box.width).toBe(80);
    await expect(image.tabIndex).toBe(-1);
    await expect(image.querySelector("[tabindex]:not([tabindex='-1'])")).toBeNull();
    // Oldest first, lowest at the bottom: the last point is the highest, so it is drawn nearest the top.
    const heights = points(line).map((point) => point.y);
    await expect(heights).toHaveLength(rising.length);
    await expect(Math.min(...heights)).toBe(heights.at(-1));
    await expect(Math.max(...heights)).toBe(heights[0]);
    // The line takes the text colour of its tone.
    await expect(getComputedStyle(line).stroke).toBe(getComputedStyle(image).color);
  },
};

/**
 * Bars for separate counts, such as sign-ups per day; a line for a level over time. A flat line draws mid-height,
 * bars measure from zero, and one point is a dot.
 */
export const Variants: Story = {
  render: () => (
    <Rows>
      <Row label="line">
        <Sparkline values={rising} label="Requests, rising over the last 7 days" />
      </Row>
      <Row label="bar">
        <Sparkline variant="bar" values={[3, 5, 2, 0, 6, 4, 7]} label="Sign-ups per day, last 7 days, most on Sunday" />
      </Row>
      <Row label="steady">
        <Sparkline values={[8, 8, 8, 8, 8]} label="Open requests, steady at 8 for 5 weeks" />
      </Row>
      <Row label="nothing">
        <Sparkline variant="bar" values={[0, 0, 0, 0, 0]} label="New trials per day, none in 5 days" />
      </Row>
      <Row label="one point">
        <Sparkline values={[8]} label="Open requests, 8 in the first week" />
      </Row>
      <Row label="wider">
        <Sparkline values={rising} label="Requests, rising over the last 7 days, drawn wider" className="h-6 w-40" />
      </Row>
    </Rows>
  ),
  play: async ({ canvas }) => {
    // A day with no sign-ups still draws a bar, so it doesn't read as a missing day.
    const heights = await barHeights(canvas.getByRole("img", { name: /Sign-ups per day/ }), 7);
    for (const height of heights) await expect(height).toBeGreaterThan(0);
    // Bars measure from zero: the day with none is a stub, the best day the tallest.
    await expect(heights[3]).toBe(2);
    await expect(Math.max(...heights)).toBe(heights[6]);
    await expect(heights[6]).toBe(16);
    // A run of nothing is a row of stubs, not bars at half height.
    await expect(await barHeights(canvas.getByRole("img", { name: /none in 5 days/ }), 5)).toEqual([2, 2, 2, 2, 2]);
    // One point draws a dot at mid-height.
    const one = canvas.getByRole("img", { name: /8 in the first week/ });
    await waitFor(() => expect(one.querySelector(".recharts-line-dot")).not.toBeNull());
    const dot = one.querySelector(".recharts-line-dot")!.getBoundingClientRect();
    const frame = one.getBoundingClientRect();
    await expect(Math.abs(dot.top + dot.height / 2 - (frame.top + frame.height / 2))).toBeLessThanOrEqual(1);
    // A flat run sits along the middle, not along the floor.
    const flat = points(await curve(canvas.getByRole("img", { name: /steady at 8/ })));
    await expect(new Set(flat.map((point) => point.y))).toEqual(new Set([10]));
  },
};

const tones: SparklineTone[] = ["neutral", "primary", "success", "destructive"];

/** Neutral unless the trend itself is the news. The label says what the colour repeats. */
export const Tones: Story = {
  render: () => (
    <Rows>
      {tones.map((tone) => (
        <Row key={tone} label={tone}>
          <Sparkline values={rising} tone={tone} label={`Example trend, ${tone}`} />
        </Row>
      ))}
    </Rows>
  ),
  play: async ({ canvas }) => {
    const colours = tones.map((tone) => getComputedStyle(canvas.getByRole("img", { name: `Example trend, ${tone}` })).color);
    await expect(new Set(colours).size).toBe(tones.length);
  },
};

const sources = [
  { name: "Paid search", trials: 19, weeks: [2, 3, 2, 4, 3, 5], says: "rising" },
  { name: "Organic search", trials: 9, weeks: [2, 1, 2, 1, 2, 1], says: "steady" },
  { name: "Referral", trials: 6, weeks: [3, 2, 1, 0, 0, 0], says: "falling to none" },
];

/** In a table cell, one per row, each named for its own row. */
export const InATable: Story = {
  render: () => (
    <Rows>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Where trials came from</TableHead>
            <TableHead className="text-right">Trials</TableHead>
            <TableHead>Last 6 weeks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((source) => (
            <TableRow key={source.name}>
              <TableCell>{source.name}</TableCell>
              <TableCell className="text-right tabular-nums">{source.trials}</TableCell>
              <TableCell>
                <Sparkline values={source.weeks} label={`${source.name} trials, ${source.says} over 6 weeks`} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Rows>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("img")).toHaveLength(sources.length);
    await expect(canvas.getByRole("img", { name: "Referral trials, falling to none over 6 weeks" })).toBeVisible();
  },
};
