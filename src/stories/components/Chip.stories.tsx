import type { Meta, StoryObj } from "@storybook/react-vite";
import { Users } from "lucide-react";
import { expect, userEvent, waitFor } from "storybook/test";
import { Chip, ChipRow } from "#avenue/components/chip";
import { Row, Rows } from "./story-kit";

const meta = {
  title: "Components/Chip",
  component: Chip,
  args: { children: "Needs attention", count: 10 },
} satisfies Meta<typeof Chip>;
export default meta;
type Story = StoryObj<typeof meta>;

const filters = [
  { label: "Needs attention", count: 10 },
  { label: "Balance owing", count: 9 },
  { label: "Open complaints", count: 4 },
  { label: "Needs contact", count: 3 },
  { label: "Paid this year", count: 41 },
  { label: "New owners", count: 2 },
];

/** Selected beside unselected: the selected chip adds the tint and a check, so it doesn't rely on colour alone. */
export const SelectedBesideUnselected: Story = {
  tags: ["agent"],
  render: () => (
    <Rows>
      <Row label="chips">
        <Chip count={10} defaultPressed>
          Needs attention
        </Chip>
        <Chip count={9}>Balance owing</Chip>
      </Row>
      <Row label="with an icon">
        <Chip icon={<Users />} count={3} defaultPressed>
          Needs contact
        </Chip>
        <Chip icon={<Users />} count={2}>
          New owners
        </Chip>
      </Row>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const selected = canvas.getByRole("button", { name: /needs attention/i });
    const plain = canvas.getByRole("button", { name: /balance owing/i });
    await expect(selected).toHaveAttribute("aria-pressed", "true");
    // The check shows only on the selected chip and is hidden from screen readers.
    const check = selected.querySelector("[data-slot=chip-check]")!;
    await expect(check).toBeVisible();
    await expect(check).toHaveAttribute("aria-hidden", "true");
    await expect(plain.querySelector("[data-slot=chip-check]")).not.toBeVisible();
    // The check replaces a chip's own icon while selected.
    const withIcon = canvas.getByRole("button", { name: /needs contact/i });
    await expect(withIcon.querySelector("[data-slot=chip-icon] svg")).not.toBeVisible();
    // AVE-2: chips are md, 32px, the same as the toolbar's other controls.
    await expect(plain.getBoundingClientRect().height).toBe(32);
  },
};

/** Space and Enter press a chip from the keyboard; the chip grows by the check, nothing reserves its space. */
export const PressByKeyboard: Story = {
  args: { children: "Balance owing", count: 9 },
  play: async ({ canvas }) => {
    const chip = canvas.getByRole("button", { name: /balance owing/i });
    const before = chip.getBoundingClientRect().width;
    await userEvent.tab();
    await expect(chip).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await expect(chip.getBoundingClientRect().width).toBeGreaterThan(before);
    await userEvent.keyboard("{Enter}");
    await expect(chip).toHaveAttribute("aria-pressed", "false");
  },
};

/** The default row wraps onto more lines. */
export const FilterRow: Story = {
  render: () => (
    <div className="max-w-sm">
      <ChipRow>
        {filters.map(({ label, count }) => (
          <Chip key={label} count={count}>
            {label}
          </Chip>
        ))}
      </ChipRow>
    </div>
  ),
};

/** A phone filter bar: one line that scrolls, snaps and fades its last 28px. Chips never shrink or truncate. */
export const ScrollingRowOnAPhone: Story = {
  globals: { viewport: { value: "phone" } },
  render: () => (
    <div className="w-full">
      <ChipRow overflow="scroll" aria-label="Filters">
        {filters.map(({ label, count }) => (
          <Chip key={label} count={count}>
            {label}
          </Chip>
        ))}
      </ChipRow>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const row = canvasElement.querySelector<HTMLElement>("[data-slot=chip-row]")!;
    await expect(row.scrollWidth).toBeGreaterThan(row.clientWidth);
    for (const chip of canvas.getAllByRole("button")) {
      await expect(getComputedStyle(chip).flexShrink).toBe("0");
      await expect(chip.scrollWidth).toBeLessThanOrEqual(chip.clientWidth);
    }
    // Tab to the last chip: it scrolls fully into view, clear of the 28px fade.
    await expect(getComputedStyle(row).maskImage).toContain("linear-gradient");
    const fade = 28;
    for (let i = 0; i < filters.length; i += 1) await userEvent.tab();
    const last = canvas.getByRole("button", { name: /new owners/i });
    await expect(last).toHaveFocus();
    await waitFor(() => {
      const box = row.getBoundingClientRect();
      const chip = last.getBoundingClientRect();
      expect(chip.left).toBeGreaterThanOrEqual(box.left);
      expect(chip.right).toBeLessThanOrEqual(box.right - fade);
    });
    // Nothing off-screen is hidden from screen readers.
    await expect(row.querySelectorAll("[aria-hidden=true] button")).toHaveLength(0);
  },
};
