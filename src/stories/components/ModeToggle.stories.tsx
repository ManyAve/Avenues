import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import { ModeToggle } from "#avenue/components/mode-toggle";

const meta = {
  title: "Components/ModeToggle",
  component: ModeToggle,
  args: { dev: false, theme: "light" },
} satisfies Meta<typeof ModeToggle>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const DevDark: Story = { args: { dev: true, theme: "dark" } };
export const WithoutDev: Story = { args: { dev: undefined } };

function Controlled() {
  const [dev, setDev] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  return <ModeToggle dev={dev} theme={theme} onDevChange={setDev} onThemeChange={setTheme} />;
}

/** One Tab stop: the arrow keys move between Dev and the theme, and Space presses. */
export const ByKeyboard: Story = {
  tags: ["agent"],
  render: () => <Controlled />,
  play: async ({ canvas }) => {
    const dev = canvas.getByRole("button", { name: /dev mode/i });
    const theme = canvas.getByRole("button", { name: /dark theme/i });
    await userEvent.tab();
    await expect(dev).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(dev).toHaveAttribute("aria-pressed", "true");
    await userEvent.keyboard("{ArrowRight}");
    await expect(theme).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(theme).toHaveAttribute("aria-pressed", "true");
    // A toggle keeps its name and text; aria-pressed carries the state.
    await expect(theme).toHaveTextContent("Dark");
    await expect(theme).toHaveAccessibleName("Dark theme");
    await userEvent.tab();
    await expect(theme).not.toHaveFocus();
    await expect(dev).not.toHaveFocus();
  },
};
