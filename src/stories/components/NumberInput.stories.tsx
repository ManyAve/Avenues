import type { Meta, StoryObj } from "@storybook/react-vite";
import { createAgent } from "@ui-sdk/react/agent";
import { useState, type ReactNode } from "react";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Field, FieldDescription, FieldLabel } from "#avenue/components/field";
import {
  NumberInput,
  NumberInputBound,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
} from "#avenue/components/number-input";
import { listenForAnnouncements } from "./announce-kit";

// AVE-204. A small count, typed or stepped: guests at the spring picnic, copies of a mailed notice. All data is
// fictional.

const guests = { one: "guest", other: "guests" };

/** A form that shows what it posted, so a story can prove the field submits its plain number. */
function PostingForm({ children }: { children: ReactNode }) {
  const [posted, setPosted] = useState<string | null>(null);
  return (
    <form
      className="grid w-72 gap-group"
      onSubmit={(event) => {
        event.preventDefault();
        setPosted(new URLSearchParams(new FormData(event.currentTarget) as unknown as Record<string, string>).toString());
      }}
    >
      {children}
      <div className="flex gap-controls">
        <Button type="submit">Save</Button>
        <Button type="reset" variant="outline">
          Reset
        </Button>
      </div>
      <output data-testid="posted" className="text-meta text-muted-foreground">
        {posted === null ? "Nothing posted" : `Posted ${posted}`}
      </output>
    </form>
  );
}

const meta = {
  title: "Components/Number input",
  component: NumberInput,
  parameters: { layout: "padded" },
  args: { locale: "en-US", noun: guests, min: 1, max: 10, defaultValue: 2, onValueChange: fn(), onValueCommit: fn() },
  render: (args) => (
    <Field name="guests" className="w-72">
      <FieldLabel>Guests</FieldLabel>
      <NumberInput {...args} />
      <FieldDescription>Including you. The picnic has room for 10 per household.</FieldDescription>
    </Field>
  ),
} satisfies Meta<typeof NumberInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** At the maximum the plus button is off, and the line under the row says why; the button is described by it. */
export const AtTheMaximum: Story = {
  name: "At the maximum",
  args: { defaultValue: 10 },
  play: async ({ canvas }) => {
    const increase = canvas.getByRole("button", { name: "Increase guests" });
    await expect(increase).toBeDisabled();
    await expect(increase).toHaveAccessibleDescription("At most 10 guests");
    await expect(canvas.getByRole("button", { name: "Decrease guests" })).toBeEnabled();
  },
};

/** At the minimum the minus button is off: "At least 1 guest", in the singular. */
export const AtTheMinimum: Story = {
  name: "At the minimum",
  args: { defaultValue: 1 },
  play: async ({ canvas }) => {
    const decrease = canvas.getByRole("button", { name: "Decrease guests" });
    await expect(decrease).toBeDisabled();
    await expect(decrease).toHaveAccessibleDescription("At least 1 guest");
  },
};

/** Steps of 2 from 1 never land on 10, so 9 is as high as it goes, and the line says so. */
export const StepsMissTheMaximum: Story = {
  name: "Steps that miss the maximum",
  args: { step: 2, defaultValue: 9 },
  play: async ({ canvas }) => {
    const increase = canvas.getByRole("button", { name: "Increase guests" });
    await expect(increase).toBeDisabled();
    await expect(increase).toHaveAccessibleDescription("At most 9 guests");
  },
};

export const Small: Story = {
  name: "Small (sm)",
  args: { size: "sm" },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Invalid: Story = {
  args: { invalid: true },
};

/**
 * Keyboard only. Tab lands on the field (the buttons are out of the tab order: the arrows do the same); ArrowUp and
 * Page Up step, typing 12 and Enter clamps to the maximum, Home goes to the minimum. Each button, focused and pressed
 * with Enter, steps once.
 */
export const Keyboard: Story = {
  play: async ({ args, canvas, step }) => {
    const field = canvas.getByRole("textbox", { name: "Guests" });
    const increase = canvas.getByRole("button", { name: "Increase guests" });
    const decrease = canvas.getByRole("button", { name: "Decrease guests" });

    await step("Tab lands on the field, and ArrowUp steps it", async () => {
      await userEvent.tab();
      await expect(field).toHaveFocus();
      await userEvent.keyboard("{ArrowUp}");
      await expect(field).toHaveValue("3");
      await expect(args.onValueChange).toHaveBeenLastCalledWith(3, expect.objectContaining({ reason: "step-key" }));
    });

    await step("Typing 12 and Enter clamps to 10, and the bound line says why", async () => {
      await userEvent.keyboard("{Control>}a{/Control}12{Enter}");
      await expect(field).toHaveValue("10");
      await expect(canvas.getByText("At most 10 guests")).toBeVisible();
      await expect(increase).toBeDisabled();
    });

    await step("Home goes to the minimum, and End back to the maximum", async () => {
      await userEvent.keyboard("{Home}");
      await expect(field).toHaveValue("1");
      await expect(canvas.getByText("At least 1 guest")).toBeVisible();
      await userEvent.keyboard("{End}");
      await expect(field).toHaveValue("10");
    });

    await step("Each button, pressed with Enter, steps once", async () => {
      decrease.focus();
      await userEvent.keyboard("{Enter}");
      await expect(field).toHaveValue("9");
      await expect(canvas.queryByText("At most 10 guests")).toBeNull();
      increase.focus();
      await userEvent.keyboard("{Enter}");
      await expect(field).toHaveValue("10");
    });
  },
};

/**
 * Holding plus repeats after a pause, and a screen reader hears the count once, when the button is let go, not each
 * step. A quick press steps once.
 */
export const HoldToRepeat: Story = {
  name: "Hold to repeat",
  args: { max: 50 },
  play: async ({ args, canvas, step }) => {
    const field = canvas.getByRole("textbox", { name: "Guests" });
    const increase = canvas.getByRole("button", { name: "Increase guests" });

    await step("A quick press steps once and is heard once", async () => {
      const announcements = listenForAnnouncements();
      await userEvent.click(increase);
      await expect(field).toHaveValue("3");
      await waitFor(() => expect(announcements.heard).toEqual(["3 guests"]));
      announcements.stop();
    });

    await step("Held, it steps once, waits, then repeats; it commits and is heard once on release", async () => {
      const announcements = listenForAnnouncements();
      // Dispatched by hand: user-event's release carries no pointerId, so ui-sdk's hold never sees the press end.
      const press = { bubbles: true, cancelable: true, composed: true, pointerId: 1, pointerType: "mouse", isPrimary: true };
      const steps: number[] = [];
      args.onValueChange?.mockImplementation(() => steps.push(performance.now()));
      increase.dispatchEvent(new PointerEvent("pointerdown", { ...press, button: 0, buttons: 1 }));
      await expect(field).toHaveValue("4");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      increase.dispatchEvent(new PointerEvent("pointerup", { ...press, button: 0, buttons: 0 }));
      const held = Number((field as HTMLInputElement).value);
      await expect(held).toBeGreaterThan(5);
      // ui-sdk waits 400ms before the first repeat, then steps faster than that.
      await expect(steps[1]! - steps[0]!).toBeGreaterThanOrEqual(350);
      await expect(steps[2]! - steps[1]!).toBeLessThan(350);
      await waitFor(() =>
        expect(args.onValueCommit).toHaveBeenLastCalledWith(held, expect.objectContaining({ reason: "increment-press" })),
      );
      await waitFor(() => expect(announcements.heard).toEqual([`${held} guests`]));
      announcements.stop();
    });
  },
};

/** Two steppers on one screen are told apart by what they count. */
export const TwoCounts: Story = {
  name: "Two counts",
  render: () => (
    <div className="grid w-72 gap-group">
      <Field name="adults">
        <FieldLabel>Adults</FieldLabel>
        <NumberInput locale="en-US" noun={{ one: "adult", other: "adults" }} min={1} max={6} defaultValue={2} />
      </Field>
      <Field name="children">
        <FieldLabel>Children</FieldLabel>
        <NumberInput locale="en-US" noun={{ one: "child", other: "children" }} min={0} max={6} defaultValue={0} />
      </Field>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Increase adults" })).toBeEnabled();
    await expect(canvas.getByRole("button", { name: "Decrease children" })).toHaveAccessibleDescription(
      "At least 0 children",
    );
  },
};

/** Built from parts: the same row, with the bound line in the app's own words. */
export const FromParts: Story = {
  name: "From parts",
  render: () => (
    <Field name="copies" className="w-72">
      <FieldLabel>Copies to mail</FieldLabel>
      <NumberInput locale="en-US" noun={{ one: "copy", other: "copies" }} min={1} max={5} defaultValue={5}>
        <NumberInputGroup>
          <NumberInputDecrement />
          <NumberInputControl />
          <NumberInputIncrement />
        </NumberInputGroup>
        <NumberInputBound>{(bound) => (bound === "max" ? "Five copies per notice." : "At least one copy.")}</NumberInputBound>
      </NumberInput>
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Increase copies" })).toHaveAccessibleDescription(
      "Five copies per notice.",
    );
  },
};

/** In a form, keyboard only: the plain number posts under the Field's name, and Reset returns to the default. */
export const InAForm: Story = {
  name: "In a form",
  render: () => (
    <PostingForm>
      <Field name="guests">
        <FieldLabel>Guests</FieldLabel>
        <NumberInput locale="en-US" noun={guests} min={1} max={10} defaultValue={2} />
      </Field>
    </PostingForm>
  ),
  play: async ({ canvas, step }) => {
    const field = canvas.getByRole("textbox", { name: "Guests" });

    await step("ArrowUp twice and Enter posts guests=4", async () => {
      await userEvent.tab();
      await userEvent.keyboard("{ArrowUp}{ArrowUp}");
      canvas.getByRole("button", { name: "Save" }).focus();
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(canvas.getByTestId("posted")).toHaveTextContent("Posted guests=4"));
    });

    await step("Reset goes back to 2", async () => {
      canvas.getByRole("button", { name: "Reset" }).focus();
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(field).toHaveValue("2"));
    });
  },
};

/** An agent finds the field by its label and sets the count; the form posts it, by keyboard. */
export const Agent: Story = {
  tags: ["agent"],
  render: () => (
    <PostingForm>
      <Field name="guests">
        <FieldLabel>Guests</FieldLabel>
        <NumberInput locale="en-US" noun={guests} min={1} max={10} defaultValue={2} />
      </Field>
    </PostingForm>
  ),
  play: async ({ canvas }) => {
    const agent = createAgent();
    const inputs = agent.snapshot().filter((entry) => !entry.offPage && entry.component === "number-input");
    await expect(inputs.map((entry) => entry.label)).toEqual(["Guests"]);
    const result = await agent.act({ steps: [{ ref: inputs[0]!.ref, action: "setValue", args: [6] }] });
    await expect(result.ok, result.error?.message).toBe(true);
    await expect(canvas.getByRole("textbox", { name: "Guests" })).toHaveValue("6");
    canvas.getByRole("button", { name: "Save" }).focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.getByTestId("posted")).toHaveTextContent("Posted guests=6"));
  },
};
