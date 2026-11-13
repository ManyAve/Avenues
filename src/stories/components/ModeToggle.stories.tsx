import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import { ModeToggle, type ThemeChoice } from "#avenue/components/mode-toggle";

const meta = {
  title: "Components/ModeToggle",
  component: ModeToggle,
  args: { dev: false, theme: "light" },
} satisfies Meta<typeof ModeToggle>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const DevDark: Story = { args: { dev: true, theme: "dark" } };
export const System: Story = { args: { theme: "dark", choice: "system" } };
export const WithoutDev: Story = { args: { dev: undefined } };

function Controlled() {
  const [dev, setDev] = useState(false);
  const [choice, setChoice] = useState<ThemeChoice>("system");
  return <ModeToggle dev={dev} choice={choice} onDevChange={setDev} onThemeChange={setChoice} />;
}

/** Dev is its own toggle; the theme is one Tab stop where the arrow keys choose, and the chosen theme names itself. */
export const ByKeyboard: Story = {
  tags: ["agent"],
  render: () => <Controlled />,
  play: async ({ canvas }) => {
    const dev = canvas.getByRole("button", { name: "Dev mode" });
    const system = canvas.getByRole("radio", { name: "Match system theme" });
    const light = canvas.getByRole("radio", { name: "Light theme" });
    await expect(system).toBeChecked();
    await expect(system).toHaveTextContent("System");
    await userEvent.tab();
    await expect(dev).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(dev).toHaveAttribute("aria-pressed", "true");
    await userEvent.tab();
    await expect(system).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(light).toHaveFocus();
    await expect(light).toBeChecked();
    await expect(light).toHaveTextContent("Light");
    await expect(system).not.toHaveTextContent("System");
    // The way back: System follows the computer again.
    await userEvent.keyboard("{ArrowLeft}");
    await expect(system).toBeChecked();
    // One Tab stop for the theme: Tab leaves the group.
    await userEvent.tab();
    await expect(canvas.queryByRole("radio", { name: /theme/i, checked: true })).not.toHaveFocus();
  },
};
