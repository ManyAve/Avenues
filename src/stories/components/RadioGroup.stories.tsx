import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId } from "react";
import { expect, userEvent } from "storybook/test";
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "#avenue/components/field";
import { RadioGroup, RadioGroupItem } from "#avenue/components/radio-group";
import { Row, Rows } from "./story-kit";

const meta = {
  title: "Components/Radio group",
  component: RadioGroup,
} satisfies Meta<typeof RadioGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Unchecked, checked and disabled. A 16px circle; chosen fills with primary and shows the dot. */
export const States: Story = {
  render: () => (
    <Rows>
      <Row label="unchecked">
        <RadioGroup aria-label="Unchecked" className="w-fit">
          <RadioGroupItem value="a" aria-label="Unchecked option" />
        </RadioGroup>
      </Row>
      <Row label="checked">
        <RadioGroup aria-label="Checked" defaultValue="a" className="w-fit">
          <RadioGroupItem value="a" aria-label="Checked option" />
        </RadioGroup>
      </Row>
      <Row label="disabled">
        <RadioGroup aria-label="Disabled" defaultValue="b" disabled className="flex w-fit gap-4">
          <RadioGroupItem value="a" aria-label="Disabled option" />
          <RadioGroupItem value="b" aria-label="Disabled checked option" />
        </RadioGroup>
      </Row>
    </Rows>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: "Checked option" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Disabled option" })).toHaveAttribute("aria-disabled", "true");
  },
};

const reminders = [
  { value: "week", label: "A week before", description: "One email seven days ahead." },
  { value: "day", label: "The day before", description: "One email the evening before." },
  { value: "none", label: "No reminder", description: "Nothing until the next notice." },
];

/**
 * A labelled set: the legend names the group, each Field's label names its radio and the line under it describes it.
 * One Tab stop on the chosen radio; the arrow keys move and choose together, wrapping at the ends.
 */
export const Keyboard: Story = {
  tags: ["agent"],
  render: function KeyboardStory() {
    const id = useId();
    return (
      <div className="flex max-w-sm flex-col gap-4 p-inset">
        <button type="button">Before the group</button>
        <FieldSet>
          <FieldLegend id={`${id}-legend`} variant="label">
            Dues reminder
          </FieldLegend>
          <RadioGroup aria-labelledby={`${id}-legend`} defaultValue="week" name="reminder">
            {reminders.map((r) => (
              <Field key={r.value} orientation="horizontal">
                <RadioGroupItem value={r.value} />
                <div className="flex flex-col gap-1">
                  <FieldLabel>{r.label}</FieldLabel>
                  <FieldDescription>{r.description}</FieldDescription>
                </div>
              </Field>
            ))}
          </RadioGroup>
        </FieldSet>
        <button type="button">After the group</button>
      </div>
    );
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radiogroup", { name: "Dues reminder" })).toBeInTheDocument();
    const [week, day, none] = reminders.map((r) => canvas.getByRole("radio", { name: r.label }));
    await expect(day).toHaveAccessibleDescription("One email the evening before.");
    await userEvent.click(canvas.getByRole("button", { name: "Before the group" }));
    await userEvent.tab();
    await expect(week).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(day).toHaveFocus();
    await expect(day).toBeChecked();
    await expect(week).not.toBeChecked();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await expect(week).toBeChecked();
    await userEvent.keyboard("{ArrowUp}");
    await expect(none).toBeChecked();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "After the group" })).toHaveFocus();
  },
};
