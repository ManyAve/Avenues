import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import { InlineMessage } from "#avenue/components/inline-message";

// AVE-7. One InlineMessage for the app's 32 Alert paragraphs and ~60 inline role=alert / role=status spots.

const meta = {
  title: "Components/Inline message",
  component: InlineMessage,
  parameters: { layout: "padded" },
  args: { tone: "error", children: "Couldn't save the payment. Check your connection and try again." },
} satisfies Meta<typeof InlineMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ErrorTone: Story = { name: "Error" };
export const Warning: Story = {
  args: { tone: "warning", children: "This household has no owner email, so the notice goes by mail." },
};
export const Info: Story = { args: { tone: "info", children: "Payments from Stripe appear here within a minute." } };
export const Pending: Story = { args: { tone: "pending", children: "Saving…" } };

export const Tones: Story = {
  render: () => (
    <div className="grid w-96 gap-group">
      <InlineMessage tone="error">Couldn't save the payment. Check your connection and try again.</InlineMessage>
      <InlineMessage tone="warning">This household has no owner email, so the notice goes by mail.</InlineMessage>
      <InlineMessage tone="info">Payments from Stripe appear here within a minute.</InlineMessage>
      <InlineMessage tone="pending">Saving…</InlineMessage>
    </div>
  ),
  play: async ({ canvas }) => {
    // error interrupts (alert); the rest wait their turn (status).
    await expect(canvas.getAllByRole("alert")).toHaveLength(1);
    await expect(canvas.getAllByRole("status")).toHaveLength(3);
    await expect(canvas.getByRole("alert")).toHaveTextContent("Couldn't save the payment");
  },
};

/** The live region stays mounted: a re-render with the same text leaves the DOM alone, a new message changes it once. */
export const Announcing: Story = {
  render: function Render() {
    const [error, setError] = useState("");
    const [renders, setRenders] = useState(0);
    return (
      <div className="grid w-96 gap-group">
        <div className="flex gap-group">
          <button type="button" className="rounded-lg border px-2 py-1" onClick={() => setError("Amount is required.")}>
            Submit empty
          </button>
          <button type="button" className="rounded-lg border px-2 py-1" onClick={() => setRenders((n) => n + 1)}>
            Re-render ({renders})
          </button>
          <button type="button" className="rounded-lg border px-2 py-1" onClick={() => setError("")}>
            Clear
          </button>
        </div>
        <InlineMessage tone="error">{error}</InlineMessage>
      </div>
    );
  },
  play: async ({ canvas, step }) => {
    const region = canvas.getByRole("alert");
    const changes: MutationRecord[] = [];
    const observer = new MutationObserver((records) => changes.push(...records));
    observer.observe(region, { childList: true, subtree: true, characterData: true });

    await step("empty region stays in the accessibility tree, visually hidden", async () => {
      await expect(region).toBeEmptyDOMElement();
      // display:none would drop it from the accessibility tree, and screen readers miss the next polite message.
      await expect(getComputedStyle(region).display).not.toBe("none");
      await expect(region.getBoundingClientRect().width).toBeLessThanOrEqual(1);
    });

    await step("a new message fills the same region", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Submit empty" }));
      await expect(canvas.getByRole("alert")).toBe(region);
      await expect(region).toHaveTextContent("Amount is required.");
    });

    await step("re-rendering with the same text changes nothing", async () => {
      await new Promise((r) => setTimeout(r, 50));
      changes.length = 0;
      await userEvent.click(canvas.getByRole("button", { name: /Re-render/ }));
      await userEvent.click(canvas.getByRole("button", { name: "Submit empty" }));
      await new Promise((r) => setTimeout(r, 50));
      await expect(changes).toHaveLength(0);
    });

    await step("clearing empties it without removing it", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Clear" }));
      await expect(canvas.getByRole("alert")).toBe(region);
      await expect(region).toBeEmptyDOMElement();
    });

    observer.disconnect();
  },
};
