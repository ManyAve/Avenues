import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent } from "storybook/test";
import { Checkbox } from "#avenue/components/checkbox";
import { Button } from "#avenue/components/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "#avenue/components/field";
import { Input } from "#avenue/components/input";
import { Popover, PopoverContent, PopoverDescription, PopoverTrigger } from "#avenue/components/popover";
import { Switch } from "#avenue/components/switch";

const meta = {
  title: "Components/Field",
  component: Field,
  decorators: [(Story) => <div className="max-w-sm p-inset">{Story()}</div>],
} satisfies Meta<typeof Field>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Label, control and description, wired by Field: the label names the input and the description describes it. */
export const LabelAndDescription: Story = {
  render: () => (
    <Field>
      <FieldLabel>Owner email</FieldLabel>
      <Input type="email" placeholder="name@example.com" />
      <FieldDescription>Dues notices and receipts go here.</FieldDescription>
    </Field>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Owner email" });
    await expect(input).toHaveAccessibleDescription("Dues notices and receipts go here.");
  },
};

/**
 * Invalid: the Field marks the input aria-invalid, shows the error, and adds it to the input's description. No screen
 * wires ids by hand.
 */
export const Invalid: Story = {
  render: () => (
    <Field invalid>
      <FieldLabel>Annual assessment</FieldLabel>
      <Input defaultValue="-40" inputMode="decimal" />
      <FieldDescription>The amount each household owes for the year.</FieldDescription>
      <FieldError>Enter an amount of zero or more.</FieldError>
    </Field>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Annual assessment" });
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleDescription(
      expect.stringContaining("Enter an amount of zero or more."),
    );
    await expect(canvas.getByRole("alert")).toHaveTextContent("Enter an amount of zero or more.");
  },
};

/**
 * A required field in a form: nothing is flagged while the user fills it in. Submitting it empty shows the matching
 * error and moves focus to the field; the error clears as soon as the value is fixed.
 */
export const RequiredOnSubmit: Story = {
  tags: ["agent"],
  render: () => (
    <form className="flex flex-col items-start gap-group" onSubmit={(event) => event.preventDefault()}>
      <Field>
        <FieldLabel>Street address</FieldLabel>
        <Input required />
        <FieldError match="valueMissing">Enter the street address.</FieldError>
      </Field>
      <Button type="submit">Save household</Button>
    </form>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Street address" });
    await expect(canvas.queryByRole("alert")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Save household" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Enter the street address.");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveFocus();
    await expect(input).toHaveAccessibleDescription(expect.stringContaining("Enter the street address."));
    await userEvent.type(input, "14 Larkspur Lane");
    await expect(input).not.toHaveAttribute("aria-invalid", "true");
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

export const Disabled: Story = {
  render: () => (
    <Field disabled>
      <FieldLabel>Lot number</FieldLabel>
      <Input defaultValue="27" />
      <FieldDescription>Set when the household was imported.</FieldDescription>
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Lot number" })).toBeDisabled();
  },
};

/** A fieldset with a legend, a group of fields, a checkbox and a switch row, as in the household form. */
export const Form: Story = {
  render: () => (
    <FieldSet>
      <FieldLegend>Household</FieldLegend>
      <FieldDescription>Fictional data for the story.</FieldDescription>
      <FieldGroup>
        <Field>
          <FieldLabel>Street address</FieldLabel>
          <Input defaultValue="14 Larkspur Lane" />
        </Field>
        <Field>
          <FieldLabel>Owner name</FieldLabel>
          <Input defaultValue="Robin Avery" />
        </Field>
        <FieldSeparator>Mailing</FieldSeparator>
        <Field orientation="horizontal">
          <Checkbox defaultChecked />
          <FieldLabel>Mail dues notices on paper</FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel>Email receipts</FieldLabel>
            <FieldDescription>Sent when a payment is recorded.</FieldDescription>
          </FieldContent>
          <Switch defaultChecked />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
  play: async ({ canvas }) => {
    // ui-sdk names a set whose legend is a div through aria-labelledby, wired after mount, so wait for it.
    await expect(await canvas.findByRole("group", { name: "Household" })).toBeVisible();
    const paper = canvas.getByRole("checkbox", { name: "Mail dues notices on paper" });
    await userEvent.click(canvas.getByText("Mail dues notices on paper"));
    await expect(paper).not.toBeChecked();
    // Still unchecked a moment later: one click on the label toggles the box once, not twice.
    await new Promise((resolve) => setTimeout(resolve, 300));
    await expect(paper).not.toBeChecked();
    await expect(canvas.getByRole("switch", { name: "Email receipts" })).toHaveAccessibleDescription(
      "Sent when a payment is recorded.",
    );
  },
};

/** A popup written inside a Field keeps its own width: ui-sdk renders it in place, so Field's full-width rule skips elements with the popover attribute. */
export const PopupInField: Story = {
  render: () => (
    <Field className="w-96">
      <FieldLabel htmlFor="field-popup-street">Street</FieldLabel>
      <Input id="field-popup-street" defaultValue="Larkspur Lane" />
      <Popover defaultOpen>
        <PopoverTrigger render={<Button variant="outline" />}>Street rules</PopoverTrigger>
        <PopoverContent>
          <PopoverDescription>Streets come from the association's map.</PopoverDescription>
        </PopoverContent>
      </Popover>
    </Field>
  ),
  play: async ({ canvas }) => {
    const field = canvas.getByRole("textbox", { name: "Street" }).parentElement as HTMLElement;
    const popup = await screen.findByRole("dialog");
    await expect(popup.parentElement).toBe(field);
    await expect(popup.getBoundingClientRect().width).toBeLessThan(field.getBoundingClientRect().width);
  },
};
