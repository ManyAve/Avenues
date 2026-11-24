import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Badge } from "#avenue/components/badge";
import { CardContent, CardHeader } from "#avenue/components/card";
import { SectionCard, SectionCardTitle } from "#avenue/components/section-card";
import {
  Timeline,
  TimelineConnector,
  TimelineDescription,
  TimelineItem,
  TimelineMarker,
  TimelineTime,
  TimelineTitle,
} from "#avenue/components/timeline";
import { Rows } from "./story-kit";

const meta = {
  title: "Components/Timeline",
  component: Timeline,
} satisfies Meta<typeof Timeline>;
export default meta;
type Story = StoryObj<typeof meta>;

// Fictional: Sunnydale Commons, as in Scenes.
const history = [
  { when: "2026-11-21", reads: "Nov 21", what: "The treasurer printed and mailed 62 statements", where: "Board" },
  { when: "2026-11-18", reads: "Nov 18", what: "A payout of $4,210.00 in dues reached the bank", where: "Payments" },
  { when: "2026-11-12", reads: "Nov 12", what: "Three card payments failed; two went through on a second try", where: "Payments", tone: "destructive" as const },
  { when: "2026-11-02", reads: "Nov 2", what: "The board voted to keep dues at $240 for 2027", where: "Board" },
];

/**
 * An association's recent history, newest first. The failed payments are the news, so their dot takes a tone. One tab
 * stop: Up, Down, Home and End move between entries.
 */
export const Default: Story = {
  tags: ["agent"],
  render: () => (
    <Rows>
      <SectionCard className="max-w-reading">
        <CardHeader>
          <SectionCardTitle>History</SectionCardTitle>
        </CardHeader>
        <CardContent>
          <Timeline aria-label="History, newest first">
            {history.map((entry) => (
              <TimelineItem key={entry.when}>
                <TimelineMarker tone={entry.tone} />
                <TimelineConnector />
                <TimelineTitle>{entry.what}</TimelineTitle>
                <TimelineTime dateTime={entry.when}>{entry.reads}</TimelineTime>
                <TimelineDescription>{entry.where}</TimelineDescription>
              </TimelineItem>
            ))}
          </Timeline>
        </CardContent>
      </SectionCard>
    </Rows>
  ),
  play: async ({ canvas }) => {
    // A list: a screen reader hears four entries, in order.
    const list = canvas.getByRole("list", { name: "History, newest first" });
    const items = within(list).getAllByRole("listitem");
    await expect(items).toHaveLength(4);
    await expect(items[0]).toHaveTextContent(/^The treasurer printed and mailed 62 statementsNov 21Board$/);
    await expect(within(items[0]!).getByText("Nov 21")).toHaveAttribute("datetime", "2026-11-21");
    // Dots and lines are decoration: hidden, with the words carrying the meaning.
    for (const item of items) {
      await expect(item.querySelector("[data-slot=timeline-marker]")).toHaveAttribute("aria-hidden", "true");
      await expect(item.querySelector("[data-slot=timeline-connector]")).toHaveAttribute("aria-hidden", "true");
    }
    await expect(items[2]!.querySelector("[data-slot=timeline-marker]")).toHaveAttribute("data-tone", "destructive");
    // Each dot sits beside its title's first line.
    const dot = items[0]!.querySelector("[data-slot=status-dot]")!.getBoundingClientRect();
    const title = within(items[0]!).getByText(/printed and mailed/).getBoundingClientRect();
    await expect(Math.abs(dot.top + dot.height / 2 - (title.top + 12))).toBeLessThanOrEqual(1);
    // The line joins each dot to the next and stops at the last.
    const line = (item: HTMLElement) => item.querySelector<HTMLElement>("[data-slot=timeline-connector]")!;
    await expect(line(items[0]!).getBoundingClientRect().height).toBeGreaterThan(20);
    await expect(line(items[0]!).getBoundingClientRect().width).toBe(1);
    await expect(getComputedStyle(line(items[3]!)).display).toBe("none");
    // One tab stop, then the arrow keys.
    await userEvent.tab();
    await expect(items[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(items[1]).toHaveFocus();
    await userEvent.keyboard("{End}");
    await expect(items[3]).toHaveFocus();
    await userEvent.keyboard("{Home}");
    await expect(items[0]).toHaveFocus();
  },
};

const steps = [
  { what: "Listed 38 trials started since October 24", where: "CRM", took: "2s" },
  { what: "Matched 36 of them to an association and read each one's setup steps", where: "App database", took: "6s" },
  { what: "Found one import error repeated across eight associations, in a long run of events that all name the same spreadsheet column", where: "Error tracking", took: "9s" },
];

/** Steps a job ran, oldest first, with a Badge for where each one looked. A long entry wraps under its own dot. */
export const Steps: Story = {
  render: () => (
    <Rows>
      <Timeline aria-label="Steps, in the order they ran" className="max-w-sm">
        {steps.map((step) => (
          <TimelineItem key={step.what}>
            <TimelineMarker tone="primary" />
            <TimelineConnector />
            <TimelineTitle>{step.what}</TimelineTitle>
            <TimelineDescription>
              <Badge variant="outline">{step.where}</Badge>
              <span>{step.took}</span>
            </TimelineDescription>
          </TimelineItem>
        ))}
      </Timeline>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const items = canvas.getAllByRole("listitem");
    await expect(items).toHaveLength(3);
    // The wrapped entry's text stays in its column, clear of the dot and the line.
    const marker = items[2]!.querySelector("[data-slot=timeline-marker]")!.getBoundingClientRect();
    const content = items[2]!.querySelector("[data-slot=timeline-title]")!.getBoundingClientRect();
    await expect(content.left).toBeGreaterThan(marker.right);
    await expect(content.height).toBeGreaterThan(48);
  },
};

/** One entry has no line: there is nothing to join it to. */
export const Single: Story = {
  render: () => (
    <Rows>
      <Timeline aria-label="History">
        <TimelineItem>
          <TimelineMarker />
          <TimelineConnector />
          <TimelineTitle>Sunnydale Commons started its trial</TimelineTitle>
          <TimelineTime dateTime="2026-02-03">Feb 3</TimelineTime>
        </TimelineItem>
      </Timeline>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const item = canvas.getByRole("listitem");
    await expect(getComputedStyle(item.querySelector("[data-slot=timeline-connector]")!).display).toBe("none");
  },
};
