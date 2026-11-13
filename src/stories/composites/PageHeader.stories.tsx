import type { Meta, StoryObj } from "@storybook/react-vite";
import { DownloadIcon, PlusIcon } from "lucide-react";
import { expect, userEvent } from "storybook/test";
import { Button } from "#avenue/components/button";
import { PageHeader } from "#avenue/components/page-header";

// AVE-9 (from AVE-23 and NEI-101): the top of a page. Fictional data only.

const meta = { title: "Composites/Page header" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const desktop = { viewport: { value: "desktop", isRotated: false } };
const wide = { viewport: { value: "wide", isRotated: false } };
const phone = { viewport: { value: "phone", isRotated: false } };

function Households() {
  return (
    <div className="mx-auto max-w-grid px-page py-section">
      <PageHeader
        eyebrow="Maple Glen HOA"
        title="Households"
        count={128}
        description="Owners, mailing addresses and dues for every lot."
        actions={
          <>
            <Button variant="outline">
              <DownloadIcon aria-hidden /> Export
            </Button>
            <Button>
              <PlusIcon aria-hidden /> Add household
            </Button>
          </>
        }
      />
      <div className="mt-section h-40 rounded-xl border border-dashed text-meta text-muted-foreground grid place-items-center">
        Page content
      </div>
    </div>
  );
}

/** At the desktop app's smallest window: actions at the end of the title line. Tab reaches them in reading order. */
export const DesktopMinimum: Story = {
  globals: desktop,
  render: () => <Households />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: /^Households ?, 128$/ })).toBeInTheDocument();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Export" })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Add household" })).toHaveFocus();
    const title = canvas.getByRole("heading", { level: 1 }).getBoundingClientRect();
    const add = canvas.getByRole("button", { name: "Add household" }).getBoundingClientRect();
    await expect(add.top).toBeLessThan(title.bottom);
  },
};

/** Wide: the page frame stops at max-w-grid (1280px) and centres. */
export const Wide: Story = {
  globals: wide,
  render: () => <Households />,
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector("[data-slot=page-header]")!.parentElement!;
    await expect(Math.round(frame.getBoundingClientRect().width)).toBe(1280);
  },
};

/** On a phone the actions wrap under the title instead of squeezing it; the inset is 16px. */
export const Phone: Story = {
  globals: phone,
  render: () => <Households />,
  play: async ({ canvas }) => {
    const title = canvas.getByRole("heading", { level: 1 }).getBoundingClientRect();
    const add = canvas.getByRole("button", { name: "Add household" }).getBoundingClientRect();
    await expect(add.top).toBeGreaterThanOrEqual(title.bottom);
    await expect(Math.round(title.left)).toBe(16);
    // The actions are gap-controls apart: 16px on a phone, 8px with a mouse (AVE-69).
    const exportButton = canvas.getByRole("button", { name: "Export" }).getBoundingClientRect();
    await expect(Math.round(add.left - exportButton.right)).toBe(matchMedia("(pointer: coarse)").matches ? 16 : 8);
  },
};

/** A reading page (max-w-reading, 768px) with a long title that wraps, and no actions. */
export const ReadingWidthLongTitle: Story = {
  globals: desktop,
  render: () => (
    <div className="mx-auto max-w-reading px-page py-section">
      <PageHeader
        eyebrow="Announcements"
        title="Pool opening weekend, new gate codes and the summer lifeguard schedule for residents"
        description="Sent to all members on May 22, 2026."
      />
    </div>
  ),
};
