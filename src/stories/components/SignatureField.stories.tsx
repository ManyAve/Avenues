import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Field, FieldDescription, FieldLabel } from "#avenue/components/field";
import {
  SignatureField,
  SignatureFieldClear,
  SignatureFieldInput,
  SignatureFieldModes,
  SignatureFieldPad,
  type SignatureValue,
} from "#avenue/components/signature-field";

// AVE-220: a vendor signs a work agreement, drawn or typed. All names are fictional.

const meta = {
  title: "Components/Signature field",
  component: SignatureField,
  decorators: [(Story) => <div className="max-w-md p-inset">{Story()}</div>],
} satisfies Meta<typeof SignatureField>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The signature as a vendor sees it: Draw or Type, the pad or the name, and Clear, with the value shown below. */
function Signing({ defaultMode, disabled }: { defaultMode: "draw" | "type"; disabled?: boolean }) {
  const [value, setValue] = useState<SignatureValue | null>(null);
  return (
    <div className="flex flex-col gap-group">
      <Field disabled={disabled}>
        <FieldLabel>Signature</FieldLabel>
        <SignatureField defaultMode={defaultMode} onValueChange={setValue} disabled={disabled}>
          <div className="flex items-center justify-between gap-controls">
            <SignatureFieldModes />
            <SignatureFieldClear />
          </div>
          <SignatureFieldPad label="Your signature" />
          <SignatureFieldInput />
        </SignatureField>
        <FieldDescription>Sign as you would on paper.</FieldDescription>
      </Field>
      <output data-testid="value" className="text-meta text-muted-foreground">
        {value ? `${value.method}${value.text ? `: ${value.text}` : ""}` : "empty"}
      </output>
    </div>
  );
}

function stroke(canvas: Element) {
  const box = canvas.getBoundingClientRect();
  const at = (x: number, y: number) => ({
    clientX: box.left + x,
    clientY: box.top + y,
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    bubbles: true,
  });
  canvas.dispatchEvent(new PointerEvent("pointerdown", at(20, 60)));
  for (let x = 30; x <= 200; x += 10) canvas.dispatchEvent(new PointerEvent("pointermove", at(x, 60 + Math.sin(x / 12) * 20)));
  canvas.dispatchEvent(new PointerEvent("pointerup", at(200, 60)));
}

/** Drawing with the pointer makes a drawn signature; Clear empties it again. */
export const Drawn: Story = {
  render: () => <Signing defaultMode="draw" />,
  play: async ({ canvas, canvasElement }) => {
    expect(canvas.getByText("Your signature, empty")).toBeInTheDocument();
    const pad = canvasElement.querySelector("[data-slot=signature-field-canvas]")!;
    stroke(pad);
    await waitFor(() => expect(canvas.getByTestId("value")).toHaveTextContent("drawn"));
    expect(canvas.getByText("Your signature, drawn")).toBeInTheDocument();
    const clear = canvas.getByRole("button", { name: "Clear" });
    clear.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.getByTestId("value")).toHaveTextContent("empty"));
    expect(clear).toBeDisabled();
  },
};

/** Type is the keyboard path: choose Type with the arrow keys, type a name, and the preview shows it in script. */
export const Typed: Story = {
  tags: ["agent"],
  render: () => <Signing defaultMode="draw" />,
  play: async ({ canvas }) => {
    const draw = canvas.getByRole("radio", { name: "Draw" });
    draw.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(canvas.getByRole("radio", { name: "Type" })).toBeChecked();
    const name = canvas.getByRole("textbox", { name: "Signature" });
    await userEvent.click(name);
    await userEvent.keyboard("Dana Rivera");
    await waitFor(() => expect(canvas.getByTestId("value")).toHaveTextContent("typed: Dana Rivera"));
  },
};

/** In a form, Sign stays off until there is a signature. */
export const InAForm: Story = {
  render: function Render() {
    const [value, setValue] = useState<SignatureValue | null>(null);
    return (
      <form className="flex flex-col gap-group" onSubmit={(event) => event.preventDefault()}>
        <Field>
          <FieldLabel>Signature</FieldLabel>
          <SignatureField defaultMode="type" onValueChange={setValue}>
            <SignatureFieldModes />
            <SignatureFieldPad label="Your signature" />
            <SignatureFieldInput />
          </SignatureField>
        </Field>
        <Button type="submit" disabled={value === null}>
          Sign agreement
        </Button>
      </form>
    );
  },
  play: async ({ canvas }) => {
    const sign = canvas.getByRole("button", { name: "Sign agreement" });
    expect(sign).toBeDisabled();
    await userEvent.click(canvas.getByRole("textbox", { name: "Signature" }));
    await userEvent.keyboard("Dana Rivera");
    await waitFor(() => expect(sign).toBeEnabled());
  },
};

/** Disabled: every part is off, and drawing does nothing. */
export const Disabled: Story = {
  render: () => <Signing defaultMode="draw" disabled />,
  play: async ({ canvas, canvasElement }) => {
    stroke(canvasElement.querySelector("[data-slot=signature-field-canvas]")!);
    expect(canvas.getByTestId("value")).toHaveTextContent("empty");
    expect(canvas.getByRole("button", { name: "Clear" })).toBeDisabled();
  },
};
