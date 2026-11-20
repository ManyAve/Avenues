import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClockIcon, TriangleAlertIcon } from "lucide-react";
import { expect } from "storybook/test";
import { Callout, CalloutContent, CalloutIcon } from "#avenue/components/callout";
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
        <Callout tone="warning">
          <CalloutIcon>
            <TriangleAlertIcon aria-hidden />
          </CalloutIcon>
          <CalloutContent>
            This household already has an email late notice for 2026 dues. Use its delivery history actions below.
          </CalloutContent>
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
        <Callout>
          <CalloutIcon>
            <ClockIcon aria-hidden />
          </CalloutIcon>
          <CalloutContent>An online payment is processing and has not been applied yet.</CalloutContent>
        </Callout>
        <Callout tone="warning">
          <CalloutIcon>
            <TriangleAlertIcon aria-hidden />
          </CalloutIcon>
          <CalloutContent>
            Replacing an earlier notice. Review the notice below and approve it again. The earlier notice stays in
            history, and this creates a new paid mailing.
          </CalloutContent>
        </Callout>
      </div>
    </Rows>
  ),
};

/** The parts (AVE-149): the icon is a part with the icon inside; the text is CalloutContent. */
export const Parts: Story = {
  render: () => (
    <Rows>
      <div className="max-w-md">
        <Callout tone="warning">
          <CalloutIcon>
            <TriangleAlertIcon />
          </CalloutIcon>
          <CalloutContent>Changing the amount resends every unpaid notice.</CalloutContent>
        </Callout>
      </div>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const callout = canvas.getByText("Changing the amount resends every unpaid notice.").closest("[data-slot=callout]")!;
    await expect(callout).toHaveAttribute("data-tone", "warning");
    await expect(callout.querySelectorAll("svg")).toHaveLength(1);
    await expect(callout.querySelector("[data-slot=callout-icon]")).toHaveAttribute("aria-hidden", "true");
  },
};
