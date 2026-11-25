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

/**
 * Controlled: a saved typed signature shows its name, Start over (outside the field) empties the input, and an
 * `onValueChange` that refuses Clear leaves the signature showing.
 */
export const Controlled: Story = {
  render: function Render() {
    const [value, setValue] = useState<SignatureValue | null>({ method: "typed", text: "Dana Rivera", image: "" });
    const [locked, setLocked] = useState(false);
    return (
      <div className="flex flex-col gap-group">
        <Field>
          <FieldLabel>Signature</FieldLabel>
          <SignatureField
            defaultMode="type"
            value={value}
            onValueChange={(next, details) => {
              if (locked && details.reason === "clear") details.cancel();
              else setValue(next);
            }}
          >
            <SignatureFieldClear />
            <SignatureFieldInput />
          </SignatureField>
        </Field>
        <div className="flex gap-controls">
          <Button variant="outline" onClick={() => setValue(null)}>
            Start over
          </Button>
          <Button variant="outline" onClick={() => setLocked(true)}>
            Keep the signature
          </Button>
        </div>
      </div>
    );
  },
  play: async ({ canvas }) => {
    const name = canvas.getByRole("textbox", { name: "Signature" });
    await expect(name).toHaveValue("Dana Rivera");
    await userEvent.click(canvas.getByRole("button", { name: "Start over" }));
    await waitFor(() => expect(name).toHaveValue(""));
    await userEvent.click(name);
    await userEvent.keyboard("Sam Ortiz");
    await waitFor(() => expect(name).toHaveValue("Sam Ortiz"));
    await userEvent.click(canvas.getByRole("button", { name: "Keep the signature" }));
    await userEvent.click(canvas.getByRole("button", { name: "Clear" }));
    await expect(name).toHaveValue("Sam Ortiz");
  },
};

/** A second finger while the first draws is ignored: one stroke, from the first finger only. */
export const SecondFinger: Story = {
  render: () => <Signing defaultMode="draw" />,
  play: async ({ canvas, canvasElement }) => {
    const pad = canvasElement.querySelector("[data-slot=signature-field-canvas]")!;
    const box = pad.getBoundingClientRect();
    const at = (pointerId: number, x: number) => ({
      clientX: box.left + x,
      clientY: box.top + 60,
      pointerId,
      pointerType: "touch",
      bubbles: true,
    });
    pad.dispatchEvent(new PointerEvent("pointerdown", at(1, 20)));
    pad.dispatchEvent(new PointerEvent("pointerdown", at(2, 200)));
    pad.dispatchEvent(new PointerEvent("pointerup", at(2, 200)));
    expect(canvas.getByTestId("value")).toHaveTextContent("empty");
    pad.dispatchEvent(new PointerEvent("pointermove", at(1, 60)));
    pad.dispatchEvent(new PointerEvent("pointerup", at(1, 60)));
    await waitFor(() => expect(canvas.getByTestId("value")).toHaveTextContent("drawn"));
  },
};

/** A one-pixel ink PNG, standing in for a signature the app saved earlier. */
const SAVED = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

/** A saved signature from outside replaces what was drawn: the pad shows it, and the old strokes are gone. */
export const ReplacedFromOutside: Story = {
  render: function Render() {
    const [value, setValue] = useState<SignatureValue | null>(null);
    return (
      <div className="flex flex-col gap-group">
        <Field>
          <FieldLabel>Signature</FieldLabel>
          <SignatureField defaultMode="draw" value={value} onValueChange={setValue}>
            <SignatureFieldPad label="Your signature" />
          </SignatureField>
        </Field>
        <Button variant="outline" onClick={() => setValue({ method: "drawn", image: SAVED })}>
          Use my saved signature
        </Button>
      </div>
    );
  },
  play: async ({ canvas, canvasElement }) => {
    const pad = canvasElement.querySelector("[data-slot=signature-field-canvas]")!;
    stroke(pad);
    await waitFor(() => expect(canvas.getByText("Your signature, drawn")).toBeInTheDocument());
    await expect(canvasElement.querySelector("img")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Use my saved signature" }));
    await waitFor(() => expect(canvasElement.querySelector("img")).toHaveAttribute("src", SAVED));
    await expect(canvas.getByText("Your signature, empty")).toBeInTheDocument();
  },
};

/** When the app refuses to clear a signature, switching between Draw and Type leaves both the mode and the name. */
export const ModeSwitchRefused: Story = {
  render: function Render() {
    const [value, setValue] = useState<SignatureValue | null>({ method: "typed", text: "Dana Rivera", image: "" });
    return (
      <Field>
        <FieldLabel>Signature</FieldLabel>
        <SignatureField
          defaultMode="type"
          value={value}
          onValueChange={(next, details) => {
            if (details.reason === "mode") details.cancel();
            else setValue(next);
          }}
        >
          <SignatureFieldModes />
          <SignatureFieldPad label="Your signature" />
          <SignatureFieldInput />
        </SignatureField>
      </Field>
    );
  },
  play: async ({ canvas, canvasElement }) => {
    const field = canvasElement.querySelector("[data-slot=signature-field]")!;
    const draw = canvas.getByRole("radio", { name: "Draw" });
    draw.focus();
    await userEvent.keyboard(" ");
    await expect(field).toHaveAttribute("data-mode", "type");
    await expect(canvas.getByRole("radio", { name: "Type" })).toBeChecked();
    await expect(canvas.getByRole("textbox", { name: "Signature" })).toHaveValue("Dana Rivera");
  },
};
