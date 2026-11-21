import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Kbd } from "#avenue/components/kbd";
import { Row, Rows } from "./story-kit";

const meta = {
  title: "Components/Kbd",
  component: Kbd,
  args: { children: "/" },
} satisfies Meta<typeof Kbd>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Keys as a shortcut hint writes them: mono at the meta step, in the faint floating edge. */
export const Keys: Story = {
  render: () => (
    <Rows>
      <Row label="one key">
        <Kbd>/</Kbd>
        <Kbd>Esc</Kbd>
        <Kbd>?</Kbd>
      </Row>
      <Row label="with a modifier">
        <Kbd>⌘K</Kbd>
        <Kbd>Ctrl+K</Kbd>
      </Row>
      <Row label="in a sentence">
        <p className="text-compact">
          Press <Kbd>/</Kbd> to search.
        </p>
      </Row>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const key = canvas.getByText("Esc");
    await expect(key.tagName).toBe("KBD");
    const style = getComputedStyle(key);
    // Avenue's mono stack (--font-geist-mono).
    await expect(style.fontFamily).toMatch(/monospace$/);
    // The meta step, never smaller: 14px on the web scale, 13px on desktop.
    await expect(parseFloat(style.fontSize)).toBeGreaterThanOrEqual(13);
  },
};
