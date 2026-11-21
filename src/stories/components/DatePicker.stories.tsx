import type { Meta, StoryObj } from "@storybook/react-vite";
import { createAgent } from "@ui-sdk/react/agent";
import { useState, type ReactNode } from "react";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import { Button } from "#avenue/components/button";
import {
  CalendarDay,
  CalendarGrid,
  CalendarHeader,
  CalendarHeading,
  CalendarNext,
  CalendarPrevious,
  CalendarWeekday,
  CalendarWeekdays,
  CalendarWeeks,
} from "#avenue/components/calendar";
import {
  DatePicker,
  DatePickerClear,
  DatePickerContent,
  DatePickerError,
  DatePickerGroup,
  DatePickerHint,
  DatePickerInput,
  DatePickerPreset,
  DatePickerTrigger,
} from "#avenue/components/date-picker";
import { Field, FieldDescription, FieldLabel } from "#avenue/components/field";
import { cn } from "#avenue/lib/utils";
import { expectListSheet, waitForClosed } from "./sheet-kit";

// AVE-202. A due date, a meeting date, an assessment date: typed in the locale's order or picked from the calendar.
// Dates are fixed (today is 2026-11-12) so the stories render the same every day. All data is fictional.

const today = "2026-11-12";
const phone = { viewport: { value: "phone", isRotated: false } };
const coarse = () => matchMedia("(pointer: coarse)").matches;

/** A form that shows what it posted, so a story can prove the field submits its ISO date. */
function PostingForm({ children, className }: { children: ReactNode; className?: string }) {
  const [posted, setPosted] = useState<string | null>(null);
  return (
    <form
      noValidate={false}
      className={cn("grid w-72 gap-group", className)}
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

function DueDate({ locale = "en-US", ...props }: Partial<React.ComponentProps<typeof DatePicker>> & { locale?: string }) {
  return (
    <Field name="due">
      <FieldLabel>Due date</FieldLabel>
      <DatePicker today={today} locale={locale} native="never" {...(props as object)} />
      <FieldDescription>When the assessment is due.</FieldDescription>
      <DatePickerError locale={locale} missing="Choose a due date." />
    </Field>
  );
}

const meta = {
  title: "Components/Date picker",
  component: DatePicker,
  parameters: { layout: "padded" },
  args: { today, locale: "en-US", native: "never", onValueChange: fn() },
  render: (args) => (
    <Field name="due" className="w-72">
      <FieldLabel>Due date</FieldLabel>
      <DatePicker {...args} />
      <FieldDescription>When the assessment is due.</FieldDescription>
    </Field>
  ),
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  name: "A date chosen",
  args: { defaultValue: "2026-11-21" },
};

export const Disabled: Story = {
  args: { defaultValue: "2026-11-21", disabled: true },
};

export const Small: Story = {
  name: "Small (in a card header)",
  args: { defaultValue: "2026-11-21", size: "sm" },
};

/** The calendar open under the field, for the light and dark captures. */
export const Open: Story = {
  name: "Calendar open",
  args: { defaultValue: "2026-11-21" },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Choose due date/ }));
    await screen.findByRole("grid", { name: "November 2026" });
  },
};

/**
 * Keyboard only, in American order: type a date and Enter commits it; Alt+Down opens the calendar on that date; the
 * arrows move by day, Enter picks and focus returns to the calendar button; Escape closes without a change.
 */
export const Keyboard: Story = {
  play: async ({ args, canvas, step }) => {
    const input = canvas.getByRole("textbox", { name: "Due date" });

    await step("Tab into the field, type a date and press Enter", async () => {
      await userEvent.tab();
      await expect(input).toHaveFocus();
      await userEvent.keyboard("11/21/2026{Enter}");
      await expect(args.onValueChange).toHaveBeenLastCalledWith("2026-11-21", expect.objectContaining({ reason: "input-commit" }));
      await expect(input).toHaveValue("11/21/2026");
    });

    await step("Alt+Down opens the calendar on the typed date", async () => {
      await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
      const day = await screen.findByRole("gridcell", { name: /Saturday, November 21, 2026/ });
      await waitFor(() => expect(day).toHaveFocus());
    });

    await step("Right moves a day, Enter picks it, and focus goes back to the field it opened from", async () => {
      await userEvent.keyboard("{ArrowRight}{Enter}");
      await expect(args.onValueChange).toHaveBeenLastCalledWith("2026-11-22", expect.objectContaining({ reason: "item-press" }));
      await waitFor(() => expect(input).toHaveFocus());
      await expect(input).toHaveValue("11/22/2026");
    });

    await step("Enter on the calendar button opens it again, Escape closes it and keeps the date", async () => {
      await userEvent.tab();
      await expect(canvas.getByRole("button", { name: "Choose due date, Sunday, November 22, 2026" })).toHaveFocus();
      await userEvent.keyboard("{Enter}");
      await screen.findByRole("grid", { name: "November 2026" });
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("grid")).toBeNull());
      await expect(input).toHaveValue("11/22/2026");
    });
  },
};

/** A date pasted in any form people write it (ISO here) is read on Enter and shown in the locale's order. */
export const Paste: Story = {
  name: "Paste a date",
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Due date" });
    await userEvent.tab();
    await expect(input).toHaveFocus();
    await userEvent.paste("2026-12-04");
    await userEvent.keyboard("{Enter}");
    await expect(args.onValueChange).toHaveBeenLastCalledWith("2026-12-04", expect.anything());
    await expect(input).toHaveValue("12/04/2026");
  },
};

/** The same field in three locales: each reads and writes its own order, and the error asks for it. */
export const Locales: Story = {
  name: "Each locale's order",
  render: () => (
    <div className="grid w-72 gap-group">
      {(["en-US", "en-GB", "de-DE"] as const).map((locale) => (
        <Field key={locale} name={locale}>
          <FieldLabel>Due date ({locale})</FieldLabel>
          <DatePicker today={today} locale={locale} native="never" defaultValue="2026-11-21" />
        </Field>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Due date (en-US)" })).toHaveValue("11/21/2026");
    await expect(canvas.getByRole("textbox", { name: "Due date (en-GB)" })).toHaveValue("21/11/2026");
    await expect(canvas.getByRole("textbox", { name: "Due date (de-DE)" })).toHaveValue("21.11.2026");
  },
};

/**
 * In a form, keyboard only. Save with nothing chosen shows the required error; text that isn't a date shows "Enter a
 * date like 31/12/2026" in the locale's order (British here) and stops the submit; a date typed in that order posts
 * as ISO; Reset brings the field back empty.
 */
export const InAForm: Story = {
  name: "In a form",
  render: () => (
    <PostingForm>
      <DueDate locale="en-GB" required />
    </PostingForm>
  ),
  play: async ({ canvas, step }) => {
    const input = canvas.getByRole("textbox", { name: "Due date" });
    const save = canvas.getByRole("button", { name: "Save" });
    const year = new Date().getFullYear();

    await step("Save with nothing chosen: the required error, and nothing posts", async () => {
      await userEvent.tab();
      await userEvent.tab();
      await userEvent.tab();
      await expect(save).toHaveFocus();
      await userEvent.keyboard("{Enter}");
      await expect(await canvas.findByText("Choose a due date.")).toBeVisible();
      await expect(canvas.queryByText(/Enter a date like/)).toBeNull();
      await expect(canvas.getByTestId("posted")).toHaveTextContent("Nothing posted");
    });

    await step("Text that isn't a date: the error asks for the locale's order", async () => {
      input.focus();
      await userEvent.keyboard("next friday");
      await userEvent.tab();
      await userEvent.keyboard("{Enter}");
      const error = await canvas.findByText(`Enter a date like 31/12/${year}`);
      await expect(error).toBeVisible();
      await expect(input.getAttribute("aria-describedby")).toContain(error.id);
      await expect(canvas.queryByText("Choose a due date.")).toBeNull();
      await expect(canvas.getByTestId("posted")).toHaveTextContent("Nothing posted");
    });

    await step("A date in day-first order posts as ISO", async () => {
      input.focus();
      await userEvent.keyboard("{Control>}a{/Control}21/11/2026{Enter}");
      await waitFor(() => expect(canvas.getByTestId("posted")).toHaveTextContent("Posted due=2026-11-21"));
      await expect(canvas.queryByText(`Enter a date like 31/12/${year}`)).toBeNull();
    });

    await step("Reset empties it again", async () => {
      // On a touch screen, typing a date opens the calendar's sheet on its month; it has closed again by now.
      await waitForClosed("date-picker");
      await expect(input).toHaveFocus();
      await userEvent.tab();
      await userEvent.tab();
      await userEvent.tab();
      await expect(canvas.getByRole("button", { name: "Reset" })).toHaveFocus();
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(input).toHaveValue(""));
    });
  },
};

/**
 * Built from parts: a Clear button beside the calendar button, the format hint under the field, and presets under
 * the month. Each part is ui-sdk's in Avenue's look.
 */
export const Parts: Story = {
  render: (args) => (
    <Field name="meeting" className="w-72">
      <FieldLabel>Board meeting</FieldLabel>
      <DatePicker today={today} locale="en-US" defaultValue="2026-11-19" onValueChange={args.onValueChange}>
        <DatePickerGroup>
          <DatePickerInput />
          <DatePickerClear aria-label="Clear board meeting" />
          <DatePickerTrigger />
        </DatePickerGroup>
        <DatePickerHint />
        <DatePickerContent>
          <CalendarHeader>
            <CalendarHeading />
            <CalendarPrevious />
            <CalendarNext />
          </CalendarHeader>
          <CalendarGrid>
            <CalendarWeekdays>{(index) => <CalendarWeekday index={index} />}</CalendarWeekdays>
            <CalendarWeeks>{(cell) => <CalendarDay value={cell.date} />}</CalendarWeeks>
          </CalendarGrid>
          <div className="flex gap-controls">
            <DatePickerPreset value="2026-11-30">End of month</DatePickerPreset>
            <DatePickerPreset value="2026-12-31">End of year</DatePickerPreset>
          </div>
        </DatePickerContent>
      </DatePicker>
    </Field>
  ),
  play: async ({ args, canvas, step }) => {
    const input = canvas.getByRole("textbox", { name: "Board meeting" });
    await expect(canvas.getByText("MM/DD/YYYY")).toBeVisible();
    await expect(input.getAttribute("aria-describedby")).toBeTruthy();

    await step("Clear empties the date and puts focus back in the field", async () => {
      await userEvent.tab();
      await userEvent.tab();
      await expect(canvas.getByRole("button", { name: "Clear board meeting" })).toHaveFocus();
      await userEvent.keyboard("{Enter}");
      await expect(args.onValueChange).toHaveBeenLastCalledWith(null, expect.objectContaining({ reason: "clear-press" }));
      await expect(input).toHaveFocus();
    });

    await step("A preset picks its date and closes the calendar", async () => {
      await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
      const preset = await screen.findByRole("button", { name: "End of month" });
      preset.focus();
      await userEvent.keyboard("{Enter}");
      await expect(args.onValueChange).toHaveBeenLastCalledWith("2026-11-30", expect.objectContaining({ reason: "preset-press" }));
      await waitFor(() => expect(input).toHaveValue("11/30/2026"));
      await waitForClosed("date-picker");
    });
  },
};

/**
 * A range, from parts: a start and an end field, each never narrower than its date. In a narrow column they stack
 * rather than cut a date off (UX Engineer, AVE-202).
 */
export const Range: Story = {
  name: "A range, stacking when narrow",
  render: () => (
    <div className="grid gap-section">
      {["w-96", "w-60"].map((width) => (
        <fieldset key={width} className={cn("grid gap-2", width)}>
          <legend className="mb-2 text-field font-medium">Pool closed ({width === "w-96" ? "wide" : "narrow"})</legend>
          <DatePicker mode="range" today={today} locale="en-US" defaultValue={["2026-11-16", "2026-11-20"]}>
            <div className="flex flex-wrap gap-2 *:flex-1">
              <DatePickerGroup>
                <DatePickerInput aria-label={`First day closed, ${width === "w-96" ? "wide" : "narrow"}`} />
              </DatePickerGroup>
              <DatePickerGroup>
                <DatePickerInput end aria-label={`Last day closed, ${width === "w-96" ? "wide" : "narrow"}`} />
                <DatePickerTrigger />
              </DatePickerGroup>
            </div>
            <DatePickerContent />
          </DatePicker>
        </fieldset>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    for (const width of ["wide", "narrow"]) {
      const first = canvas.getByRole("textbox", { name: `First day closed, ${width}` });
      const last = canvas.getByRole("textbox", { name: `Last day closed, ${width}` });
      await expect(first).toHaveValue("11/16/2026");
      for (const input of [first, last]) await expect(input.scrollWidth).toBeLessThanOrEqual(input.clientWidth);
      const sameRow = first.getBoundingClientRect().top === last.getBoundingClientRect().top;
      await expect(sameRow).toBe(width === "wide");
    }
  },
};

/** On a 390px phone the field fills the row and its date is never cut off. */
export const OnAPhone: Story = {
  name: "On a phone",
  globals: phone,
  render: () => (
    <div className="grid gap-group">
      <DueDate defaultValue="2026-11-21" />
    </div>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Due date" });
    await expect(input.scrollWidth).toBeLessThanOrEqual(input.clientWidth);
    const group = input.closest<HTMLElement>("[data-slot=date-picker-group]")!;
    await expect(group.getBoundingClientRect().height).toBe(coarse() ? 44 : 32);
  },
};

/**
 * The calendar as a bottom sheet (`presentation="auto"` does this on a small touch screen; this story asks for it on
 * any screen): Drawer's sheet, with its handle, and the month centred in it.
 */
export const SheetOpen: Story = {
  name: "Sheet, open",
  globals: phone,
  args: { defaultValue: "2026-11-21", presentation: "sheet" },
  render: (args) => (
    <Field name="due" className="w-full">
      <FieldLabel>Due date</FieldLabel>
      <DatePicker {...args} />
    </Field>
  ),
  play: async ({ canvas }) => {
    canvas.getByRole("button", { name: /Choose due date/ }).focus();
    await userEvent.keyboard("{Enter}");
    const grid = await screen.findByRole("grid", { name: "November 2026" });
    const content = grid.closest<HTMLElement>("[data-slot=date-picker-content]")!;
    await expect(content).toHaveAttribute("data-presentation", "sheet");
    await expectListSheet(content, "[data-slot=none]");
  },
};

/**
 * The phone's own date picker (`native`, "auto" by default in the one-tag form): a date input in the same field look,
 * labelled by the Field, posting the same ISO date.
 */
export const NativeOnPhones: Story = {
  name: "Native picker (phones)",
  render: () => (
    <PostingForm>
      <Field name="due">
        <FieldLabel>Due date (OS picker)</FieldLabel>
        <DatePicker native="always" defaultValue="2026-11-21" />
      </Field>
      <Field name="other">
        <FieldLabel>Same field, Avenue's</FieldLabel>
        <DatePicker native="never" locale="en-US" today={today} defaultValue="2026-11-21" />
      </Field>
    </PostingForm>
  ),
  play: async ({ canvas }) => {
    const native = canvas.getByLabelText("Due date (OS picker)");
    await expect(native).toHaveAttribute("type", "date");
    await expect(native).toHaveValue("2026-11-21");
    const avenue = canvas.getByRole("textbox", { name: "Same field, Avenue's" }).closest("[data-slot=date-picker-group]")!;
    await expect(native.getBoundingClientRect().height).toBe(avenue.getBoundingClientRect().height);
    await expect(getComputedStyle(native).borderTopLeftRadius).toBe(getComputedStyle(avenue).borderTopLeftRadius);
    canvas.getByRole("button", { name: "Save" }).focus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByTestId("posted")).toHaveTextContent("Posted due=2026-11-21&other=2026-11-21");
  },
};

/**
 * An agent finds the picker by its Field's label, sets a date, and the form posts it. After the agent's step the
 * play function uses only the keyboard.
 */
export const Agent: Story = {
  tags: ["agent"],
  render: () => (
    <PostingForm>
      <DueDate />
    </PostingForm>
  ),
  play: async ({ canvas }) => {
    const agent = createAgent();
    const pickers = agent.snapshot().filter((entry) => !entry.offPage && entry.component === "date-picker");
    await expect(pickers.map((entry) => entry.label)).toEqual(["Due date"]);
    const result = await agent.act({ steps: [{ ref: pickers[0]!.ref, action: "setValue", args: ["2026-12-15"] }] });
    await expect(result.ok, result.error?.message).toBe(true);
    await expect(canvas.getByRole("textbox", { name: "Due date" })).toHaveValue("12/15/2026");
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Save" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByTestId("posted")).toHaveTextContent("Posted due=2026-12-15");
    await expect(within(canvas.getByTestId("posted")).queryByText(/Nothing/)).toBeNull();
  },
};
