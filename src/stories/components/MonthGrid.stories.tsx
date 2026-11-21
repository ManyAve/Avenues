import type { Meta, StoryObj } from "@storybook/react-vite";
import { createAgent } from "@ui-sdk/react/agent";
import { useState } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { MonthGrid, MonthGridDay } from "#avenue/components/month-grid";
import { Popover, PopoverContent, PopoverTrigger } from "#avenue/components/popover";

// AVE-121. The board's Activity month: weeks of days in one scroll, a day's items folded into chips, and its cards in
// a popover. Dates are fixed so the story renders the same every day. All names and amounts are fictional.

type Day = { chips: string[]; summary: string };
const days: Record<string, Day> = {
  "2026-11-02": { chips: ["12 paid"], summary: "12 items · $4,320.00 received" },
  "2026-11-09": { chips: ["Reminder sent", "3 letters mailed"], summary: "4 items" },
  "2026-11-12": { chips: ["5 paid", "Board meeting"], summary: "6 items · $1,800.00 received" },
  "2026-11-20": { chips: ["Dues notice"], summary: "1 item" },
};

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const longDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

function DayItems({ date, day }: { date: string; day: Day }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="relative hit-area grid min-w-0 gap-1 rounded-md text-start outline-none">
        <span className="sr-only">{longDay(date)}: </span>
        {day.chips.map((chip) => (
          <span key={chip} className="truncate rounded-md border-l-[3px] border-l-primary bg-muted px-2 py-0.5 text-meta">
            {chip}
          </span>
        ))}
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-80">
        <b className="text-compact font-emphasis">{longDay(date)}</b>
        <span className="text-meta text-muted-foreground">{day.summary}</span>
      </PopoverContent>
    </Popover>
  );
}

function Month({ weeks: initialWeeks = 5 }: { weeks?: number }) {
  const [start, setStart] = useState("2026-11-01");
  const [weeks, setWeeks] = useState(initialWeeks);
  return (
    <section className="h-140 max-w-225 overflow-y-auto px-4 pb-3" aria-label="Month scroll">
      <MonthGrid
        aria-label="Month"
        locale="en-US"
        start={start}
        weeks={weeks}
        today="2026-11-12"
        onExtend={(direction) => {
          if (direction === "earlier") setStart((s) => addDays(s, -14));
          setWeeks((w) => w + 2);
        }}
      >
        {/* Each day, as ui-sdk's CalendarWeeks draws its days (AVE-149): a MonthGridDay with what it holds inside. */}
        {({ date }) => {
          const day = days[date];
          return <MonthGridDay value={date}>{day ? <DayItems date={date} day={day} /> : null}</MonthGridDay>;
        }}
      </MonthGrid>
    </section>
  );
}

const meta = {
  title: "Components/Month grid",
  component: MonthGrid,
  parameters: { layout: "padded" },
  // The story's Month holds start and weeks in state, so it can add weeks; these args only satisfy the types.
  args: { start: "2026-11-01", weeks: 5, today: "2026-11-12" },
  render: () => <Month />,
} satisfies Meta<typeof MonthGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** One Tab stop; the arrows move by day and week and run on across weeks; a day with items opens them. */
export const Keyboard: Story = {
  play: async ({ canvas, step }) => {
    const grid = canvas.getByRole("grid", { name: "Month" });
    const day = (name: string) => canvas.getByRole("gridcell", { name });

    await step("Tab lands on the first day, the grid's only stop", async () => {
      await userEvent.tab();
      await expect(day("Sunday, November 1, 2026")).toHaveFocus();
      await expect(grid.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    });

    await step("Right moves a day; a day with items passes focus to its trigger", async () => {
      await userEvent.keyboard("{ArrowRight}");
      await expect(canvas.getByRole("button", { name: "Mon, Nov 2: 12 paid" })).toHaveFocus();
      await expect(grid.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    });

    await step("Down moves a week, End to Saturday, and Right runs on to Sunday", async () => {
      await userEvent.keyboard("{ArrowDown}");
      await expect(canvas.getByRole("button", { name: /^Mon, Nov 9/ })).toHaveFocus();
      await userEvent.keyboard("{End}");
      await expect(day("Saturday, November 14, 2026")).toHaveFocus();
      await userEvent.keyboard("{ArrowRight}");
      await expect(day("Sunday, November 15, 2026")).toHaveFocus();
      await userEvent.keyboard("{ArrowLeft}");
      await expect(day("Saturday, November 14, 2026")).toHaveFocus();
      await userEvent.keyboard("{Home}");
      await expect(day("Sunday, November 8, 2026")).toHaveFocus();
    });

    await step("today carries aria-current", async () => {
      await expect(canvas.getByRole("gridcell", { current: "date" })).toHaveAccessibleName(/^Thursday, November 12, 2026/);
    });

    await step("Enter on a day's trigger opens its items; Escape returns to the day", async () => {
      await userEvent.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}");
      const trigger = canvas.getByRole("button", { name: /^Thu, Nov 12/ });
      await expect(trigger).toHaveFocus();
      await userEvent.keyboard("{Enter}");
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await userEvent.keyboard("{Escape}");
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(trigger).toHaveFocus();
    });

    await step("Tab leaves the grid", async () => {
      await userEvent.tab();
      await expect(grid.contains(document.activeElement)).toBe(false);
    });
  },
};

/** Past the last week the grid asks for more, and focus lands on the day it was going to. Above, too. */
export const PastTheEdges: Story = {
  name: "Past the first and last week",
  play: async ({ canvas, step }) => {
    const day = (name: string) => canvas.getByRole("gridcell", { name });
    await step("Control+End goes to the last day shown", async () => {
      day("Sunday, November 1, 2026").focus();
      await userEvent.keyboard("{Control>}{End}{/Control}");
      await expect(day("Saturday, December 5, 2026")).toHaveFocus();
    });
    await step("Down past the last week adds weeks and lands a week on", async () => {
      await userEvent.keyboard("{ArrowDown}");
      await waitFor(() => expect(day("Saturday, December 12, 2026")).toHaveFocus());
    });
    await step("Up past the first week adds weeks above and keeps the day", async () => {
      await userEvent.keyboard("{Control>}{Home}{/Control}");
      await expect(day("Sunday, November 1, 2026")).toHaveFocus();
      await userEvent.keyboard("{ArrowUp}");
      await waitFor(() => expect(day("Sunday, October 25, 2026")).toHaveFocus());
      await expect(canvas.getByRole("grid", { name: "Month" }).querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    });
  },
};

/** A press on a day moves the stop there, so Tab back in returns to it. */
export const PressMovesTheStop: Story = {
  name: "A press moves the stop",
  play: async ({ canvas }) => {
    const day = canvas.getByRole("gridcell", { name: "Wednesday, November 25, 2026" });
    await userEvent.click(day);
    await expect(day).toHaveFocus();
    await userEvent.tab();
    await userEvent.tab({ shift: true });
    await expect(day).toHaveFocus();
  },
};

/** An agent sees each day's trigger by name and opens one. The grid itself offers nothing to do. */
export const Agent: Story = {
  tags: ["agent"],
  play: async ({ canvas }) => {
    const agent = createAgent();
    const name = "Fri, Nov 20: Dues notice";
    const found = agent.snapshot().filter((entry) => !entry.offPage && entry.label === name);
    await expect(found).toHaveLength(1);
    const result = await agent.act({ steps: [{ ref: name, action: "setOpen", args: [true] }] });
    await expect(result.ok, result.error?.message).toBe(true);
    await expect(canvas.getByRole("button", { name })).toHaveAttribute("aria-expanded", "true");
  },
};
