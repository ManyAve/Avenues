import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "#avenue/components/field";
import { Input } from "#avenue/components/input";
import { DoDont } from "../foundations/foundation-docs";
import {
  ContrastReadout,
  measureFieldContrast,
  PLACEHOLDER_MAX_SHARE_OF_TYPED,
  PLACEHOLDER_MIN_CONTRAST,
} from "./placeholder-kit";

/**
 * **Placeholder rule (AVE-25).** A placeholder is a hint. It is drawn in `muted-foreground`, about half the contrast
 * of typed text and still well over 4.5:1 (9.4:1 on a white field against 20.1:1 typed; 7.7:1 against 13.2:1 in
 * dark, measured on the rendered field). It is never the label, never the only instructions and never an
 * example value: no "0.00", no sample names, no date masks. Every field keeps a visible label; format and "required" go in the field's description, because a
 * placeholder disappears at the first keystroke. A placeholder fits the field at 390px.
 */
const meta = {
  title: "Components/Input",
  component: Input,
  // A story with `parameters.wide` (the do and don't pair) gets the full width; the rest sit in a phone-width column.
  decorators: [(Story, { parameters }) => <div className={parameters["wide"] ? "p-inset" : "max-w-sm p-inset"}>{Story()}</div>],
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Input sizes: xs 24, sm 28 (8px corner), md 32 default, lg 40 (10px corner). */
export const Sizes: Story = {
  render: () => (
    <FieldGroup className="gap-3">
      {(["xs", "sm", "md", "lg"] as const).map((size) => (
        <Field key={size}>
          <FieldLabel>Search, {size}</FieldLabel>
          <Input size={size} type="search" placeholder="Search households" />
        </Field>
      ))}
    </FieldGroup>
  ),
  tags: ["agent"],
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("searchbox", { name: "Search, md" }), "Larkspur");
    await expect(canvas.getByRole("searchbox", { name: "Search, md" })).toHaveValue("Larkspur");
    const heights = canvas.getAllByRole("searchbox").map((el) => el.getBoundingClientRect().height);
    await expect(heights).toEqual([24, 28, 32, 40]);
  },
};

/**
 * An empty field beside a filled one. The line under each pair is measured from the rendered field in the current
 * theme; the play function fails if the placeholder drops under 4.5:1 or is no longer clearly lighter than typed text.
 */
export const EmptyBesideFilled: Story = {
  render: () => (
    <ContrastReadout>
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel>Subject</FieldLabel>
          <Input placeholder="A few words about the problem" />
        </Field>
        <Field>
          <FieldLabel>Subject, filled in</FieldLabel>
          <Input defaultValue="Gate latch won't catch" />
        </Field>
        <Field>
          <FieldLabel>Street</FieldLabel>
          <Input placeholder="Where it is" />
        </Field>
        <Field>
          <FieldLabel>Street, filled in</FieldLabel>
          <Input defaultValue="Maple Court" />
        </Field>
      </FieldGroup>
    </ContrastReadout>
  ),
  play: async ({ canvas }) => {
    const empty = canvas.getByRole("textbox", { name: "Subject" });
    // The name comes from the visible label, never from the placeholder.
    await expect(empty).toHaveAccessibleName("Subject");
    await expect(canvas.getByRole("textbox", { name: "Street" })).toHaveAccessibleName("Street");
    await expect(empty).toHaveValue("");
    await expect(canvas.getByRole("textbox", { name: "Subject, filled in" })).toHaveValue("Gate latch won't catch");

    const { typed, placeholder } = measureFieldContrast(empty as HTMLInputElement);
    await expect(placeholder).toBeGreaterThanOrEqual(PLACEHOLDER_MIN_CONTRAST);
    await expect(placeholder).toBeLessThanOrEqual(typed * PLACEHOLDER_MAX_SHARE_OF_TYPED);
    await expect(canvas.getByTestId("contrast-readout")).toHaveTextContent(`placeholder ${placeholder}:1`);
  },
};

/**
 * The placeholder in other states. Focused and empty, it stays until the first keystroke. Invalid, it keeps its hint
 * colour and the error says what's wrong. Disabled, it dims with the field (WCAG exempts disabled controls) and still
 * reads as empty.
 */
export const PlaceholderStates: Story = {
  render: () => (
    <FieldGroup className="gap-3">
      <Field>
        <FieldLabel>Focused, empty</FieldLabel>
        <Input placeholder="A few words about the problem" />
      </Field>
      <Field invalid>
        <FieldLabel>Invalid, empty</FieldLabel>
        <Input placeholder="A few words about the problem" />
        <FieldError>Add a subject before sending.</FieldError>
      </Field>
      <Field disabled>
        <FieldLabel>Disabled, empty</FieldLabel>
        <Input placeholder="A few words about the problem" />
      </Field>
    </FieldGroup>
  ),
  play: async ({ canvas }) => {
    const focused = canvas.getByRole("textbox", { name: "Focused, empty" });
    await userEvent.click(focused);
    await expect(focused).toHaveFocus();
    await expect(focused.matches(":placeholder-shown")).toBe(true);
    await userEvent.keyboard("G");
    await expect(focused.matches(":placeholder-shown")).toBe(false);
    await userEvent.clear(focused);
    await expect(focused.matches(":placeholder-shown")).toBe(true);
    await expect(canvas.getByRole("textbox", { name: "Invalid, empty" })).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByRole("textbox", { name: "Disabled, empty" })).toBeDisabled();
  },
};

/** A placeholder that looks like a value makes an empty field look filled in. Say what to type in the description. */
export const PlaceholderDoAndDont: Story = {
  parameters: { wide: true },
  render: () => (
    <DoDont
      doCaption="Leave the field empty and put the hint in the description, which stays when they type."
      dontCaption={'"0.00" reads as an amount already entered, so the field looks done.'}
      good={
        <Field className="w-full max-w-xs">
          <FieldLabel>Annual assessment</FieldLabel>
          <Input inputMode="decimal" />
          <FieldDescription>Enter 0 for exempt households.</FieldDescription>
        </Field>
      }
      bad={
        <Field className="w-full max-w-xs">
          <FieldLabel>Assessment amount</FieldLabel>
          <Input inputMode="decimal" placeholder="0.00" />
        </Field>
      }
    />
  ),
  play: async ({ canvas }) => {
    const good = canvas.getByRole("textbox", { name: "Annual assessment" });
    await expect(good).toHaveAccessibleDescription("Enter 0 for exempt households.");
    await expect(good).not.toHaveAttribute("placeholder");
    await expect(good).toHaveValue("");
    // The bad example's "0.00" is only a placeholder: the field is empty, though it looks filled in.
    await expect(canvas.getByRole("textbox", { name: "Assessment amount" })).toHaveValue("");
  },
};
