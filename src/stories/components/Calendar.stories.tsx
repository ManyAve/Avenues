import type { Meta, StoryObj } from "@storybook/react-vite";
import { createAgent } from "@ui-sdk/react/agent";
import { useState } from "react";
import { expect, fn, userEvent } from "storybook/test";
import { Calendar } from "#avenue/components/calendar";

// AVE-121. The board's small month under the Activity title, which jumps to any day; dots mark days with activity.
// Dates are fixed so the story renders the same every day. All data is fictional.

const marked: Record<string, { className?: string; tint?: string }> = {
  "2026-11-03": { className: "bg-success" },
  "2026-11-09": { className: "bg-info" },
  "2026-11-18": { tint: "plum" },
  "2026-11-24": { className: "bg-warning" },
};

const meta = {
  title: "Components/Calendar",
  component: Calendar,
  parameters: { layout: "padded" },
  args: {
    today: "2026-11-12",
    defaultMonth: "2026-11",
    locale: "en-US",
    mark: (date: string) => marked[date],
    onValueChange: fn(),
  },
  render: (args) => (
    <div className="w-[248px] rounded-xl border bg-popover p-3 text-popover-foreground shadow-md pointer-coarse:w-auto">
      <Calendar {...args} />
    </div>
  ),
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Picked: Story = {
  name: "A day picked",
  args: { defaultValue: "2026-11-20" },
};

export const WithLimits: Story = {
  name: "Unavailable and out of range",
  args: { min: "2026-11-05", max: "2026-11-25", unavailable: [{ weekday: [0, 6] }] },
};

/** Keyboard: one Tab stop, arrows by day and week, Page Down by month, Enter picks. */
export const Keyboard: Story = {
  play: async ({ args, canvas, step }) => {
    const grid = canvas.getByRole("grid", { name: "November 2026" });
    const today = canvas.getByRole("gridcell", { name: "Thursday, November 12, 2026" });

    await step("Tab passes the heading's buttons, then lands on today, the grid's one stop", async () => {
      await userEvent.tab();
      await expect(canvas.getByRole("button", { name: "Previous month" })).toHaveFocus();
      await userEvent.tab();
      await expect(canvas.getByRole("button", { name: "Next month" })).toHaveFocus();
      await userEvent.tab();
      await expect(today).toHaveFocus();
      await expect(today).toHaveAttribute("aria-current", "date");
      await expect(grid.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    });

    await step("Right moves a day, Down a week", async () => {
      await userEvent.keyboard("{ArrowRight}");
      await expect(canvas.getByRole("gridcell", { name: "Friday, November 13, 2026" })).toHaveFocus();
      await userEvent.keyboard("{ArrowDown}");
      await expect(canvas.getByRole("gridcell", { name: "Friday, November 20, 2026" })).toHaveFocus();
    });

    await step("Page Down shows December and keeps the day", async () => {
      await userEvent.keyboard("{PageDown}");
      await expect(canvas.getByRole("grid", { name: "December 2026" })).toBeInTheDocument();
      await expect(canvas.getByRole("gridcell", { name: "Sunday, December 20, 2026" })).toHaveFocus();
    });

    await step("Enter picks the day", async () => {
      await userEvent.keyboard("{Enter}");
      await expect(args.onValueChange).toHaveBeenCalledWith("2026-12-20", expect.anything());
      await expect(canvas.getByRole("gridcell", { name: "Sunday, December 20, 2026" })).toHaveAttribute("aria-selected", "true");
    });

    await step("Tab leaves the grid after one stop", async () => {
      await userEvent.tab();
      await expect(grid.contains(document.activeElement)).toBe(false);
    });
  },
};

/** Previous and Next turn the month, and the heading names it. */
export const TurnTheMonth: Story = {
  name: "Previous and Next",
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Next month" }));
    await expect(canvas.getByRole("heading", { name: "December 2026" })).toBeInTheDocument();
    canvas.getByRole("button", { name: "Previous month" }).focus();
    await userEvent.keyboard("{Enter}{Enter}");
    await expect(canvas.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();
  },
};

/** A picker that jumps: the app closes its popover and scrolls to the day, as the board's title picker does. */
export const Controlled: Story = {
  name: "Jump to a day",
  render: function Render(args) {
    const [picked, setPicked] = useState<string | null>(null);
    return (
      <div className="grid gap-3">
        <div className="w-[248px] rounded-xl border bg-popover p-3 text-popover-foreground shadow-md pointer-coarse:w-auto">
          <Calendar {...args} value={picked} onValueChange={(value) => setPicked(typeof value === "string" ? value : null)} />
        </div>
        <p className="text-meta text-muted-foreground" aria-live="polite">
          {picked ? `Showing ${picked}` : "Pick a day to jump to it"}
        </p>
      </div>
    );
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("gridcell", { name: "Tuesday, November 24, 2026" }));
    await expect(canvas.getByText("Showing 2026-11-24")).toBeInTheDocument();
  },
};

/** An agent finds the calendar and picks a day. */
export const Agent: Story = {
  tags: ["agent"],
  play: async ({ args, canvas }) => {
    const agent = createAgent();
    const calendars = agent.snapshot().filter((entry) => !entry.offPage && entry.component === "calendar");
    await expect(calendars).toHaveLength(1);
    const result = await agent.act({ steps: [{ ref: calendars[0]!.ref, action: "setValue", args: ["2026-11-18"] }] });
    await expect(result.ok, result.error?.message).toBe(true);
    await expect(args.onValueChange).toHaveBeenCalledWith("2026-11-18", expect.anything());
    await expect(canvas.getByRole("gridcell", { name: "Wednesday, November 18, 2026" })).toHaveAttribute("aria-selected", "true");
  },
};
