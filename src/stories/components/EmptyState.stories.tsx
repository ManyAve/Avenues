import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileTextIcon, HomeIcon, InboxIcon, PlusIcon, UsersIcon } from "lucide-react";
import { expect, fn, userEvent } from "storybook/test";
import { Card } from "#avenue/components/card";
import { EmptyState, SectionEmpty } from "#avenue/components/empty-state";
import { Rows } from "./story-kit";

const meta = {
  title: "Components/Empty state",
  component: EmptyState,
  args: {
    icon: InboxIcon,
    title: "No complaints yet",
    description: "Complaints neighbors send to the board show up here.",
  },
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The page form: icon, title, one line, and an action. */
export const Default: Story = {
  tags: ["agent"],
  args: { action: { label: "Log a complaint", onClick: fn() } },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole("heading", { level: 3, name: "No complaints yet" })).toBeVisible();
    const action = canvas.getByRole("button", { name: "Log a complaint" });
    await userEvent.tab();
    await expect(action).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.action?.onClick).toHaveBeenCalledOnce();
  },
};

/** A quieter second way out, drawn as a link button. */
export const SecondaryAction: Story = {
  args: {
    icon: HomeIcon,
    title: "No association found",
    description: "We couldn't find an association for jordan@example.com.",
    action: { label: "Try again", onClick: fn() },
    secondaryAction: { label: "Use a different email", onClick: fn() },
  },
};

/** A page outside the app stays a real link, not a button: it has an href and opens in a new tab. */
export const ExternalLink: Story = {
  args: {
    icon: HomeIcon,
    title: "No associations yet",
    description: "You're not on the board of any association.",
    externalLink: { lead: "Starting a new association?", label: "Set it up on the web", href: "https://example.com/start" },
  },
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "Set it up on the web" });
    await expect(link.tagName).toBe("A");
    await expect(link).toHaveAttribute("href", "https://example.com/start");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(canvas.queryByRole("button", { name: "Set it up on the web" })).toBeNull();
  },
};

/** A disabled action keeps its place. */
export const DisabledAction: Story = {
  args: { action: { label: "Log a complaint", disabled: true } },
};

/** Compact: fits inside a card on a 390px phone (AVE-23). */
export const CompactInACard: Story = {
  args: {
    size: "compact",
    icon: UsersIcon,
    title: "No events this month",
    description: "Porch light: Saturday 6pm was the last one at Maple Court.",
    action: { label: "Plan an event", onClick: fn() },
  },
  render: (args) => (
    <div className="w-[358px]">
      <Card>
        <EmptyState {...args} />
      </Card>
    </div>
  ),
};

/** SectionEmpty: one row inside a card section, with the next step when there is one. */
export const Section: Story = {
  render: () => (
    <Rows>
      <div className="flex max-w-xl flex-col gap-section">
        <Card className="p-inset">
          <SectionEmpty
            icon={FileTextIcon}
            title="No notes"
            line="Notes the board adds about this household show here."
            action={{ label: "Add note", icon: PlusIcon, onClick: fn() }}
          />
        </Card>
        <Card className="p-inset">
          <SectionEmpty icon={UsersIcon} title="No other residents" line="Residents join when they accept an invite." />
        </Card>
      </div>
    </Rows>
  ),
};
