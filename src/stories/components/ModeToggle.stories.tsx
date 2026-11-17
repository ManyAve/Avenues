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
export const System: Story = { args: { theme: "dark", value: "system" } };
export const WithoutDev: Story = { args: { dev: undefined } };

function Controlled() {
  const [dev, setDev] = useState(false);
  const [choice, setChoice] = useState<ThemeChoice>("system");
  return <ModeToggle dev={dev} value={choice} onDevChange={setDev} onValueChange={setChoice} />;
}

/** Dev is its own toggle; the theme is one Tab stop where the arrow keys choose, and the chosen theme names itself. */
export const ByKeyboard: Story = {
  tags: ["agent"],
  render: () => <Controlled />,
  play: async ({ canvas }) => {
    const dev = canvas.getByRole("button", { name: "Dev mode" });
    const system = canvas.getByRole("radio", { name: "System theme" });
    // Names start with what they show (WCAG 2.5.3), and Dev is one toggle, not a group of one (AVE-62).
    await expect(system).toHaveAccessibleName("System theme");
    await expect(dev).toHaveAccessibleName("Dev mode");
    await expect(dev.closest("[role=group], [role=toolbar]")).toBeNull();
    await expect(canvas.queryByRole("group", { name: "Developer mode" })).toBeNull();
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

/**
 * AVE-145: ModeToggle holds its own state from `defaultValue` and `defaultDev`, and a callback that calls
 * `details.cancel()` keeps the old state, as ui-sdk's own components do. Here Dark is refused; the details say why
 * each change came and how (a test's simulated keys read as "programmatic", a person's as "keyboard").
 */
export const RefusesAChange: Story = {
  render: function Render() {
    const [heard, setHeard] = useState("");
    return (
      <div className="grid gap-group">
        <ModeToggle
          defaultDev={false}
          defaultValue="system"
          onDevChange={(on, details) => setHeard(`dev ${on}, ${details.reason}, ${details.source}`)}
          onValueChange={(value, details) => {
            setHeard(`${value}, ${details.reason}, ${details.source}`);
            if (value === "dark") details.cancel();
          }}
        />
        <output data-testid="heard" className="text-meta text-muted-foreground">
          {heard}
        </output>
      </div>
    );
  },
  play: async ({ canvas }) => {
    const dev = canvas.getByRole("button", { name: "Dev mode" });
    const system = canvas.getByRole("radio", { name: "System theme" });
    const heard = canvas.getByTestId("heard");
    await userEvent.tab();
    await expect(dev).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(dev).toHaveAttribute("aria-pressed", "true");
    await expect(heard).toHaveTextContent(/^dev true, press, \w+$/);
    await userEvent.tab();
    await expect(system).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    const light = canvas.getByRole("radio", { name: "Light theme" });
    await expect(light).toBeChecked();
    await expect(heard).toHaveTextContent(/^light, list-navigation, \w+$/);
    // Dark is refused, so Light stays chosen.
    await userEvent.keyboard("{ArrowRight}");
    await expect(heard).toHaveTextContent(/^dark, list-navigation, \w+$/);
    await expect(light).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Dark theme" })).not.toBeChecked();
  },
};
