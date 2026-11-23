import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { BarList, BarListItem, BarListLabel, BarListValue } from "#avenue/components/bar-list";
import { CardContent, CardHeader } from "#avenue/components/card";
import { SectionCard, SectionCardTitle } from "#avenue/components/section-card";
import { Rows } from "./story-kit";

const meta = {
  title: "Components/Bar list",
  component: BarList,
  args: { max: 11 },
} satisfies Meta<typeof BarList>;
export default meta;
type Story = StoryObj<typeof meta>;

const stops = [
  { label: "Household import", count: 11 },
  { label: "No dues schedule set", count: 6 },
  { label: "Never came back", count: 4 },
];

/** Bar length as a share of the list's `max`: the track's own width over the bar's. */
function share(item: HTMLElement) {
  const track = item.querySelector<HTMLElement>("[data-slot=bar-list-track]")!;
  const bar = item.querySelector<HTMLElement>("[data-slot=bar-list-bar]")!;
  return bar.getBoundingClientRect().width / track.getBoundingClientRect().width;
}

/** Where stalled trials stopped, largest first. The text carries each number; the bars make the comparison quick. */
export const Default: Story = {
  render: (args) => (
    <Rows>
      <SectionCard className="max-w-reading">
        <CardHeader>
          <SectionCardTitle>Where 21 stalled trials stopped</SectionCardTitle>
        </CardHeader>
        <CardContent>
          <BarList {...args}>
            {stops.map((stop) => (
              <BarListItem key={stop.label} value={stop.count}>
                <BarListLabel>{stop.label}</BarListLabel>
                <BarListValue>{stop.count}</BarListValue>
              </BarListItem>
            ))}
          </BarList>
        </CardContent>
      </SectionCard>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const items = within(canvas.getByRole("list")).getAllByRole("listitem");
    await expect(items).toHaveLength(3);
    // Reading order: what the row counts, then its amount. The bar adds nothing to it.
    await expect(items[0]).toHaveTextContent(/^Household import11$/);
    for (const item of items) {
      await expect(item.querySelector("[data-slot=bar-list-track]")).toHaveAttribute("aria-hidden", "true");
    }
    // The largest row fills its track; the others are their share of it.
    await expect(share(items[0]!)).toBeCloseTo(1, 2);
    await expect(share(items[1]!)).toBeCloseTo(6 / 11, 2);
    await expect(share(items[2]!)).toBeCloseTo(4 / 11, 2);
    // The empty part of a bar shows: the track is a step off the card under it.
    const track = items[1]!.querySelector<HTMLElement>("[data-slot=bar-list-track]")!;
    const card = track.closest<HTMLElement>("[data-slot=card]")!;
    await expect(getComputedStyle(track).backgroundColor).not.toBe(getComputedStyle(card).backgroundColor);
  },
};

const stages = [
  { label: "Ad clicks", value: 1240, reads: "1,240" },
  { label: "Trials started", value: 38, reads: "38, 3.1% of clicks" },
  { label: "Activated", value: 17, reads: "17, 45% of trials" },
  { label: "Paid", value: 6, reads: "6, 35% of activated" },
];

/**
 * A funnel, in stage order. The first stage is a different unit from the rest, so `max` is the stage after it:
 * a value above `max` draws a full bar, and the later stages keep lengths people can compare.
 */
export const Funnel: Story = {
  args: { max: 38 },
  render: (args) => (
    <Rows>
      <BarList {...args} className="max-w-reading">
        {stages.map((stage) => (
          <BarListItem key={stage.label} value={stage.value}>
            <BarListLabel>{stage.label}</BarListLabel>
            <BarListValue>{stage.reads}</BarListValue>
          </BarListItem>
        ))}
      </BarList>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const items = canvas.getAllByRole("listitem");
    await expect(share(items[0]!)).toBeCloseTo(1, 2);
    await expect(share(items[1]!)).toBeCloseTo(1, 2);
    await expect(share(items[3]!)).toBeCloseTo(6 / 38, 2);
  },
};

const features = [
  { label: "Dues and ledger", value: 92, reads: "Daily" },
  { label: "Mailed statements", value: 64, reads: "Monthly" },
  { label: "A long feature name that has to wrap onto a second line on a narrow card", value: 22, reads: "41 visits" },
  { label: "Not used yet", value: 0, reads: "Never" },
];

/** Neutral bars for a second list on a page, a label that wraps, and a row of nothing, which keeps its empty track. */
export const Neutral: Story = {
  args: { max: 100, tone: "neutral" },
  render: (args) => (
    <Rows>
      <BarList {...args} className="max-w-xs">
        {features.map((feature) => (
          <BarListItem key={feature.label} value={feature.value}>
            <BarListLabel>{feature.label}</BarListLabel>
            <BarListValue>{feature.reads}</BarListValue>
          </BarListItem>
        ))}
      </BarList>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const items = canvas.getAllByRole("listitem");
    await expect(share(items[3]!)).toBe(0);
    // A wrapped label keeps the value on its own, unbroken.
    const value = within(items[2]!).getByText("41 visits");
    await expect(value.getBoundingClientRect().height).toBeLessThan(30);
    const primary = document.createElement("span");
    primary.className = "bg-primary";
    document.body.append(primary);
    const bar = items[0]!.querySelector<HTMLElement>("[data-slot=bar-list-bar]")!;
    await expect(getComputedStyle(bar).backgroundColor).not.toBe(getComputedStyle(primary).backgroundColor);
    primary.remove();
  },
};
