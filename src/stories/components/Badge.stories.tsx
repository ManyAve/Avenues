import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircleCheckIcon } from "lucide-react";
import { expect } from "storybook/test";
import { Badge } from "#avenue/components/badge";
import { Row, Rows } from "./story-kit";

const variants = ["default", "secondary", "destructive", "outline", "ghost", "link"] as const;

const meta = {
  title: "Components/Badge",
  component: Badge,
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Every variant, with and without an icon, and as a link. 20px pill. */
export const Variants: Story = {
  render: () => (
    <Rows>
      {variants.map((variant) => (
        <Row key={variant} label={variant}>
          <Badge variant={variant}>Past due</Badge>
          <Badge variant={variant}>
            <CircleCheckIcon aria-hidden data-icon="inline-start" />
            Paid
          </Badge>
          {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- labelled by the badge's children */}
          <Badge variant={variant} render={<a href="#dues" />}>
            12 households
          </Badge>
        </Row>
      ))}
    </Rows>
  ),
  play: async ({ canvas }) => {
    const heights = canvas.getAllByText("Past due").map((el) => el.getBoundingClientRect().height);
    await expect(new Set(heights)).toEqual(new Set([20]));
  },
};
