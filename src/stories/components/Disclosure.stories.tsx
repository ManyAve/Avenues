import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { Disclosure } from "#avenue/components/disclosure";
import { createAgent } from "@ui-sdk/react/agent";

// AVE-7. One Disclosure for the app's five native details/summary blocks (Advanced, follow-up, dues notice,
// workbook). All values are fictional.

const meta = {
  title: "Components/Disclosure",
  component: Disclosure,
  parameters: { layout: "padded" },
  args: {
    summary: "Advanced",
    children: (
      <>
        <p>
          Stripe customer <code className="font-mono">cus_TEST0001</code>
        </p>
        <p>
          Ledger entry <code className="font-mono">led_TEST0042</code>
        </p>
      </>
    ),
  },
} satisfies Meta<typeof Disclosure>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = {
  args: { defaultOpen: true },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Advanced" });
    await expect(button).toHaveAttribute("aria-expanded", "true");
    // Open, the summary keeps the muted colour, as the app's does (AVE-58).
    await expect(getComputedStyle(button).color).toBe(getComputedStyle(button.parentElement!).color);
  },
};

export const Disabled: Story = { args: { disabled: true } };

export const InACard: Story = {
  name: "Inside a card",
  render: (args) => (
    <div className="w-96 rounded-xl bg-card p-inset text-card-foreground shadow-card ring-1 ring-border">
      <p className="mb-row-y text-compact">Workbook imported from the 2026 dues sheet.</p>
      <Disclosure {...args} summary="Sheets skipped (2)">
        <p>“Notes” has no household column.</p>
        <p>“Archive 2019” is older than the register.</p>
      </Disclosure>
    </div>
  ),
};

/** Keyboard: Tab reaches it, Enter and Space toggle, aria-expanded follows, focus ring shows. */
export const Keyboard: Story = {
  play: async ({ canvas, step }) => {
    const button = canvas.getByRole("button", { name: "Advanced" });

    await step("a real button, closed, with its panel hidden", async () => {
      await expect(button).toHaveAttribute("aria-expanded", "false");
      await expect(canvas.queryByText(/cus_TEST0001/)).not.toBeInTheDocument();
    });

    await step("Tab focuses it with a visible ring", async () => {
      await userEvent.tab();
      await expect(button).toHaveFocus();
      await expect(button).toHaveClass(/focus-visible:ring-3/);
      await expect(getComputedStyle(button).boxShadow).not.toBe("none");
    });

    await step("Enter opens; the panel is linked", async () => {
      await userEvent.keyboard("{Enter}");
      await expect(button).toHaveAttribute("aria-expanded", "true");
      const panelId = button.getAttribute("aria-controls");
      await expect(panelId).toBeTruthy();
      await expect(canvas.getByText(/cus_TEST0001/).closest(`[id="${panelId}"]`)).not.toBeNull();
    });

    await step("Space closes", async () => {
      await userEvent.keyboard(" ");
      await expect(button).toHaveAttribute("aria-expanded", "false");
    });
  },
};

/** An agent finds the Disclosure by its summary, reads that it is closed, and opens it. */
export const Agent: Story = {
  tags: ["agent"],
  play: async ({ canvas }) => {
    const agent = createAgent();
    const found = agent.snapshot().filter((entry) => !entry.offPage && entry.label === "Advanced");
    await expect(found).toHaveLength(1);
    await expect(found[0]?.["open"]).toBe(false);
    const result = await agent.act({ steps: [{ ref: "Advanced", action: "setOpen", args: [true] }] });
    await expect(result.ok, result.error?.message).toBe(true);
    await expect(canvas.getByRole("button", { name: "Advanced" })).toHaveAttribute("aria-expanded", "true");
  },
};
