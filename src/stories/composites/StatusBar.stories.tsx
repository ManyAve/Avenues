import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";
import { ModeToggle, type ThemeChoice } from "#avenue/components/mode-toggle";
import { StatusBar } from "#avenue/components/status-bar";

// AVE-9 part 4: the status bar along the bottom of a list. Counts and amounts are fictional.

const meta = { title: "Composites/Status bar", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const desktop = { viewport: { value: "desktop", isRotated: false } };
const wide = { viewport: { value: "wide", isRotated: false } };
const phone = { viewport: { value: "phone", isRotated: false } };

function Bar({ totals = true }: { totals?: boolean }) {
  const [choice, setChoice] = useState<ThemeChoice>("light");
  return (
    <div className="flex min-h-40 flex-col justify-end bg-background">
      <StatusBar
        count="24 households"
        hint={totals ? "Select a cell to view details" : undefined}
        totals={
          totals
            ? [
                { label: "Outstanding", cents: 51_000 },
                { label: "Credit", cents: 2_000 },
              ]
            : undefined
        }
      >
        <ModeToggle dev={false} choice={choice} onThemeChange={setChoice} />
      </StatusBar>
    </div>
  );
}

/** 1440px: mode toggle, count, hint and both totals. */
export const Wide: Story = {
  globals: wide,
  render: () => <Bar />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Select a cell to view details")).toBeVisible();
    await expect(canvas.getByText(/Outstanding/)).toHaveTextContent("Outstanding $510.00");
    await expect(canvas.getByRole("contentinfo")).toHaveStyle({ height: "44px" });
  },
};

/** 900px: everything still fits. */
export const DesktopMinimum: Story = { globals: desktop, render: () => <Bar /> };

/** A screen with no money on it shows the count only. */
export const NoTotals: Story = {
  globals: wide,
  render: () => <Bar totals={false} />,
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/Outstanding/)).toBeNull();
  },
};

/** Below 900px the hint gives way, so the totals are never cut. */
export const Phone: Story = {
  globals: phone,
  render: () => <Bar />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Select a cell to view details")).not.toBeVisible();
    const bar = canvas.getByRole("contentinfo").getBoundingClientRect();
    const credit = canvas.getByText(/Credit/).getBoundingClientRect();
    await expect(credit.right).toBeLessThanOrEqual(bar.right);
  },
};
