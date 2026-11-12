import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { Field, FieldDescription, FieldError, FieldLabel } from "#avenue/components/field";
import { Textarea } from "#avenue/components/textarea";

const meta = {
  title: "Components/Textarea",
  component: Textarea,
  decorators: [(Story) => <div className="max-w-sm p-inset">{Story()}</div>],
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Textarea grows with its content from 64px. */
export const InField: Story = {
  tags: ["agent"],
  render: () => (
    <Field>
      <FieldLabel>Note to the board</FieldLabel>
      <Textarea placeholder="What happened, and what you need" />
      <FieldDescription>Only board members see this.</FieldDescription>
    </Field>
  ),
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole("textbox", { name: "Note to the board" });
    await expect(textarea).toHaveAccessibleDescription("Only board members see this.");
    await userEvent.type(textarea, "The streetlight on Juniper Court is out.");
    await expect(textarea).toHaveValue("The streetlight on Juniper Court is out.");
  },
};

export const Invalid: Story = {
  render: () => (
    <Field invalid>
      <FieldLabel>Complaint details</FieldLabel>
      <Textarea />
      <FieldError>Describe the complaint before sending it.</FieldError>
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Complaint details" })).toHaveAttribute("aria-invalid", "true");
  },
};
