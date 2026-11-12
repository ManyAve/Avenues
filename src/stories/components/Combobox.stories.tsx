import type { Meta, StoryObj } from "@storybook/react-vite";
import { GlobeIcon, HouseIcon } from "lucide-react";
import { useState } from "react";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import { Combobox, type ComboboxOption } from "#avenue/components/combobox";
import { Field, FieldError, FieldLabel } from "#avenue/components/field";

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
    <Field invalid={invalid} className="w-80">
      <FieldLabel>{label}</FieldLabel>
      <Combobox {...props} invalid={invalid} value={value} onValueChange={setValue} />
      {error && <FieldError match>{error}</FieldError>}
      <output data-testid="value" className="text-meta text-muted-foreground">
        {value || "(none)"}
      </output>
    </Field>
  );
}

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
    // Inside a Field, the chevron button takes the Field's label too.
    await userEvent.click(canvas.getByRole("button", { name: "Applies to" }));
    await expect(await screen.findByRole("option", { name: "Neighborhood" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("option", { name: /Quill Court · Cora/ }));
    await expect(canvas.getByTestId("value")).toHaveTextContent("h3");
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
    await userEvent.click(canvas.getByRole("button", { name: "Household" }));
    await expect(await screen.findByText("No households yet. Add one on the Households tab first.")).toBeVisible();
  },
};

/** Search, empty result, arrows and Enter, and Escape restoring the previous choice. */
export const Keyboard: Story = {
  render: () => (
    <Picker
      label="Household"
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
      await expect(await screen.findByText("No household matches “zzz”.")).toBeVisible();
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
