import type { Meta, StoryObj } from "@storybook/react-vite";
import { GlobeIcon, HouseIcon } from "lucide-react";
import { useState } from "react";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import { Button } from "#avenue/components/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  type ComboboxItemData,
  type ComboboxProps,
  type ListData,
} from "#avenue/components/combobox";
import { Field, FieldError, FieldLabel } from "#avenue/components/field";
import { expectListSheet, swipeDown, waitForClosed } from "./sheet-kit";

// AVE-7. One Combobox for the household and time-zone pickers, which each build Base UI Combobox by hand today.
// All households, owners and IDs are fictional.

const households: ComboboxItemData[] = [
  { value: "h1", label: "12 Lantern Row · Ada Okafor", meta: "ID 1042" },
  { value: "h2", label: "14 Lantern Row · Bram Hollis", meta: "ID 1043", hint: "$120.00 owing" },
  { value: "h3", label: "3 Quill Court · Cora Mendez", meta: "ID 1101" },
  { value: "h4", label: "5 Quill Court", meta: "ID 1102" },
  { value: "h5", label: "88 Juniper Bend · Dev Raman", meta: "ID 1210" },
];

const zones: ComboboxItemData[] = [
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (Honolulu)" },
];

function Picker({
  label,
  initial = null,
  invalid,
  error,
  ...props
}: Omit<Extract<ComboboxProps, { children?: undefined }>, "value" | "onValueChange" | "children"> & {
  label: string;
  initial?: string | null;
  error?: string;
}) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <Field {...(invalid ? { invalid: true } : {})} className="w-80">
      <FieldLabel>{label}</FieldLabel>
      <Combobox {...props} invalid={invalid} value={value} onValueChange={setValue} />
      {error && <FieldError>{error}</FieldError>}
      <output data-testid="value" className="text-meta text-muted-foreground">
        Chosen: {value ?? "(none)"}
      </output>
    </Field>
  );
}

const phone = { viewport: { value: "phone", isRotated: false } };
const coarse = () => matchMedia("(pointer: coarse)").matches;
// ui-sdk keeps one search field and one query, but mounts the field anew as it moves into the sheet's header and
// back, so the stories find it again each time rather than holding the element.
const field = () => screen.getByRole<HTMLInputElement>("combobox", { name: "Household" });
const content = () => document.querySelector<HTMLElement>("[data-slot=combobox-content]:not([hidden])")!;

// While the search field is in the sheet, the field behind it keeps showing the choice (AVE-76).
const standIn = () => document.querySelector<HTMLElement>("[data-slot=combobox-value]")!;
async function expectChoiceBehindSheet(label: string) {
  await expect(standIn()).toBeVisible();
  await expect(standIn()).toHaveTextContent(label);
  await expect(standIn()).toHaveAttribute("aria-hidden");
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
      items={households}
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
      items={zones}
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
    <Picker label="Applies to" items={households} noneLabel="Neighborhood" icon={<HouseIcon />} />
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Applies to" });
    await expect(input).toHaveValue("Neighborhood");
    // An md field's icons are 16px, like Select's chevron: icons follow the control size (AVE-84, after AVE-59).
    const box = input.closest("[data-slot=combobox]")!;
    // Visible icons only: the phone's clear button (AVE-93) is in the field but hidden with a mouse.
    for (const svg of box.querySelectorAll("svg")) {
      if (svg.checkVisibility()) await expect(svg.getBoundingClientRect().width).toBe(16);
    }
    await userEvent.click(canvas.getByRole("button", { name: "Show options" }));
    await expect(await screen.findByRole("option", { name: "Neighborhood" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("option", { name: /Quill Court · Cora/ }));
    await expect(canvas.getByTestId("value")).toHaveTextContent("h3");
    await waitForClosed("combobox");
    // Choosing the none option again clears the choice to null, as Select and ui-sdk mean nothing chosen (AVE-137).
    await userEvent.click(canvas.getByRole("button", { name: "Show options" }));
    await userEvent.click(await screen.findByRole("option", { name: "Neighborhood" }));
    await expect(canvas.getByTestId("value")).toHaveTextContent("Chosen: (none)");
    await expect(input).toHaveValue("Neighborhood");
    await waitForClosed("combobox");
  },
};

/**
 * A plain form with no React state (AVE-137): each Combobox manages its own value from `defaultValue` and posts it
 * under `name`, like Select. The none option posts "" (like a native select's empty option), Reset returns to the
 * defaults, and `required` holds the submit until something is chosen.
 */
export const InAForm: Story = {
  name: "In a form",
  render: () => {
    const [sent, setSent] = useState("Nothing sent yet");
    return (
      <form
        className="grid w-80 gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const entries = [...new FormData(event.currentTarget)].map(([key, v]) => `${key}=${String(v)}`);
          setSent(entries.join("&") || "(nothing)");
        }}
      >
        <Field>
          <FieldLabel>Household</FieldLabel>
          <Combobox name="household" defaultValue="h2" items={households} presentation="popover" />
        </Field>
        <Field>
          <FieldLabel>Applies to</FieldLabel>
          <Combobox name="appliesTo" noneLabel="Neighborhood" items={households} presentation="popover" />
        </Field>
        <Field>
          <FieldLabel>Time zone</FieldLabel>
          <Combobox name="zone" required items={zones} placeholder="Search by time zone or city" presentation="popover" />
        </Field>
        <div className="flex gap-controls">
          <Button type="submit">Save</Button>
          <Button type="reset" variant="outline">
            Reset
          </Button>
        </div>
        <output data-testid="sent" className="text-meta text-muted-foreground">
          {sent}
        </output>
      </form>
    );
  },
  play: async ({ canvas, step }) => {
    const household = canvas.getByRole("combobox", { name: "Household" });
    const appliesTo = canvas.getByRole("combobox", { name: "Applies to" });
    const zone = canvas.getByRole("combobox", { name: "Time zone" });
    const form = household.closest("form")!;
    const sent = canvas.getByTestId("sent");
    const pick = async (input: HTMLElement, query: string) => {
      await userEvent.click(input);
      await userEvent.clear(input);
      await userEvent.keyboard(query);
      await screen.findByRole("listbox");
      await userEvent.keyboard("{Enter}");
      await waitForClosed("combobox");
    };

    await step("starts from defaultValue, and required holds the submit", async () => {
      await expect(household).toHaveValue("14 Lantern Row · Bram Hollis");
      await expect(appliesTo).toHaveValue("Neighborhood");
      await expect(form.checkValidity()).toBe(false);
    });

    await step("choosing by keyboard changes what the form posts", async () => {
      await pick(zone, "chicago");
      await expect(zone).toHaveValue("Central Time (Chicago)");
      await pick(household, "quill");
      await expect(household).toHaveValue("3 Quill Court · Cora Mendez");
      await expect(form.checkValidity()).toBe(true);
      await userEvent.click(canvas.getByRole("button", { name: "Save" }));
      await expect(sent).toHaveTextContent("household=h3&appliesTo=&zone=America/Chicago");
    });

    await step("Reset returns each field to its default", async () => {
      await pick(appliesTo, "juniper");
      await userEvent.click(canvas.getByRole("button", { name: "Reset" }));
      await waitFor(() => expect(household).toHaveValue("14 Lantern Row · Bram Hollis"));
      await expect(appliesTo).toHaveValue("Neighborhood");
      await expect(zone).toHaveValue("");
      await expect(form.checkValidity()).toBe(false);
      await pick(zone, "denver");
      await userEvent.click(canvas.getByRole("button", { name: "Save" }));
      await expect(sent).toHaveTextContent("household=h2&appliesTo=&zone=America/Denver");
    });
  },
};

/** "" was "nothing chosen" before v0.21.0 and still reads as none for one release (AVE-137). */
export const EmptyStringIsNone: Story = {
  name: "Empty string still means none",
  render: () => (
    <div className="grid w-80 gap-4">
      <Combobox aria-label="Applies to" value="" onValueChange={() => {}} noneLabel="Neighborhood" items={households} />
      <Combobox aria-label="Household" value="" onValueChange={() => {}} placeholder="Search households" items={households} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox", { name: "Applies to" })).toHaveValue("Neighborhood");
    await expect(canvas.getByRole("combobox", { name: "Household" })).toHaveValue("");
  },
};

export const Small: Story = {
  name: "Size sm",
  render: () => <Picker label="Household" items={households} size="sm" icon={<HouseIcon />} />,
};

export const Invalid: Story = {
  render: () => (
    <Picker
      label="Household"
      items={households}
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
  render: () => <Picker label="Household" items={households} initial="h1" icon={<HouseIcon />} disabled />,
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
      items={[]}
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
      items={households}
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
      // On a phone the cursor lands at the end rather than selecting the label (AVE-76), so clear it first.
      if (coarse()) await userEvent.clear(input);
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
  // names no open listbox", reproduced on a bare ui-sdk Combobox, AVE-39; still so in beta.7), so the touch project
  // checks the popover too. Re-check on every ui-sdk upgrade (AGENTS.md, AVE-75).
  render: () => (
    <Picker label="Household" items={households} initial="h1" icon={<HouseIcon />} presentation="popover" />
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
    <Picker label="Household" items={households} initial="h1" icon={<HouseIcon />} triggerLabel="Show households" />
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
    await expectChoiceBehindSheet("12 Lantern Row · Ada Okafor");
    await userEvent.click(field());
    await userEvent.clear(field());
    await userEvent.keyboard("quill");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));
    // Typing a search doesn't change the choice behind the sheet; only a pick does.
    await expectChoiceBehindSheet("12 Lantern Row · Ada Okafor");
    await userEvent.click(screen.getByRole("option", { name: /3 Quill Court/ }));
    await waitForClosed("combobox");
    await expect(canvas.getByTestId("value")).toHaveTextContent("Chosen: h3");
    await expect(field()).toHaveValue("3 Quill Court · Cora Mendez");
    await expect(sheet.contains(field())).toBe(false);
    await expect(standIn()).not.toBeVisible();
    // On a phone the cursor goes to the end, rather than selecting the label, which would raise the system's handles.
    field().blur();
    field().focus();
    await expect(field().selectionStart).toBe(field().value.length);
    await expect(field().selectionEnd).toBe(field().value.length);
  },
};

/**
 * On a phone, Clear beside the chevron empties the choice and the search in one tap and keeps focus in it, so a new
 * search doesn't add to the chosen label (AVE-93). It is 44px and shows only while there is something to clear. With
 * a mouse it never shows: select-on-focus already replaces the label.
 */
export const ClearOnPhones: Story = {
  name: "Clear on phones",
  globals: phone,
  render: () => (
    <Picker label="Household" items={households} initial="h1" icon={<HouseIcon />} triggerLabel="Show households" />
  ),
  play: async ({ canvas }) => {
    if (!coarse()) {
      await expect(canvas.queryByRole("button", { name: "Clear household" })).toBeNull();
      await userEvent.tab();
      await expect(field()).toHaveFocus();
      await userEvent.tab();
      await expect(document.activeElement?.getAttribute("data-slot")).not.toBe("combobox-clear");
      return;
    }
    const clear = canvas.getByRole("button", { name: "Clear household" });
    await expect(clear.getBoundingClientRect().width).toBe(44);
    await userEvent.click(clear);
    await waitFor(() => expect(field()).toHaveValue(""));
    await expect(field()).toHaveFocus();
    await expect(canvas.getByTestId("value")).toHaveTextContent("Chosen: (none)");
    // Nothing to clear now, so the button goes.
    await waitFor(() => expect(canvas.queryByRole("button", { name: "Clear household" })).toBeNull());
    await userEvent.click(canvas.getByRole("button", { name: "Show households" }));
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(households.length));
    await userEvent.click(field());
    await userEvent.keyboard("quill");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));
    await userEvent.click(screen.getByRole("option", { name: /3 Quill Court/ }));
    await waitForClosed("combobox");
    await expect(canvas.getByTestId("value")).toHaveTextContent("Chosen: h3");
    await expect(field()).toHaveValue("3 Quill Court · Cora Mendez");
  },
};

/** The sheet, open, for the light and dark captures: as a phone shows it, on any screen. */
export const SheetOpen: Story = {
  name: "Sheet, open",
  globals: phone,
  render: () => (
    <Picker
      label="Household"
      items={households}
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
    await expectChoiceBehindSheet("12 Lantern Row · Ada Okafor");
  },
};

/**
 * Selected text is Avenue's colour, primary at 25%, not the browser's blue (AVE-76). With a mouse or keyboard,
 * focusing the field selects its label so typing replaces it.
 */
export const SelectedText: Story = {
  render: () => <Picker label="Household" items={households} initial="h1" icon={<HouseIcon />} />,
  play: async () => {
    if (coarse()) return;
    await userEvent.tab();
    await expect(field()).toHaveFocus();
    await expect(field().selectionStart).toBe(0);
    await expect(field().selectionEnd).toBe(field().value.length);
    const tint = getComputedStyle(field(), "::selection").backgroundColor;
    const probe = document.createElement("span");
    probe.style.backgroundColor = "color-mix(in oklab, var(--primary) 25%, transparent)";
    field().parentElement!.append(probe);
    const expected = getComputedStyle(probe).backgroundColor;
    probe.remove();
    await expect(tint).toBe(expected);
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
    <Picker label="Household" items={households} initial="h1" icon={<HouseIcon />} presentation="sheet" />
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
      items={households}
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

/**
 * A join request's row on a 390px phone, as Management lays it out (AVE-113): a card that is a `grid` with an automatic
 * column, holding a wrapping row of a label, a Combobox as wide as the row on a phone, and two buttons. The Combobox
 * shrinks to the card instead of setting the column's minimum, so the page never scrolls sideways. Its input's
 * default width (about 20 characters) used to set that minimum, and the card grew past the screen.
 */
export const InAPhoneCard: Story = {
  globals: phone,
  render: () => {
    const [value, setValue] = useState<string | null>("h2");
    return (
      <div className="grid w-full gap-2">
        <div data-testid="card" className="grid gap-2 rounded-md border bg-background px-4 py-3 text-compact">
          <p>Lives at 14 Lantern Row, Juniper Bend, a fictional street with a long name</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-meta text-muted-foreground">Household</span>
            <Combobox
              aria-label="Household"
              icon={<HouseIcon />}
              items={households}
              value={value}
              onValueChange={setValue}
              className="w-64 max-sm:w-full"
            />
          </div>
        </div>
      </div>
    );
  },
  play: async ({ canvas }) => {
    const card = canvas.getByTestId("card");
    const page = document.documentElement;
    await expect(card.getBoundingClientRect().right).toBeLessThanOrEqual(page.clientWidth);
    await expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth);
  },
};

/**
 * Where nothing sets its width (a toolbar row that sizes to its content), the Combobox keeps the width its text field
 * would have: only its minimum changed for AVE-113, not its preferred width.
 */
export const SizedByContent: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>("h1");
    return (
      <div className="flex w-max gap-2">
        <Combobox aria-label="Household" items={households} value={value} onValueChange={setValue} />
      </div>
    );
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Household" });
    // 234px with a mouse and 264px on a phone, as before AVE-113.
    await expect(input.getBoundingClientRect().width).toBeGreaterThan(200);
  },
};

// AVE-146: items in ui-sdk's shape (groups, separators, object values) and the parts, nested as ui-sdk's Composition
// shows. These stories open the popover on every screen, as the Keyboard story does: Tab and the arrows are the
// popover's contract, and the sheet is proven by the Sheet stories, which draw the same parts.

const byStreet: ListData<string, ComboboxItemData> = [
  {
    type: "group",
    label: "Lantern Row",
    items: [
      { value: "h1", label: "12 Lantern Row · Ada Okafor", meta: "ID 1042" },
      { value: "h2", label: "14 Lantern Row · Bram Hollis", meta: "ID 1043" },
    ],
  },
  { type: "separator" },
  {
    type: "group",
    label: "Quill Court",
    items: [
      { value: "h3", label: "3 Quill Court · Cora Mendez", meta: "ID 1101" },
      { value: "h4", label: "5 Quill Court", meta: "ID 1102" },
    ],
  },
];

/** A grouped list: the search hides a group once none of its households match, and the arrows cross groups. */
export const Grouped: Story = {
  render: () => (
    <Picker label="Household" items={byStreet} icon={<HouseIcon />} triggerLabel="Show households" presentation="popover" />
  ),
  play: async ({ canvas, step }) => {
    const input = canvas.getByRole("combobox", { name: "Household" });
    await step("each group is named by its street", async () => {
      await userEvent.click(input);
      await userEvent.keyboard("{ArrowDown}");
      const list = await screen.findByRole("listbox");
      await expect(screen.getByRole("group", { name: "Lantern Row" })).toBeInTheDocument();
      await expect(screen.getByRole("group", { name: "Quill Court" })).toBeInTheDocument();
      await expect(list.querySelectorAll("[role=option]")).toHaveLength(4);
    });
    await step("a search hides the group it empties", async () => {
      await userEvent.keyboard("quill");
      await waitFor(() => expect(screen.queryByRole("group", { name: "Lantern Row" })).not.toBeInTheDocument());
      await expect(screen.getAllByRole("option")).toHaveLength(2);
      await userEvent.keyboard("{ArrowDown}{Enter}");
      await waitForClosed("combobox");
      await expect(canvas.getByTestId("value")).toHaveTextContent("h4");
      await expect(input).toHaveValue("5 Quill Court");
    });
  },
};

const signers = [
  { id: "ada", name: "Ada Okafor", line: "Treasurer · 12 Lantern Row" },
  { id: "bram", name: "Bram Hollis", line: "Secretary · 14 Lantern Row" },
  { id: "cora", name: "Cora Mendez", line: "Member at large · 3 Quill Court" },
];

/**
 * Built from parts (AVE-146): ComboboxInput draws the field (icon, search, phone's clear, chevron), and each
 * ComboboxItem a name and a second line. `label` is what the field shows once chosen and what the search matches;
 * `keywords` lets the role and the street match too.
 */
export const SecondLine: Story = {
  name: "Second line",
  render: function Render() {
    const [value, setValue] = useState<string | null>(null);
    return (
      <Field className="w-80">
        <FieldLabel>Signer</FieldLabel>
        <Combobox value={value} onValueChange={setValue} presentation="popover">
          <ComboboxInput placeholder="Search the board" triggerLabel="Show the board" />
          <ComboboxContent>
            <ComboboxEmpty>Nobody on the board matches.</ComboboxEmpty>
            <ComboboxList>
              {signers.map((s) => (
                <ComboboxItem key={s.id} value={s.id} label={s.name} keywords={[s.line]}>
                  <span className="block">{s.name}</span>
                  <span className="block text-meta text-muted-foreground">{s.line}</span>
                </ComboboxItem>
              ))}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <output data-testid="value" className="text-meta text-muted-foreground">
          Chosen: {value ?? "(none)"}
        </output>
      </Field>
    );
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Signer" });
    await userEvent.click(input);
    await userEvent.keyboard("secretary");
    const option = await screen.findByRole("option", { name: /Bram Hollis/ });
    await expect(option).toHaveTextContent("Secretary · 14 Lantern Row");
    await expect(screen.getAllByRole("option")).toHaveLength(1);
    await userEvent.keyboard("{Enter}");
    await waitForClosed("combobox");
    await expect(input).toHaveValue("Bram Hollis");
    await expect(canvas.getByTestId("value")).toHaveTextContent("bram");
  },
};

type Owner = { id: number; name: string; street: string };
const owners: Owner[] = [
  { id: 1042, name: "Ada Okafor", street: "12 Lantern Row" },
  { id: 1043, name: "Bram Hollis", street: "14 Lantern Row" },
  { id: 1101, name: "Cora Mendez", street: "3 Quill Court" },
];

/**
 * Object values (AVE-146): the value is the owner, not an id string. `itemToValue` gives the id the form posts,
 * `itemToLabel` the name, and `isItemEqualToValue` matches a copy of an owner (as a server would send back).
 */
export const ObjectValues: Story = {
  name: "Object values",
  render: function Render() {
    const [value, setValue] = useState<Owner | null>({ id: 1043, name: "Bram Hollis", street: "14 Lantern Row" });
    const [posted, setPosted] = useState("");
    return (
      <form
        className="grid w-80 gap-group"
        onSubmit={(event) => {
          event.preventDefault();
          setPosted(String(new FormData(event.currentTarget).get("owner")));
        }}
      >
        <Field>
          <FieldLabel>Owner</FieldLabel>
          <Combobox
            name="owner"
            items={owners.map((o) => ({ value: o, label: o.name, hint: o.street }))}
            value={value}
            onValueChange={setValue}
            itemToValue={(o) => String(o.id)}
            itemToLabel={(o) => o.name}
            isItemEqualToValue={(a, b) => a.id === b.id}
            triggerLabel="Show owners"
            presentation="popover"
          />
        </Field>
        <Button type="submit" variant="outline" className="justify-self-start">
          Post the form
        </Button>
        <output data-testid="value" className="text-meta text-muted-foreground">
          Chosen: {value ? `${value.name} (${value.id})` : "none"}; posted: {posted}
        </output>
      </form>
    );
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Owner" });
    await expect(input).toHaveValue("Bram Hollis");
    await userEvent.click(input);
    if (coarse()) await userEvent.clear(input);
    await userEvent.keyboard("cora");
    await screen.findByRole("option", { name: /Cora Mendez/ });
    await userEvent.keyboard("{Enter}");
    await waitForClosed("combobox");
    await expect(input).toHaveValue("Cora Mendez");
    await expect(canvas.getByTestId("value")).toHaveTextContent("Cora Mendez (1101)");
    await userEvent.click(canvas.getByRole("button", { name: "Post the form" }));
    await expect(canvas.getByTestId("value")).toHaveTextContent("posted: 1101");
  },
};
