import type { Meta, StoryObj } from "@storybook/react-vite";
import { GlobeIcon, HouseIcon } from "lucide-react";
import { useState } from "react";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import { Combobox, type ComboboxOption } from "#avenue/components/combobox";
import { Field, FieldError, FieldLabel } from "#avenue/components/field";
import { expectListSheet, swipeDown, waitForClosed } from "./sheet-kit";

// AVE-7. One Combobox for the household and time-zone pickers, which each build Base UI Combobox by hand today.
// All households, owners and IDs are fictional.

const households: ComboboxOption[] = [
  { value: "h1", label: "12 Lantern Row · Ada Okafor", meta: "ID 1042" },
  { value: "h2", label: "14 Lantern Row · Bram Hollis", meta: "ID 1043", hint: "$120.00 owing" },
  { value: "h3", label: "3 Quill Court · Cora Mendez", meta: "ID 1101" },
  { value: "h4", label: "5 Quill Court", meta: "ID 1102" },
  { value: "h5", label: "88 Juniper Bend · Dev Raman", meta: "ID 1210" },
];

const zones: ComboboxOption[] = [
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (Honolulu)" },
];

function Picker({
  label,
  initial = "",
  invalid,
  error,
  ...props
}: Omit<React.ComponentProps<typeof Combobox>, "value" | "onValueChange"> & {
  label: string;
  initial?: string;
  error?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Field {...(invalid ? { invalid: true } : {})} className="w-80">
      <FieldLabel>{label}</FieldLabel>
      <Combobox {...props} invalid={invalid} value={value} onValueChange={setValue} />
      {error && <FieldError>{error}</FieldError>}
      <output data-testid="value" className="text-meta text-muted-foreground">
        {value || "(none)"}
      </output>
    </Field>
  );
}

const phone = { viewport: { value: "phone", isRotated: false } };
const coarse = () => matchMedia("(pointer: coarse)").matches;
// ui-sdk keeps one search field and one query, but mounts the field anew as it moves into the sheet's header and
// back, so the stories find it again each time rather than holding the element.
const field = () => screen.getByRole("combobox", { name: "Household" });
const content = () => document.querySelector<HTMLElement>("[data-slot=combobox-content]:not([hidden])")!;

const meta = {
  title: "Components/Combobox",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Households: Story = {
  render: () => (
    <Picker
      label="Household"
      options={households}
      icon={<HouseIcon />}
      placeholder="Search by address, owner or ID"
      triggerLabel="Show households"
      emptyMessage={(q) => `No household matches “${q}”. Try the street number, owner or spreadsheet ID.`}
    />
  ),
};

export const TimeZone: Story = {
  name: "Time zone",
  render: () => (
    <Picker
      label="Time zone"
      options={zones}
      initial="America/Chicago"
      icon={<GlobeIcon />}
      placeholder="Search by time zone or city"
      triggerLabel="Show time zones"
    />
  ),
};

export const WithNone: Story = {
  name: "With a none choice",
  render: () => (
    <Picker label="Applies to" options={households} noneLabel="Neighborhood" icon={<HouseIcon />} />
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Applies to" });
    await expect(input).toHaveValue("Neighborhood");
    // The app's 14px icons: the leading house and the chevron (AVE-59).
    const field = input.closest("[data-slot=combobox]")!;
    for (const svg of field.querySelectorAll("svg")) await expect(svg.getBoundingClientRect().width).toBe(14);
    await userEvent.click(canvas.getByRole("button", { name: "Show options" }));
    await expect(await screen.findByRole("option", { name: "Neighborhood" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("option", { name: /Quill Court · Cora/ }));
    await expect(canvas.getByTestId("value")).toHaveTextContent("h3");
    await waitForClosed("combobox");
  },
};

export const Small: Story = {
  name: "Size sm",
  render: () => <Picker label="Household" options={households} size="sm" icon={<HouseIcon />} />,
};

export const Invalid: Story = {
  render: () => (
    <Picker
      label="Household"
      options={households}
      icon={<HouseIcon />}
      invalid
      error="Choose the household this payment is for."
    />
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Household" });
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleDescription(/Choose the household this payment is for/);
  },
};

export const Disabled: Story = {
  render: () => <Picker label="Household" options={households} initial="h1" icon={<HouseIcon />} disabled />,
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Household" });
    await expect(input).toBeDisabled();
    // The whole field dims, not just the text: the wrapper carries the disabled look.
    await expect(input.closest("[data-slot=combobox]")).toHaveAttribute("data-disabled");
  },
};

export const Empty: Story = {
  name: "No options yet",
  render: () => (
    <Picker
      label="Household"
      options={[]}
      icon={<HouseIcon />}
      emptyMessage={() => "No households yet. Add one on the Households tab first."}
    />
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show options" }));
    // The list fades in from opacity 0 (data-starting-style), so wait for it to finish appearing.
    await waitFor(() => expect(screen.getByText("No households yet. Add one on the Households tab first.")).toBeVisible());
  },
};

/** Search, empty result, arrows and Enter, and Escape restoring the previous choice. */
export const Keyboard: Story = {
  render: () => (
    <Picker
      label="Household"
      // The popover's contract, on every screen: Tab leaves the field. A sheet is modal, so Tab stays in it; its
      // keyboard is the Sheet keyboard story (AVE-39).
      presentation="popover"
      options={households}
      initial="h1"
      icon={<HouseIcon />}
      triggerLabel="Show households"
      emptyMessage={(q) => `No household matches “${q}”.`}
    />
  ),
  play: async ({ canvas, step }) => {
    const input = canvas.getByRole("combobox", { name: "Household" });

    await step("labelled by its Field label; shows the current choice", async () => {
      await expect(input).toHaveAccessibleName("Household");
      await expect(input).toHaveValue("12 Lantern Row · Ada Okafor");
    });

    await step("typing filters the list", async () => {
      await userEvent.click(input);
      await userEvent.keyboard("quill");
      const options = await screen.findAllByRole("option");
      await expect(options.map((o) => o.textContent)).toEqual([
        expect.stringContaining("3 Quill Court"),
        expect.stringContaining("5 Quill Court"),
      ]);
    });

    await step("no match says so", async () => {
      await userEvent.clear(input);
      await userEvent.keyboard("zzz");
      // The list fades in from opacity 0 (data-starting-style), so wait for it to finish appearing.
      await waitFor(() => expect(screen.getByText("No household matches “zzz”.")).toBeVisible());
    });

    await step("Escape closes the list and restores the previous choice", async () => {
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
      await waitFor(() => expect(input).toHaveValue("12 Lantern Row · Ada Okafor"));
      await expect(canvas.getByTestId("value")).toHaveTextContent("h1");
    });

    await step("leaving the field with half-typed text also restores it", async () => {
      await userEvent.clear(input);
      await userEvent.keyboard("bram");
      await userEvent.tab();
      await waitFor(() => expect(input).toHaveValue("12 Lantern Row · Ada Okafor"));
      await expect(canvas.getByTestId("value")).toHaveTextContent("h1");
      await userEvent.click(input);
    });

    await step("arrows move the highlight; Enter chooses", async () => {
      await userEvent.clear(input);
      await userEvent.keyboard("lantern");
      await screen.findByRole("listbox");
      await userEvent.keyboard("{ArrowDown}");
      await waitFor(() =>
        expect(screen.getByRole("option", { name: /14 Lantern Row/ })).toHaveAttribute("data-highlighted"),
      );
      await expect(input.getAttribute("aria-activedescendant")).toBe(
        screen.getByRole("option", { name: /14 Lantern Row/ }).id,
      );
      await userEvent.keyboard("{Enter}");
      await expect(canvas.getByTestId("value")).toHaveTextContent("h2");
      await expect(input).toHaveValue("14 Lantern Row · Bram Hollis");
    });
  },
};

/**
 * Avenue changes how the Combobox leaves (Tab away restores the last choice), so it is checked against the WAI-ARIA
 * combobox pattern itself, not only through ui-sdk's own tests (AVE-18).
 */
export const Pattern: Story = {
  name: "Combobox pattern",
  tags: ["pattern:combobox"],
  // The popover, on every screen: ui-sdk 0.1's checkPattern fails its own Combobox presenting as a sheet ("aria-controls
  // names no open listbox", reproduced on a bare ui-sdk Combobox, AVE-39), so the touch project checks the popover too.
  render: () => (
    <Picker label="Household" options={households} initial="h1" icon={<HouseIcon />} presentation="popover" />
  ),
  play: async ({ canvas }) => {
    // The story runner runs checkPattern(…, "combobox") after this play function, from the tag.
    await expect(canvas.getByRole("combobox", { name: "Household" })).toHaveValue("12 Lantern Row · Ada Okafor");
    await expect(canvas.getByTestId("value")).toHaveTextContent("h1");
  },
};

/**
 * On a 390px phone (AVE-39): by default (`presentation="auto"`) the list opens as a bottom sheet on a small touch
 * screen and as the popover with a mouse, decided each time it opens. In the sheet the search field moves into its
 * header as a 44px field (one field, one query), the rows are 44px, and choosing one closes the sheet and puts the
 * choice back in the field.
 */
export const SheetOnPhones: Story = {
  name: "Sheet on phones",
  globals: phone,
  render: () => (
    <Picker label="Household" options={households} initial="h1" icon={<HouseIcon />} triggerLabel="Show households" />
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show households" }));
    await screen.findByRole("listbox");
    await expect(content()).toHaveAttribute("data-presentation", coarse() ? "sheet" : "popover");
    if (!coarse()) {
      await userEvent.keyboard("{Escape}");
      await waitForClosed("combobox");
      return;
    }
    const sheet = content();
    await expectListSheet(sheet, "[data-slot=combobox-item]");
    await expect(sheet.contains(field())).toBe(true);
    await expect(field().getBoundingClientRect().height).toBe(44);
    await userEvent.click(field());
    await userEvent.clear(field());
    await userEvent.keyboard("quill");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));
    await userEvent.click(screen.getByRole("option", { name: /3 Quill Court/ }));
    await waitForClosed("combobox");
    await expect(canvas.getByTestId("value")).toHaveTextContent("h3");
    await expect(field()).toHaveValue("3 Quill Court · Cora Mendez");
    await expect(sheet.contains(field())).toBe(false);
  },
};

/** The sheet, open, for the light and dark captures: as a phone shows it, on any screen. */
export const SheetOpen: Story = {
  name: "Sheet, open",
  globals: phone,
  render: () => (
    <Picker
      label="Household"
      options={households}
      initial="h1"
      icon={<HouseIcon />}
      triggerLabel="Show households"
      presentation="sheet"
    />
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show households" }));
    await screen.findByRole("listbox");
    await expectListSheet(content(), "[data-slot=combobox-item]");
  },
};

/**
 * The keyboard in the sheet: typing filters, the arrows move the highlight and Enter chooses, with focus kept in the
 * search field as it moves into the sheet and back; Escape closes it and puts the previous choice back.
 */
export const SheetKeyboard: Story = {
  name: "Sheet keyboard",
  globals: phone,
  render: () => (
    <Picker label="Household" options={households} initial="h1" icon={<HouseIcon />} presentation="sheet" />
  ),
  play: async ({ canvas, step }) => {
    await step("typing opens the sheet with the search field in it, still focused", async () => {
      field().focus();
      await userEvent.keyboard("{ArrowDown}");
      await screen.findByRole("listbox");
      await expect(content()).toHaveAttribute("data-presentation", "sheet");
      await waitFor(() => expect(field()).toHaveFocus());
      await expect(content().contains(field())).toBe(true);
    });
    await step("arrows move the highlight; Enter chooses and focus stays on the field", async () => {
      await userEvent.clear(field());
      await userEvent.keyboard("lantern");
      await userEvent.keyboard("{ArrowDown}");
      await waitFor(() =>
        expect(screen.getByRole("option", { name: /14 Lantern Row/ })).toHaveAttribute("data-highlighted"),
      );
      await userEvent.keyboard("{Enter}");
      await waitForClosed("combobox");
      await expect(canvas.getByTestId("value")).toHaveTextContent("h2");
      await expect(field()).toHaveValue("14 Lantern Row · Bram Hollis");
      await expect(field()).toHaveFocus();
    });
    await step("Escape closes the sheet and puts the choice back", async () => {
      await userEvent.keyboard("{ArrowDown}");
      await screen.findByRole("listbox");
      await userEvent.clear(field());
      await userEvent.keyboard("quill");
      await userEvent.keyboard("{Escape}");
      await waitForClosed("combobox");
      await waitFor(() => expect(field()).toHaveValue("14 Lantern Row · Bram Hollis"));
      await expect(canvas.getByTestId("value")).toHaveTextContent("h2");
      await expect(field()).toHaveFocus();
    });
  },
};

/** A swipe down closes the sheet without changing the choice. */
export const SheetSwipeToClose: Story = {
  name: "Sheet swipe to close",
  globals: phone,
  render: () => (
    <Picker
      label="Household"
      options={households}
      initial="h1"
      icon={<HouseIcon />}
      triggerLabel="Show households"
      presentation="sheet"
    />
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show households" }));
    await screen.findByRole("listbox");
    const sheet = content();
    await expectListSheet(sheet, "[data-slot=combobox-item]");
    await swipeDown(sheet);
    await waitForClosed("combobox");
    await expect(canvas.getByTestId("value")).toHaveTextContent("h1");
    await expect(field()).toHaveValue("12 Lantern Row · Ada Okafor");
  },
};
