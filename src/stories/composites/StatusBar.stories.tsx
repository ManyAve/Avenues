import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import { ModeToggle, type ThemeChoice } from "#avenue/components/mode-toggle";
import { StatusBar, StatusBarCount, StatusBarHint, StatusBarTotals } from "#avenue/components/status-bar";

// AVE-9 part 4: the status bar along the bottom of a list. Counts and amounts are fictional.

const meta = { title: "Composites/Status bar", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const desktop = { viewport: { value: "desktop", isRotated: false } };
const wide = { viewport: { value: "wide", isRotated: false } };
const phone = { viewport: { value: "phone", isRotated: false } };

// The mode toggle starts on the story's own theme, so a dark capture doesn't show "Light" chosen (AVE-91).
function Bar({ totals = true, theme = "light" }: { totals?: boolean; theme?: unknown }) {
  const [choice, setChoice] = useState<ThemeChoice>(theme === "dark" ? "dark" : "light");
  return (
    <div className="flex min-h-40 flex-col justify-end bg-background">
      <StatusBar>
        <ModeToggle dev={false} value={choice} onValueChange={setChoice} />
        <StatusBarCount>24 households</StatusBarCount>
        {totals && <StatusBarHint>Select a cell to view details</StatusBarHint>}
        {totals && (
          <StatusBarTotals
            items={[
              { label: "Outstanding", cents: 51_000 },
              { label: "Credit", cents: 2_000 },
            ]}
          />
        )}
      </StatusBar>
    </div>
  );
}

/** 1440px: mode toggle, count, hint and both totals. */
export const Wide: Story = {
  globals: wide,
  render: (_, { globals }) => <Bar theme={globals.theme} />,
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText("Select a cell to view details")).toBeVisible();
    await expect(canvas.getByText(/Outstanding/)).toHaveTextContent("Outstanding $510.00");
    await expect(canvas.getByRole("contentinfo")).toHaveStyle({ height: "44px" });
    // The dot ends the count with 16px on each side, so it sits midway between the count and the hint (AVE-91).
    const count = canvasElement.querySelector("[data-slot=status-bar-count]")!;
    const dot = count.querySelector("[aria-hidden]")!.getBoundingClientRect();
    const words = count.firstChild!;
    const range = document.createRange();
    range.selectNodeContents(words);
    const before = dot.left - range.getBoundingClientRect().right;
    const after = canvas.getByText("Select a cell to view details").getBoundingClientRect().left - dot.right;
    await expect(Math.abs(before - after)).toBeLessThanOrEqual(1);
  },
};

/** 900px: everything still fits. */
export const DesktopMinimum: Story = { globals: desktop, render: (_, { globals }) => <Bar theme={globals.theme} /> };

/** A screen with no money on it shows the count only. */
export const NoTotals: Story = {
  globals: wide,
  render: (_, { globals }) => <Bar totals={false} theme={globals.theme} />,
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/Outstanding/)).toBeNull();
  },
};

/** Below 900px the hint gives way, so the totals are never cut. */
export const Phone: Story = {
  globals: phone,
  render: (_, { globals }) => <Bar theme={globals.theme} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Select a cell to view details")).not.toBeVisible();
    const bar = canvas.getByRole("contentinfo").getBoundingClientRect();
    const credit = canvas.getByText(/Credit/).getBoundingClientRect();
    await expect(credit.right).toBeLessThanOrEqual(bar.right);
  },
};

/** The parts (AVE-149): the toggle, count, hint and totals written out, drawing as the one-tag bar does. */
export const Parts: Story = {
  globals: wide,
  render: (_, { globals }) => <PartsBar theme={globals["theme"]} />,
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText("24 households")).toBeVisible();
    await expect(canvas.getByText("Select a cell to view details")).toBeVisible();
    // The dot after the count shows because the bar has a hint.
    const dot = canvasElement.querySelector("[data-slot=status-bar-count] [aria-hidden]")!;
    await expect(getComputedStyle(dot).display).toBe("inline");
    await userEvent.tab();
    await expect(canvasElement.querySelector("[data-slot=status-bar] :focus")).not.toBeNull();
  },
};

function PartsBar({ theme }: { theme?: unknown }) {
  const [choice, setChoice] = useState<ThemeChoice>(theme === "dark" ? "dark" : "light");
  return (
    <div className="flex min-h-40 flex-col justify-end bg-background">
      <StatusBar>
        <ModeToggle dev={false} value={choice} onValueChange={setChoice} />
        <StatusBarCount>24 households</StatusBarCount>
        <StatusBarHint>Select a cell to view details</StatusBarHint>
        <StatusBarTotals
          items={[
            { label: "Outstanding", cents: 51_000 },
            { label: "Credit", cents: 2_000 },
          ]}
        />
      </StatusBar>
    </div>
  );
}
