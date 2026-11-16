import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClockIcon, TriangleAlertIcon } from "lucide-react";
import { expect } from "storybook/test";
import { Callout } from "#avenue/components/callout";
import { Rows } from "./story-kit";

// AVE-120. The board's info and warning note, from the app's dues and payment dialogs. Fictional text only.

const meta = {
  title: "Components/Callout",
  component: Callout,
  args: { children: "Households already at this amount are skipped." },
} satisfies Meta<typeof Callout>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Info, the default: a note that helps. */
export const Info: Story = {
  render: (args) => (
    <Rows>
      <div className="max-w-md">
        <Callout {...args} />
      </div>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const callout = canvas.getByText("Households already at this amount are skipped.").closest("[data-slot=callout]")!;
    await expect(callout).toHaveAttribute("data-tone", "info");
    await expect(callout.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  },
};

/** Warning: what happens if they go on. Its own icon, so colour never carries the tone alone. */
export const Warning: Story = {
  render: () => (
    <Rows>
      <div className="max-w-md">
        <Callout tone="warning" icon={TriangleAlertIcon}>
          This household already has an email late notice for 2026 dues. Use its delivery history actions below.
        </Callout>
      </div>
    </Rows>
  ),
};

/** Both tones and a custom icon, with a long note that wraps beside its icon. */
export const Tones: Story = {
  render: () => (
    <Rows>
      <div className="flex max-w-md flex-col gap-3">
        <Callout>Enter the date these dues were due to see the notice and its balance.</Callout>
        <Callout icon={ClockIcon}>An online payment is processing and has not been applied yet.</Callout>
        <Callout tone="warning" icon={TriangleAlertIcon}>
          Replacing an earlier notice. Review the notice below and approve it again. The earlier notice stays in
          history, and this creates a new paid mailing.
        </Callout>
      </div>
    </Rows>
  ),
};
