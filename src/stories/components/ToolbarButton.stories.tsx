import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Rows3, SlidersHorizontal, Zap } from "lucide-react";
import { expect, userEvent } from "storybook/test";
import { ToolbarButton } from "#avenue/components/toolbar-button";

const meta = {
  title: "Components/ToolbarButton",
  component: ToolbarButton,
  args: { "aria-label": "Row density", children: <Rows3 />, onClick: fn() },
} satisfies Meta<typeof ToolbarButton>;
export default meta;
type Story = StoryObj<typeof meta>;

/** An icon-only toolbar button. It is named by its aria-label, and is 32px with the 10px control corner (AVE-2). */
export const Icon: Story = {
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole("button", { name: "Row density" });
    await expect(button.getBoundingClientRect().height).toBe(32);
    await expect(getComputedStyle(button).borderTopLeftRadius).toBe("10px");
    // The app's 14px toolbar icon, inside the agreed 32px button (AVE-68).
    await expect(button.querySelector("svg")!.getBoundingClientRect().width).toBe(14);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const WithLabel: Story = {
  args: {
    "aria-label": "Automations, 2 on",
    children: (
      <>
        <Zap aria-hidden /> 2 on
      </>
    ),
  },
};

/** The app's view controls, side by side, each named on its own. */
export const Group: Story = {
  tags: ["agent"],
  render: () => (
    <div className="flex gap-group">
      <ToolbarButton aria-label="Row density">
        <Rows3 />
      </ToolbarButton>
      <ToolbarButton aria-label="Automations, 2 on">
        <Zap aria-hidden /> 2 on
      </ToolbarButton>
      <ToolbarButton aria-label="View settings">
        <SlidersHorizontal />
      </ToolbarButton>
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Row density" })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Automations, 2 on" })).toHaveFocus();
  },
};
