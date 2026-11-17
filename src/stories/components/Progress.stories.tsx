import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "#avenue/components/card";
import { Progress, ProgressLabel, ProgressValue } from "#avenue/components/progress";

// AVE-129. How far a task has got: ui-sdk's Progress, drawn as Management's activity-card bar.

const meta = {
  title: "Components/Progress",
  component: Progress,
} satisfies Meta<typeof Progress>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The colour of the nearest surface behind an element: the first ancestor that paints a background. */
function surfaceUnder(el: HTMLElement) {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const colour = getComputedStyle(node).backgroundColor;
    if (colour !== "rgba(0, 0, 0, 0)" && colour !== "transparent") return colour;
  }
  return getComputedStyle(document.body).backgroundColor;
}

const bars = () => [...document.querySelectorAll<HTMLElement>("[data-slot=progress]")];
const track = (bar: HTMLElement) => bar.querySelector<HTMLElement>("[data-slot=progress-track]")!;
const fill = (bar: HTMLElement) => bar.querySelector<HTMLElement>("[data-slot=progress-indicator]")!;

/** Every bar: a named progressbar, its track seen on whatever it sits on, and its fill as wide as its value. */
async function expectBars() {
  for (const bar of bars()) {
    await expect(bar).toHaveRole("progressbar");
    await expect(bar).toHaveAccessibleName();
    // Seen on the page or a card, light or dark: muted is the dark card's own colour, so the track is accent.
    await expect(getComputedStyle(track(bar)).backgroundColor).not.toBe(surfaceUnder(track(bar)));
    const now = bar.getAttribute("aria-valuenow");
    if (now !== null) {
      const ratio = fill(bar).getBoundingClientRect().width / track(bar).getBoundingClientRect().width;
      const min = Number(bar.getAttribute("aria-valuemin"));
      const max = Number(bar.getAttribute("aria-valuemax"));
      await expect(ratio).toBeCloseTo((Number(now) - min) / (max - min), 2);
    }
  }
}

/** A labelled bar with its value: the label at the start of the line, the percent at the end, the bar under both. */
export const WithValue: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-6 p-inset">
      <Progress value={40}>
        <ProgressLabel>Uploading the 2027 budget</ProgressLabel>
        <ProgressValue />
      </Progress>
      <Progress value={3} max={12} getValueLabel={(value, d) => `${value} of ${d.max} households, ${d.formatted}`}>
        <ProgressLabel>Importing households</ProgressLabel>
        <ProgressValue>3 of 12</ProgressValue>
      </Progress>
    </div>
  ),
  play: async ({ canvas }) => {
    await expectBars();
    const upload = canvas.getByRole("progressbar", { name: "Uploading the 2027 budget" });
    await expect(upload).toHaveAttribute("aria-valuenow", "40");
    await expect(upload).toHaveAttribute("aria-valuetext", "40%");
    // The visible value isn't read on its own: a progressbar's children are presentational, and the name is the label
    // alone, so a screen reader hears "Uploading the 2027 budget, 40%" once, from the bar's value.
    await expect(upload.querySelector("[data-slot=progress-value]")).toHaveTextContent("40%");
    await expect(upload).toHaveAccessibleName("Uploading the 2027 budget");
    const imp = canvas.getByRole("progressbar", { name: "Importing households" });
    await expect(imp).toHaveAttribute("aria-valuetext", "3 of 12 households, 25%");
    // Management's look: a 6px pill, primary fill.
    const t = track(upload);
    await expect(t.getBoundingClientRect().height).toBe(6);
    await expect(getComputedStyle(t).borderTopLeftRadius).not.toBe("0px");
    // The value sits at the end of the label's line, the bar below them.
    const label = upload.querySelector<HTMLElement>("[data-slot=progress-label]")!.getBoundingClientRect();
    const value = upload.querySelector<HTMLElement>("[data-slot=progress-value]")!.getBoundingClientRect();
    await expect(value.right).toBeCloseTo(t.getBoundingClientRect().right, 0);
    await expect(Math.abs(value.bottom - label.bottom)).toBeLessThan(2);
    await expect(t.getBoundingClientRect().top).toBeGreaterThan(label.bottom);
  },
};

/** No visible words: the label is `sr-only` (or `aria-label` on Progress), so the bar still has a name. */
export const HiddenLabel: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-6 p-inset">
      <Progress value={65}>
        <ProgressLabel className="sr-only">Payment reminders sent</ProgressLabel>
      </Progress>
      <Progress value={20} aria-label="Ballots returned" />
    </div>
  ),
  play: async ({ canvas }) => {
    await expectBars();
    await expect(canvas.getByRole("progressbar", { name: "Payment reminders sent" })).toHaveAttribute("aria-valuenow", "65");
    await expect(canvas.getByRole("progressbar", { name: "Ballots returned" })).toHaveAttribute("aria-valuenow", "20");
    // Nothing visible above the bar: the track is the whole height.
    for (const bar of bars()) await expect(bar.getBoundingClientRect().height).toBe(6);
  },
};

/** How far is unknown: no value. A highlight sweeps the track; screen readers hear no percent. */
export const Indeterminate: Story = {
  render: () => (
    <div className="max-w-sm p-inset">
      <Progress value={null}>
        <ProgressLabel>Connecting to the bank</ProgressLabel>
      </Progress>
    </div>
  ),
  play: async ({ canvas }) => {
    await expectBars();
    const bar = canvas.getByRole("progressbar", { name: "Connecting to the bank" });
    await expect(bar).not.toHaveAttribute("aria-valuenow");
    await expect(bar).toHaveAttribute("data-indeterminate");
    const f = fill(bar);
    await expect(f.style.width).toBe("");
    await expect(getComputedStyle(f).animationName).toBe("progress-sweep");
    // Under reduced motion it stops and is a still, faint full-width fill, not a full one that reads as done.
    await expect(f).toHaveClass(
      "motion-reduce:data-indeterminate:animate-none",
      "motion-reduce:data-indeterminate:w-full",
      "motion-reduce:data-indeterminate:opacity-40",
    );
  },
};

/** The ends: 0% shows the empty track, 100% the full fill and `data-complete`. */
export const EmptyAndDone: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-6 p-inset">
      <Progress value={0}>
        <ProgressLabel>Ballots returned</ProgressLabel>
        <ProgressValue />
      </Progress>
      <Progress value={100}>
        <ProgressLabel>Statements printed</ProgressLabel>
        <ProgressValue />
      </Progress>
    </div>
  ),
  play: async ({ canvas }) => {
    await expectBars();
    const empty = canvas.getByRole("progressbar", { name: "Ballots returned" });
    await expect(fill(empty).getBoundingClientRect().width).toBe(0);
    await expect(empty).toHaveAttribute("data-progressing");
    const done = canvas.getByRole("progressbar", { name: "Statements printed" });
    await expect(done).toHaveAttribute("data-complete");
    await expect(fill(done).getBoundingClientRect().width).toBe(track(done).getBoundingClientRect().width);
  },
};

function Uploader() {
  const [sent, setSent] = useState(1);
  return (
    <div className="flex max-w-sm flex-col items-start gap-4 p-inset">
      <Progress value={(sent / 5) * 100}>
        <ProgressLabel>Uploading photos</ProgressLabel>
        <ProgressValue />
      </Progress>
      <div className="flex gap-controls">
        <Button variant="outline" size="sm" disabled={sent >= 5} onClick={() => setSent((n) => Math.min(5, n + 1))}>
          Upload next photo
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSent(0)}>
          Start over
        </Button>
      </div>
    </div>
  );
}

/** The value changes as the task goes: each press uploads one photo of five, by keyboard. */
export const ChangingValue: Story = {
  tags: ["agent"],
  render: () => <Uploader />,
  play: async ({ canvas }) => {
    const bar = canvas.getByRole("progressbar", { name: "Uploading photos" });
    await expect(bar).toHaveAttribute("aria-valuenow", "20");
    const next = canvas.getByRole("button", { name: "Upload next photo" });
    next.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(bar).toHaveAttribute("aria-valuenow", "40"));
    await userEvent.keyboard(" ");
    await waitFor(() => expect(bar).toHaveAttribute("aria-valuetext", "60%"));
    await userEvent.keyboard("{Enter}{Enter}");
    await waitFor(() => expect(bar).toHaveAttribute("data-complete"));
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Start over" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(bar).toHaveAttribute("aria-valuenow", "0"));
    // The bar itself is never in the Tab order: it isn't a control.
    await expect(bar.tabIndex).toBe(-1);
    await expectBars();
  },
};

/** Inside a card, as on Management's activity card: the empty part of the track still shows on a dark card. */
export const InACard: Story = {
  render: () => (
    <div className="max-w-sm p-inset">
      <Card>
        <CardHeader>
          <CardTitle>Payment reminders</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-meta text-muted-foreground">Sent to 18 of 45 households.</p>
          <Progress value={40} aria-label="Payment reminders sent" />
        </CardContent>
      </Card>
    </div>
  ),
  play: async () => {
    await expectBars();
  },
};

/**
 * `size="xs"`: a 4px bar with square ends laid along the bottom of a photo while it uploads (Neighbors' post
 * composer). The photo here is a fictional gradient.
 */
export const AlongAPhoto: Story = {
  render: () => (
    <div className="p-inset">
      <div
        className="relative h-40 w-60 overflow-hidden rounded-md"
        style={{ background: "linear-gradient(135deg, var(--color-grape-300), var(--color-onyx-700))" }}
      >
        <Progress
          value={70}
          size="xs"
          aria-label="Uploading porch.jpg"
          className="absolute inset-x-0 bottom-0"
        />
      </div>
    </div>
  ),
  play: async ({ canvas }) => {
    const bar = canvas.getByRole("progressbar", { name: "Uploading porch.jpg" });
    const t = track(bar);
    await expect(t.getBoundingClientRect().height).toBe(4);
    await expect(getComputedStyle(t).borderTopLeftRadius).toBe("0px");
    const photo = bar.parentElement!.getBoundingClientRect();
    await expect(t.getBoundingClientRect().bottom).toBe(photo.bottom);
    await expect(t.getBoundingClientRect().width).toBe(photo.width);
    await expect(fill(bar).getBoundingClientRect().width / photo.width).toBeCloseTo(0.7, 2);
  },
};

/** On a 390px phone: the label wraps before it pushes the value off the line, and the bar is the full width. */
export const Phone: Story = {
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "phone" } },
  render: () => (
    <div className="flex flex-col gap-6 px-page py-inset">
      <Progress value={55}>
        <ProgressLabel>Mailing the annual meeting notice to every household</ProgressLabel>
        <ProgressValue />
      </Progress>
    </div>
  ),
  play: async () => {
    await expectBars();
    const [bar] = bars();
    const value = bar!.querySelector<HTMLElement>("[data-slot=progress-value]")!.getBoundingClientRect();
    await expect(value.right).toBeLessThanOrEqual(window.innerWidth);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  },
};

/**
 * Avenue's bar beside Management's hand-written one (`app/ui/components/activity.tsx`, 8cdf8843, its markup copied
 * here, no import): the same height, corners and fill. The one change is the track, accent not muted, because a
 * muted track is the dark card's own colour.
 */
export const BesideManagement: Story = {
  render: () => (
    <div className="max-w-sm p-inset">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-meta text-muted-foreground">Management today</p>
            <div
              data-testid="management"
              // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Management's markup, copied as it is to compare.
              role="progressbar"
              aria-label="Management's bar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={40}
              className="h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full bg-primary" style={{ width: "40%" }} />
            </div>
          </div>
          <Progress value={40}>
            <ProgressLabel className="text-muted-foreground">Avenue</ProgressLabel>
          </Progress>
        </CardContent>
      </Card>
    </div>
  ),
  play: async ({ canvas }) => {
    const theirs = canvas.getByTestId("management");
    const ours = track(canvas.getByRole("progressbar", { name: "Avenue" }));
    const a = theirs.getBoundingClientRect();
    const b = ours.getBoundingClientRect();
    await expect(b.height).toBe(a.height);
    await expect(b.width).toBe(a.width);
    await expect(getComputedStyle(ours).borderTopLeftRadius).toBe(getComputedStyle(theirs).borderTopLeftRadius);
    await expect(getComputedStyle(fill(ours.parentElement!)).backgroundColor).toBe(
      getComputedStyle(theirs.firstElementChild!).backgroundColor,
    );
    await expect(fill(ours.parentElement!).getBoundingClientRect().width).toBeCloseTo(
      (theirs.firstElementChild as HTMLElement).getBoundingClientRect().width,
      1,
    );
  },
};
