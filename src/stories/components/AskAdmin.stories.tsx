import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { AskAdmin } from "#avenue/components/ask-admin";
import { Button } from "#avenue/components/button";
import { Switch } from "#avenue/components/switch";
import { Rows } from "./story-kit";

const meta = {
  title: "Components/Ask admin",
  component: AskAdmin,
  args: { children: "Ask a board admin to change dues settings." },
} satisfies Meta<typeof AskAdmin>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Inline, under the controls it explains. The controls point their description at it, so the reason is read with them. */
export const Inline: Story = {
  render: (args) => (
    <Rows>
      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-compact">
          <Switch id="reminders" disabled defaultChecked aria-describedby="automations-reason" />
          <label htmlFor="reminders">Send dues reminders</label>
        </span>
        <AskAdmin id="automations-reason" {...args}>
          Ask a board admin to turn automations on or off.
        </AskAdmin>
      </div>
    </Rows>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("switch")).toHaveAccessibleDescription(
      "Ask a board admin to turn automations on or off.",
    );
  },
};

/** In a wrapping dialog footer: its own full-width line above the buttons, aligned to the end. */
export const Footer: Story = {
  render: (args) => (
    <Rows>
      <div className="flex w-[28rem] flex-col-reverse gap-2 rounded-xl border p-inset sm:flex-row sm:flex-wrap sm:justify-end">
        <AskAdmin footer {...args} />
        <Button variant="outline">Cancel</Button>
        <Button disabled>
          Save
        </Button>
      </div>
    </Rows>
  ),
};
