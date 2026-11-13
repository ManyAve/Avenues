import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { Field, FieldContent, FieldDescription, FieldLabel } from "#avenue/components/field";
import { Switch } from "#avenue/components/switch";
import { Card, CardContent } from "#avenue/components/card";
import { BOUNDARY_MIN_CONTRAST, BoundaryReadout, measureBoundaryContrast } from "./contrast-kit";
import { Row, Rows } from "./story-kit";

const meta = {
  title: "Components/Switch",
  component: Switch,
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Default (32 x 18.4px) and sm (24 x 14px), off, on and disabled. Track and thumb are pills. */
export const States: Story = {
  render: () => (
    <Rows>
      {(["default", "sm"] as const).map((size) => (
        <Row key={size} label={size}>
          <Switch size={size} aria-label={`Off, ${size}`} />
          <Switch size={size} aria-label={`On, ${size}`} defaultChecked />
          <Switch size={size} aria-label={`Disabled, ${size}`} disabled />
          <Switch size={size} aria-label={`Disabled on, ${size}`} disabled defaultChecked />
          <Switch size={size} aria-label={`Invalid, ${size}`} aria-invalid="true" />
        </Row>
      ))}
    </Rows>
  ),
};

/** A settings row: label and description on the left, the switch on the right. Space toggles it. */
export const SettingsRow: Story = {
  tags: ["agent"],
  render: () => (
    <Rows>
      <Field orientation="horizontal" className="max-w-sm">
        <FieldContent>
          <FieldLabel>Automatic reminders</FieldLabel>
          <FieldDescription>Email households 14 days before dues are late.</FieldDescription>
        </FieldContent>
        <Switch />
      </Field>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole("switch", { name: "Automatic reminders" });
    await expect(toggle).toHaveAccessibleDescription("Email households 14 days before dues are late.");
    await userEvent.tab();
    await expect(toggle).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(toggle).toBeChecked();
  },
};

const switchSamples = [
  { where: "on the page", name: "Off on the page" },
  { where: "on a card", name: "Off on a card" },
] as const;

/**
 * A switch that is off, on the page and on a card. The off track is too faint to find on its own, so it carries a `muted-foreground` border. The line under it is measured from the rendered controls in the current theme; the play function fails if
 * either outline drops under 3:1 against what is behind it (WCAG 1.4.11, AVE-38).
 */
export const UncheckedOutline: Story = {
  render: () => (
    <BoundaryReadout samples={switchSamples}>
      <Rows>
        <Row label="page">
          <Switch aria-label="Off on the page" />
        </Row>
        <Card size="sm" className="max-w-xs">
          <CardContent>
            <Row label="card">
              <Switch aria-label="Off on a card" />
            </Row>
          </CardContent>
        </Card>
      </Rows>
    </BoundaryReadout>
  ),
  play: async ({ canvas }) => {
    for (const { name } of switchSamples) {
      const control = canvas.getByRole("switch", { name });
      await expect(measureBoundaryContrast(control)).toBeGreaterThanOrEqual(BOUNDARY_MIN_CONTRAST);
    }
  },
};
