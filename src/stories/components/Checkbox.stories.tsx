import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import { Checkbox } from "#avenue/components/checkbox";
import { Field, FieldError, FieldLabel } from "#avenue/components/field";
import { Row, Rows } from "./story-kit";

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Unchecked, checked, indeterminate, invalid and disabled. 16px with a 4px corner. */
export const States: Story = {
  render: () => (
    <Rows>
      <Row label="unchecked">
        <Checkbox aria-label="Unchecked" />
      </Row>
      <Row label="checked">
        <Checkbox aria-label="Checked" defaultChecked />
      </Row>
      <Row label="indeterminate">
        <Checkbox aria-label="Indeterminate" defaultChecked="indeterminate" />
      </Row>
      <Row label="invalid">
        <Checkbox aria-label="Invalid" aria-invalid="true" />
      </Row>
      <Row label="disabled">
        <Checkbox aria-label="Disabled" disabled />
        <Checkbox aria-label="Disabled checked" disabled defaultChecked />
      </Row>
    </Rows>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("checkbox", { name: "Indeterminate" })).toHaveAttribute("aria-checked", "mixed");
    await expect(canvas.getByRole("checkbox", { name: "Disabled" })).toHaveAttribute("aria-disabled", "true");
  },
};

const rows = ["14 Larkspur Lane", "9 Juniper Court", "301 Sorrel Way"];

/** Select all over a list: indeterminate while some rows are chosen (ui-sdk's `parent` checkbox group does this for a form). Space toggles the focused box. */
export const SelectAll: Story = {
  render: function SelectAllStory() {
    const [chosen, setChosen] = useState<string[]>(["9 Juniper Court"]);
    const all = chosen.length === rows.length;
    return (
      <Rows>
        <Field orientation="horizontal">
          <Checkbox
            checked={all ? true : chosen.length > 0 ? "indeterminate" : false}
            onCheckedChange={(on) => setChosen(on ? rows : [])}
          />
          <FieldLabel>Select all households</FieldLabel>
        </Field>
        {rows.map((row) => (
          <Field key={row} orientation="horizontal" className="ps-6">
            <Checkbox
              checked={chosen.includes(row)}
              onCheckedChange={(on) => setChosen((c) => (on ? [...c, row] : c.filter((r) => r !== row)))}
            />
            <FieldLabel>{row}</FieldLabel>
          </Field>
        ))}
      </Rows>
    );
  },
  play: async ({ canvas }) => {
    const all = canvas.getByRole("checkbox", { name: "Select all households" });
    await expect(all).toHaveAttribute("aria-checked", "mixed");
    await userEvent.tab();
    await expect(all).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(all).toBeChecked();
    await expect(canvas.getByRole("checkbox", { name: "301 Sorrel Way" })).toBeChecked();
  },
};

/** Inside an invalid Field the box is marked aria-invalid and the error is announced. */
export const RequiredInField: Story = {
  render: () => (
    <Rows>
      <Field invalid orientation="horizontal" className="flex-wrap">
        <Checkbox />
        <FieldLabel>I confirm the payment was received</FieldLabel>
        <FieldError className="basis-full">Confirm before recording the payment.</FieldError>
      </Field>
    </Rows>
  ),
  play: async ({ canvas }) => {
    const box = canvas.getByRole("checkbox", { name: "I confirm the payment was received" });
    await expect(box).toHaveAttribute("aria-invalid", "true");
    await expect(box).toHaveAccessibleDescription("Confirm before recording the payment.");
  },
};
