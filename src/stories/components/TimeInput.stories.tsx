import type { Meta, StoryObj } from "@storybook/react-vite";
import { createAgent } from "@ui-sdk/react/agent";
import { useState, type ReactNode } from "react";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Field, FieldDescription, FieldLabel } from "#avenue/components/field";
import { TimeInput, TimeInputError } from "#avenue/components/time-input";

// AVE-202. A time of day, typed one part at a time: when a board meeting starts, when the pool closes. All data is
// fictional.

/** A form that shows what it posted, so a story can prove the field submits its 24-hour value. */
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
      </div>
      <output data-testid="posted" className="text-meta text-muted-foreground">
        {posted === null ? "Nothing posted" : `Posted ${posted}`}
      </output>
    </form>
  );
}

const meta = {
  title: "Components/Time input",
  component: TimeInput,
  parameters: { layout: "padded" },
  args: { locale: "en-US", native: "never", onValueChange: fn() },
  render: (args) => (
    <Field name="starts" className="w-72">
      <FieldLabel>Meeting starts</FieldLabel>
      <TimeInput {...args} />
      <FieldDescription>In the association's time zone.</FieldDescription>
    </Field>
  ),
} satisfies Meta<typeof TimeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  name: "A time typed",
  args: { defaultValue: "19:00" },
};

export const TwentyFourHour: Story = {
  name: "24-hour clock",
  args: { defaultValue: "19:00", hourCycle: 24 },
};

export const Disabled: Story = {
  args: { defaultValue: "19:00", disabled: true },
};

/**
 * Keyboard only, on a 12-hour clock: digits fill the hour and minute, P chooses PM, the value is 24-hour. ArrowDown
 * steps the minute.
 */
export const Keyboard: Story = {
  play: async ({ args, canvas, step }) => {
    const hour = canvas.getByRole("spinbutton", { name: "hour" });
    const minute = canvas.getByRole("spinbutton", { name: "minute" });
    const period = canvas.getByRole("spinbutton", { name: "AM/PM" });

    await step("Tab lands on the hour; 7, 30 and P fill the time", async () => {
      await userEvent.tab();
      await expect(hour).toHaveFocus();
      await userEvent.keyboard("730");
      await expect(period).toHaveFocus();
      await userEvent.keyboard("p");
      await expect(hour).toHaveAttribute("aria-valuetext", "07");
      await expect(minute).toHaveAttribute("aria-valuetext", "30");
      await expect(args.onValueChange).toHaveBeenLastCalledWith("19:30", expect.objectContaining({ reason: "input-change" }));
    });

    await step("Shift+Tab to the minute, and ArrowDown steps it", async () => {
      await userEvent.tab({ shift: true });
      await expect(minute).toHaveFocus();
      await userEvent.keyboard("{ArrowDown}");
      await expect(args.onValueChange).toHaveBeenLastCalledWith("19:29", expect.objectContaining({ reason: "step-key" }));
    });
  },
};

/**
 * In a form, keyboard only. A partly typed time shows "Enter a time like 02:30 PM" on the locale's clock and stops the
 * submit; the whole time posts in 24-hour form.
 */
export const InAForm: Story = {
  name: "In a form",
  render: () => (
    <PostingForm>
      <Field name="starts">
        <FieldLabel>Meeting starts</FieldLabel>
        <TimeInput locale="en-US" native="never" required />
        <TimeInputError locale="en-US" missing="Enter when the meeting starts." />
      </Field>
    </PostingForm>
  ),
  play: async ({ canvas, step }) => {
    const save = canvas.getByRole("button", { name: "Save" });

    await step("A partly typed time: the error shows an example on the locale's clock", async () => {
      await userEvent.tab();
      await userEvent.keyboard("7");
      save.focus();
      await userEvent.keyboard("{Enter}");
      await expect(await canvas.findByText("Enter a time like 02:30 PM")).toBeVisible();
      await expect(canvas.getByTestId("posted")).toHaveTextContent("Nothing posted");
    });

    await step("The whole time posts in 24-hour form", async () => {
      canvas.getByRole("spinbutton", { name: "minute" }).focus();
      await userEvent.keyboard("00p{Enter}");
      await waitFor(() => expect(canvas.getByTestId("posted")).toHaveTextContent("Posted starts=19%3A00"));
    });
  },
};

/** The phone's own time picker (`native`, "auto" by default): a time input in the same field look. */
export const NativeOnPhones: Story = {
  name: "Native picker (phones)",
  render: () => (
    <PostingForm>
      <Field name="starts">
        <FieldLabel>Meeting starts (OS picker)</FieldLabel>
        <TimeInput native="always" defaultValue="19:00" />
      </Field>
    </PostingForm>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Meeting starts (OS picker)")).toHaveAttribute("type", "time");
    canvas.getByRole("button", { name: "Save" }).focus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByTestId("posted")).toHaveTextContent("Posted starts=19%3A00");
  },
};

/** An agent finds the field by its label and sets the time; the form posts it, by keyboard. */
export const Agent: Story = {
  tags: ["agent"],
  render: () => (
    <PostingForm>
      <Field name="starts">
        <FieldLabel>Meeting starts</FieldLabel>
        <TimeInput locale="en-US" native="never" />
      </Field>
    </PostingForm>
  ),
  play: async ({ canvas }) => {
    const agent = createAgent();
    const inputs = agent.snapshot().filter((entry) => !entry.offPage && entry.component === "time-input");
    await expect(inputs.map((entry) => entry.label)).toEqual(["Meeting starts"]);
    const result = await agent.act({ steps: [{ ref: inputs[0]!.ref, action: "setValue", args: ["18:45"] }] });
    await expect(result.ok, result.error?.message).toBe(true);
    await expect(canvas.getByRole("spinbutton", { name: "minute" })).toHaveAttribute("aria-valuetext", "45");
    canvas.getByRole("spinbutton", { name: "hour" }).focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.getByTestId("posted")).toHaveTextContent("Posted starts=18%3A45"));
  },
};
