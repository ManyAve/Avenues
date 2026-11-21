import type { Meta, StoryObj } from "@storybook/react-vite";
import { BanknoteIcon, BellIcon, FileTextIcon, FlagIcon, MailIcon, MegaphoneIcon, UsersIcon } from "lucide-react";
import { expect } from "storybook/test";
import { IconTile } from "#avenue/components/icon-tile";
import { Row, Rows } from "../components/story-kit";

// AVE-9 (from AVE-23): the tile that says what kind of thing a row is. Fictional data only.

const meta = { title: "Composites/Icon tile" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Both sizes and every tone. Status tones carry meaning; the tint is decorative (announcements). */
export const Tones: Story = {
  render: () => (
    <Rows>
      <Row label="row 36px">
        <IconTile icon={BellIcon} tone="primary" />
        <IconTile icon={BanknoteIcon} tone="success" />
        <IconTile icon={MailIcon} tone="info" />
        <IconTile icon={FlagIcon} tone="warning" />
        <IconTile icon={FileTextIcon} tone="slate" />
        <IconTile icon={MegaphoneIcon} tone="tint" tint="teal" />
        <IconTile icon={UsersIcon} />
      </Row>
      <Row label="section 40px">
        <IconTile icon={FileTextIcon} size="section" />
        <IconTile icon={MailIcon} size="section" tone="info" />
      </Row>
      <Row label="automatic">
        <IconTile icon={BellIcon} tone="primary" automatic />
        <IconTile icon={MailIcon} tone="info" automatic />
      </Row>
    </Rows>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText("Automatic")).toHaveLength(2);
  },
};

/** In a feed row at phone width: the tile keeps its size while the text wraps. */
export const PhoneRow: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  render: () => (
    <ul className="grid gap-row-y p-inset">
      {[
        { icon: BellIcon, tone: "primary" as const, title: "Dues reminder sent to 14 households", meta: "Automatic · 9:00 AM", automatic: true },
        { icon: BanknoteIcon, tone: "success" as const, title: "Payment recorded for 2 Quail Hollow Court", meta: "Dana Whitfield · 11:20 AM", automatic: false },
        { icon: MegaphoneIcon, tone: "tint" as const, title: "Pool opening weekend and new gate codes for residents", meta: "Announcement · 2:05 PM", automatic: false },
      ].map((item) => (
        <li key={item.title} className="flex items-start gap-row-y">
          <IconTile icon={item.icon} tone={item.tone} automatic={item.automatic} />
          <div className="min-w-0">
            <p className="font-emphasis">{item.title}</p>
            <p className="text-meta text-muted-foreground">{item.meta}</p>
          </div>
        </li>
      ))}
    </ul>
  ),
  play: async ({ canvasElement }) => {
    for (const tile of canvasElement.querySelectorAll("[data-slot=icon-tile]")) {
      await expect(Math.round(tile.getBoundingClientRect().width)).toBe(36);
    }
  },
};
