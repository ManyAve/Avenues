import type { Meta, StoryObj } from "@storybook/react-vite";
import { createAgent } from "@ui-sdk/react/agent";
import { useState, type ReactNode } from "react";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import { DateInput, DateInputError } from "#avenue/components/date-input";
import { Field, FieldDescription, FieldLabel } from "#avenue/components/field";
import { cn } from "#avenue/lib/utils";

// AVE-202. A date people know by heart, typed one part at a time: a move-in date, a birthday, a closing date. All data
// is fictional.

const phone = { viewport: { value: "phone", isRotated: false } };
const coarse = () => matchMedia("(pointer: coarse)").matches;

/** A form that shows what it posted, so a story can prove the field submits its ISO value. */
function PostingForm({ children, className }: { children: ReactNode; className?: string }) {
  const [posted, setPosted] = useState<string | null>(null);
  return (
    <form
      className={cn("grid w-72 gap-group", className)}
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
  title: "Components/Date input",
  component: DateInput,
  parameters: { layout: "padded" },
  args: { locale: "en-US", native: "never", onValueChange: fn() },
  render: (args) => (
    <Field name="moved" className="w-72">
      <FieldLabel>Move-in date</FieldLabel>
      <DateInput {...args} />
      <FieldDescription>The day the household took the keys.</FieldDescription>
    </Field>
  ),
} satisfies Meta<typeof DateInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  name: "A date typed",
  args: { defaultValue: "2026-11-21" },
};

export const Disabled: Story = {
  args: { defaultValue: "2026-11-21", disabled: true },
};

export const Small: Story = {
  name: "Small (in a card header)",
  args: { defaultValue: "2026-11-21", size: "sm" },
};

export const DateAndTime: Story = {
  name: "With a time",
  args: { defaultValue: "2026-11-21T14:30", granularity: "minute" },
};

/**
 * Keyboard only. The Field's label names the group and each segment says its part and its value ("month", "11").
 * Digits fill a segment and move on, the arrows step it, Backspace empties it and moves back.
 */
export const Keyboard: Story = {
  play: async ({ args, canvas, step }) => {
    const group = canvas.getByRole("group", { name: "Move-in date" });
    const month = canvas.getByRole("spinbutton", { name: "month" });
    const day = canvas.getByRole("spinbutton", { name: "day" });
    const year = canvas.getByRole("spinbutton", { name: "year" });

    await step("Tab lands on the month, the first part in American order", async () => {
      await expect(group).toContainElement(month);
      await userEvent.tab();
      await expect(month).toHaveFocus();
      await expect(month).toHaveAttribute("aria-valuetext", "Empty");
    });

    await step("Typing fills each part and moves on, then reports the whole date once", async () => {
      await userEvent.keyboard("11212026");
      await expect(year).toHaveFocus();
      await expect(month).toHaveAttribute("aria-valuetext", "11");
      await expect(day).toHaveAttribute("aria-valuetext", "21");
      await expect(args.onValueChange).toHaveBeenLastCalledWith("2026-11-21", expect.objectContaining({ reason: "input-change" }));
    });

    await step("Shift+Tab goes back to the day, and ArrowUp steps it", async () => {
      await userEvent.tab({ shift: true });
      await expect(day).toHaveFocus();
      await userEvent.keyboard("{ArrowUp}");
      await expect(args.onValueChange).toHaveBeenLastCalledWith("2026-11-22", expect.objectContaining({ reason: "step-key" }));
    });

    await step("Backspace empties the day, and the value goes back to null", async () => {
      await userEvent.keyboard("{Backspace}{Backspace}");
      await expect(day).toHaveAttribute("aria-valuetext", "Empty");
      await expect(args.onValueChange).toHaveBeenLastCalledWith(null, expect.anything());
    });
  },
};

/** A pasted date fills every part, whichever segment has focus. */
export const Paste: Story = {
  name: "Paste a date",
  play: async ({ args, canvas }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("spinbutton", { name: "month" })).toHaveFocus();
    await userEvent.paste("2026-12-04");
    await expect(args.onValueChange).toHaveBeenLastCalledWith("2026-12-04", expect.anything());
    await expect(canvas.getByRole("spinbutton", { name: "day" })).toHaveAttribute("aria-valuetext", "04");
  },
};

/** The same date in three locales: each orders its parts its own way. */
export const Locales: Story = {
  name: "Each locale's order",
  render: () => (
    <div className="grid w-72 gap-group">
      {(["en-US", "en-GB", "ja-JP"] as const).map((locale) => (
        <Field key={locale} name={locale}>
          <FieldLabel>Move-in date ({locale})</FieldLabel>
          <DateInput locale={locale} native="never" defaultValue="2026-11-21" />
        </Field>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    const order = (locale: string) =>
      [...canvas.getByRole("group", { name: `Move-in date (${locale})` }).querySelectorAll("[role=spinbutton]")].map(
        (segment) => segment.getAttribute("data-type"),
      );
    await expect(order("en-US")).toEqual(["month", "day", "year"]);
    await expect(order("en-GB")).toEqual(["day", "month", "year"]);
    await expect(order("ja-JP")).toEqual(["year", "month", "day"]);
  },
};

/**
 * In a form, keyboard only. Save with nothing typed shows the required error; a partly typed date shows "Enter a
 * date like 31/12/2026" in the locale's order (British here) and stops the submit; the whole date posts as ISO.
 */
export const InAForm: Story = {
  name: "In a form",
  render: () => (
    <PostingForm>
      <Field name="moved">
        <FieldLabel>Move-in date</FieldLabel>
        <DateInput locale="en-GB" native="never" required />
        <DateInputError locale="en-GB" missing="Enter the move-in date." />
      </Field>
    </PostingForm>
  ),
  play: async ({ canvas, step }) => {
    const save = canvas.getByRole("button", { name: "Save" });
    const day = canvas.getByRole("spinbutton", { name: "day" });
    const year = new Date().getFullYear();

    await step("Save with nothing typed: the required error", async () => {
      save.focus();
      await userEvent.keyboard("{Enter}");
      await expect(await canvas.findByText("Enter the move-in date.")).toBeVisible();
      await expect(canvas.getByTestId("posted")).toHaveTextContent("Nothing posted");
    });

    await step("A partly typed date: the error asks for the locale's order", async () => {
      day.focus();
      await userEvent.keyboard("21");
      save.focus();
      await userEvent.keyboard("{Enter}");
      await expect(await canvas.findByText(`Enter a date like 31/12/${year}`)).toBeVisible();
      await expect(canvas.getByTestId("posted")).toHaveTextContent("Nothing posted");
    });

    await step("The whole date, day first, posts as ISO", async () => {
      canvas.getByRole("spinbutton", { name: "month" }).focus();
      await userEvent.keyboard("112026{Enter}");
      await waitFor(() => expect(canvas.getByTestId("posted")).toHaveTextContent("Posted moved=2026-11-21"));
      await expect(canvas.queryByText(`Enter a date like 31/12/${year}`)).toBeNull();
    });
  },
};

/**
 * On a 390px phone a date and time fills the row and nothing is cut off; it would wrap to a second line first. With
 * the segments on a phone (the OS picker is the default there) each is 44px square, so the field is 46px tall.
 */
export const OnAPhone: Story = {
  name: "On a phone",
  globals: phone,
  render: () => (
    <Field name="closing" className="w-full">
      <FieldLabel>Pool closes</FieldLabel>
      <DateInput locale="en-US" native="never" granularity="minute" defaultValue="2026-11-21T21:30" />
    </Field>
  ),
  play: async ({ canvas }) => {
    const group = canvas.getByRole("group", { name: "Pool closes" });
    await expect(group.scrollWidth).toBeLessThanOrEqual(group.clientWidth);
    for (const segment of group.querySelectorAll<HTMLInputElement>("[role=spinbutton]")) {
      await expect(segment.scrollWidth).toBeLessThanOrEqual(segment.clientWidth);
    }
    await expect(group.getBoundingClientRect().height).toBe(coarse() ? 46 : 32);
  },
};

/** The phone's own date picker (`native`, "auto" by default): a date input in the same field look. */
export const NativeOnPhones: Story = {
  name: "Native picker (phones)",
  render: () => (
    <PostingForm>
      <Field name="moved">
        <FieldLabel>Move-in date (OS picker)</FieldLabel>
        <DateInput native="always" defaultValue="2026-11-21" />
      </Field>
      <Field name="closing">
        <FieldLabel>Pool closes (OS picker)</FieldLabel>
        <DateInput native="always" granularity="minute" defaultValue="2026-11-21T21:30" />
      </Field>
    </PostingForm>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Move-in date (OS picker)")).toHaveAttribute("type", "date");
    await expect(canvas.getByLabelText("Pool closes (OS picker)")).toHaveAttribute("type", "datetime-local");
    canvas.getByRole("button", { name: "Save" }).focus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByTestId("posted")).toHaveTextContent("Posted moved=2026-11-21&closing=2026-11-21T21%3A30");
  },
};

/** An agent finds the field by its label and sets the date; the form posts it, by keyboard. */
export const Agent: Story = {
  tags: ["agent"],
  render: () => (
    <PostingForm>
      <Field name="moved">
        <FieldLabel>Move-in date</FieldLabel>
        <DateInput locale="en-US" native="never" />
      </Field>
    </PostingForm>
  ),
  play: async ({ canvas }) => {
    const agent = createAgent();
    const inputs = agent.snapshot().filter((entry) => !entry.offPage && entry.component === "date-input");
    await expect(inputs.map((entry) => entry.label)).toEqual(["Move-in date"]);
    const result = await agent.act({ steps: [{ ref: inputs[0]!.ref, action: "setValue", args: ["2026-08-01"] }] });
    await expect(result.ok, result.error?.message).toBe(true);
    await expect(canvas.getByRole("spinbutton", { name: "month" })).toHaveAttribute("aria-valuetext", "08");
    canvas.getByRole("spinbutton", { name: "year" }).focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(canvas.getByTestId("posted")).toHaveTextContent("Posted moved=2026-08-01"));
  },
};
