import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { Field, FieldDescription, FieldError, FieldLabel } from "#avenue/components/field";
import { Textarea } from "#avenue/components/textarea";
import {
  ContrastReadout,
  measureFieldContrast,
  PLACEHOLDER_MAX_SHARE_OF_TYPED,
  PLACEHOLDER_MIN_CONTRAST,
} from "./placeholder-kit";

/**
 * **Placeholder rule (AVE-25)**, the same as Input's: a placeholder is a hint in `muted-foreground` (about half typed
 * text's contrast, still over 4.5:1), never the label, never the only instructions and never an example answer.
 * What the board needs to know goes in the description, which stays visible while the resident types.
 */
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

/** An empty textarea beside a filled one, with the contrast measured from the rendered field in the current theme. */
export const EmptyBesideFilled: Story = {
  render: () => (
    <ContrastReadout>
      <Field>
        <FieldLabel>Details</FieldLabel>
        <Textarea placeholder="What happened, and what you need" />
      </Field>
      <Field>
        <FieldLabel>Details, filled in</FieldLabel>
        <Textarea defaultValue="Gate latch won't catch at the Maple Court entrance. It swings open in the wind." />
      </Field>
    </ContrastReadout>
  ),
  play: async ({ canvas }) => {
    const empty = canvas.getByRole("textbox", { name: "Details" });
    await expect(empty).toHaveAccessibleName("Details");
    await expect(empty).toHaveValue("");

    const { typed, placeholder } = measureFieldContrast(empty as HTMLTextAreaElement);
    await expect(placeholder).toBeGreaterThanOrEqual(PLACEHOLDER_MIN_CONTRAST);
    await expect(placeholder).toBeLessThanOrEqual(typed * PLACEHOLDER_MAX_SHARE_OF_TYPED);
    await expect(canvas.getByTestId("contrast-readout")).toHaveTextContent(`placeholder ${placeholder}:1`);

    await userEvent.type(empty, "Gate latch won't catch");
    await expect(empty.matches(":placeholder-shown")).toBe(false);
  },
};
