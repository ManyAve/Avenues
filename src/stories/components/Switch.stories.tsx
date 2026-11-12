import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { Field, FieldContent, FieldDescription, FieldLabel } from "#avenue/components/field";
import { Switch } from "#avenue/components/switch";
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
