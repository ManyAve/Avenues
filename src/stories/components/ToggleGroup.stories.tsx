import type { Meta, StoryObj } from "@storybook/react-vite";
import { CodeIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { expect, userEvent } from "storybook/test";
import { ToggleGroup, ToggleGroupItem } from "#avenue/components/toggle-group";
import { Row, Rows } from "./story-kit";

const meta = {
  title: "Components/Toggle group",
  component: ToggleGroup,
} satisfies Meta<typeof ToggleGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

const densities = ["Compact", "Comfortable", "Roomy"];

/** Spaced (8px apart) and joined (`spacing={0}`), in each size. Joined groups take the size's outer corner. */
export const Variants: Story = {
  render: () => (
    <Rows>
      {(["sm", "default", "lg"] as const).map((size) => (
        <Row key={size} label={`outline, ${size}`}>
          <ToggleGroup variant="outline" size={size} defaultValue="Comfortable" aria-label={`Row height ${size}`}>
            {densities.map((d) => (
              <ToggleGroupItem key={d} value={d}>
                {d}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            variant="outline"
            size={size}
            spacing={0}
            defaultValue="light"
            aria-label={`Theme ${size}`}
          >
            <ToggleGroupItem value="light" aria-label="Light">
              <SunIcon aria-hidden />
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label="Dark">
              <MoonIcon aria-hidden />
            </ToggleGroupItem>
            <ToggleGroupItem value="system" aria-label="Match system">
              <MonitorIcon aria-hidden />
            </ToggleGroupItem>
          </ToggleGroup>
        </Row>
      ))}
      <Row label="multiple">
        <ToggleGroup multiple variant="outline" size="sm" spacing={0} aria-label="Developer mode">
          <ToggleGroupItem value="dev">
            <CodeIcon aria-hidden data-icon="inline-start" />
            Dev
          </ToggleGroupItem>
        </ToggleGroup>
      </Row>
      <Row label="vertical">
        <ToggleGroup variant="outline" orientation="vertical" defaultValue="print" aria-label="Mailing mode">
          <ToggleGroupItem value="print">Print and mail</ToggleGroupItem>
          <ToggleGroupItem value="email">Email only</ToggleGroupItem>
        </ToggleGroup>
      </Row>
      <Row label="disabled">
        <ToggleGroup variant="outline" disabled defaultValue="Compact" aria-label="Row height disabled">
          {densities.map((d) => (
            <ToggleGroupItem key={d} value={d}>
              {d}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Row>
    </Rows>
  ),
};

/**
 * A single-choice group is a radio group: one Tab stop that lands on the chosen item, and the arrow keys move and
 * select together, wrapping at the ends.
 */
export const Keyboard: Story = {
  tags: ["agent"],
  render: () => (
    <Rows>
      <button type="button">Before the group</button>
      <ToggleGroup variant="outline" size="sm" defaultValue="Comfortable" aria-label="Row height">
        {densities.map((d) => (
          <ToggleGroupItem key={d} value={d}>
            {d}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <button type="button">After the group</button>
    </Rows>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radiogroup", { name: "Row height" })).toBeInTheDocument();
    const [compact, comfortable, roomy] = densities.map((d) => canvas.getByRole("radio", { name: d }));
    await userEvent.click(canvas.getByRole("button", { name: "Before the group" }));
    await userEvent.tab();
    await expect(comfortable).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(roomy).toHaveFocus();
    await expect(roomy).toBeChecked();
    await expect(comfortable).not.toBeChecked();
    await userEvent.keyboard("{ArrowRight}");
    await expect(compact).toHaveFocus();
    await expect(compact).toBeChecked();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "After the group" })).toHaveFocus();
  },
};

/** Independent on/off items (`multiple`): one Tab stop, arrows move, Space or Enter presses without moving others. */
export const KeyboardMultiple: Story = {
  render: () => (
    <Rows>
      <ToggleGroup multiple variant="outline" size="sm" defaultValue={["unpaid"]} aria-label="Show">
        <ToggleGroupItem value="unpaid">Unpaid</ToggleGroupItem>
        <ToggleGroupItem value="archived">Archived</ToggleGroupItem>
      </ToggleGroup>
      <button type="button">After the group</button>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const unpaid = canvas.getByRole("button", { name: "Unpaid" });
    const archived = canvas.getByRole("button", { name: "Archived" });
    await userEvent.tab();
    await expect(unpaid).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(archived).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(archived).toHaveAttribute("aria-pressed", "true");
    await expect(unpaid).toHaveAttribute("aria-pressed", "true");
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "After the group" })).toHaveFocus();
  },
};
