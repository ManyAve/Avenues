import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Money } from "#avenue/components/money";
import { Row, Rows } from "./story-kit";

const meta = {
  title: "Components/Money",
  component: Money,
  args: { cents: 24000 },
} satisfies Meta<typeof Money>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Tabular, monospace and unsigned by default; `signed` marks credits with "+"; a missing amount is a dash. */
export const Amounts: Story = {
  render: () => (
    <Rows>
      <Row label="plain">
        <Money cents={24000} />
        <Money cents={-500} />
        <Money cents={0} />
        <Money cents={123456789} />
      </Row>
      <Row label="signed">
        <Money cents={1250} signed />
        <Money cents={-1250} signed />
        <Money cents={0} signed />
      </Row>
      <Row label="blank">
        <Money cents={null} />
      </Row>
    </Rows>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("$240.00")).toBeVisible();
    await expect(canvas.getByText("-$5.00")).toBeVisible();
    await expect(canvas.getByText("+$12.50")).toBeVisible();
    await expect(canvas.getByText("-$12.50")).toBeVisible();
    await expect(canvas.getByText("No amount")).toBeInTheDocument();
  },
};

/** Lined up in a column, digits align because they are tabular. */
export const Column: Story = {
  render: () => (
    <Rows>
      <div className="flex w-40 flex-col items-end gap-1 text-compact">
        <Money cents={24000} />
        <Money cents={1111} />
        <Money cents={-8050} />
        <Money cents={120000} />
      </div>
    </Rows>
  ),
};

/** In a box far too narrow, it overflows rather than truncating or wrapping (UX.md): the amount stays whole. */
export const NeverTruncates: Story = {
  render: () => (
    <Rows>
      <div className="w-12 border border-dashed border-border">
        <Money cents={123456789} data-testid="amount" />
      </div>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const amount = canvas.getByTestId("amount");
    await expect(amount).toHaveTextContent("$1,234,567.89");
    const lineHeight = parseFloat(getComputedStyle(amount).lineHeight);
    await expect(amount.getBoundingClientRect().height).toBeLessThanOrEqual(lineHeight + 1);
    await expect(getComputedStyle(amount).textOverflow).not.toBe("ellipsis");
    await expect(amount.scrollWidth).toBeLessThanOrEqual(amount.getBoundingClientRect().width + 1);
  },
};
