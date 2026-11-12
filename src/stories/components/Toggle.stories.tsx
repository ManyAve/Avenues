import type { Meta, StoryObj } from "@storybook/react-vite";
import { BoldIcon, LayoutListIcon } from "lucide-react";
import { expect, userEvent } from "storybook/test";
import { Toggle } from "#avenue/components/toggle";
import { Row, Rows } from "./story-kit";

const meta = {
  title: "Components/Toggle",
  component: Toggle,
} satisfies Meta<typeof Toggle>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Default and outline at sm 28 (8px corner), default 32 and lg 40 (10px corner); off, pressed and disabled. */
export const Variants: Story = {
  render: () => (
    <Rows>
      {(["default", "outline"] as const).flatMap((variant) =>
        (["sm", "default", "lg"] as const).map((size) => (
          <Row key={`${variant}-${size}`} label={`${variant}, ${size}`}>
            <Toggle variant={variant} size={size} aria-label={`Bold ${variant} ${size}`}>
              <BoldIcon aria-hidden />
            </Toggle>
            <Toggle variant={variant} size={size} defaultPressed>
              <LayoutListIcon aria-hidden data-icon="inline-start" />
              Grouped
            </Toggle>
            <Toggle variant={variant} size={size} disabled>
              Disabled
            </Toggle>
          </Row>
        )),
      )}
    </Rows>
  ),
  play: async ({ canvas }) => {
    const heights = canvas.getAllByRole("button", { name: /Grouped/ }).map((el) => el.getBoundingClientRect().height);
    await expect(heights).toEqual([28, 32, 40, 28, 32, 40]);
  },
};

/** Space and Enter press and release; aria-pressed tells a screen reader the state. */
export const Keyboard: Story = {
  tags: ["agent"],
  render: () => (
    <Rows>
      <Toggle variant="outline">Show archived</Toggle>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole("button", { name: "Show archived" });
    await userEvent.tab();
    await expect(toggle).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await userEvent.keyboard("{Enter}");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
  },
};
