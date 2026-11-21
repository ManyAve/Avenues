import type { Meta, StoryObj } from "@storybook/react-vite";
import { useAsyncOptions } from "@ui-sdk/react/async-options";
import { SearchIcon } from "lucide-react";
import { useState } from "react";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompleteStatus,
  type AutocompleteProps,
} from "#avenue/components/autocomplete";
import { Field, FieldLabel } from "#avenue/components/field";
import { failingSearch, searchResidents } from "./directory-kit";
import { waitForClosed } from "./sheet-kit";

// AVE-207. A text field that suggests as you type, where any text is a valid value. All names are fictional.

const streets = [
  "Copper Hollow",
  "Hazel Crossing",
  "Juniper Bend",
  "Lantern Row",
  "Marigold Way",
  "Quill Court",
  "Saddle Brook Lane",
  "Wren Terrace",
];

const phone = { viewport: { value: "phone", isRotated: false } };
const coarse = () => matchMedia("(pointer: coarse)").matches;
const statusLine = () => document.querySelector<HTMLElement>("[data-slot=autocomplete-status]")!;
const content = () => document.querySelector<HTMLElement>("[data-slot=autocomplete-content]:not([hidden])")!;
const marks = (option: HTMLElement) => [...option.querySelectorAll("[data-match]")].map((m) => m.textContent);

/** Residents loaded from the fake slow directory as you type, through ui-sdk's useAsyncOptions. */
function ResidentSearch({
  source = searchResidents,
  presentation,
}: {
  source?: typeof searchResidents | typeof failingSearch;
  presentation?: AutocompleteProps["presentation"];
}) {
  const residents = useAsyncOptions<string>(source, { debounce: 200 });
  const [text, setText] = useState("");
  return (
    <Field className="w-80">
      <FieldLabel>Resident</FieldLabel>
      <Autocomplete
        items={residents.items}
        status={residents.status}
        onValueChange={(next) => {
          setText(next);
          residents.setQuery(next);
        }}
        onLoadMore={residents.loadMore}
        presentation={presentation}
      >
        <AutocompleteInput icon={<SearchIcon />} placeholder="Search by name" />
        <AutocompleteContent>
          <AutocompleteStatus emptyMessage={(q) => (q ? `No residents match “${q}”.` : "Type a name.")} />
          <AutocompleteList>
            {(state) =>
              (state.items as string[]).map((name) => (
                <AutocompleteItem key={name} value={name}>
                  {name}
                </AutocompleteItem>
              ))
            }
          </AutocompleteList>
        </AutocompleteContent>
      </Autocomplete>
      <output data-testid="text" className="text-meta text-muted-foreground">
        Text: {text || "(empty)"}
      </output>
    </Field>
  );
}

const meta = {
  title: "Components/Autocomplete",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Suggestions the app already holds: Avenue's word search narrows them, and the typed words are marked. */
export const Streets: Story = {
  render: () => (
    <Field className="w-80">
      <FieldLabel>Street</FieldLabel>
      <Autocomplete presentation="popover">
        <AutocompleteInput placeholder="Any street, listed or not" />
        <AutocompleteContent>
          <AutocompleteEmpty>No street matches. Keep typing: any street will do.</AutocompleteEmpty>
          <AutocompleteList>
            {streets.map((street) => (
              <AutocompleteItem key={street} value={street}>
                {street}
              </AutocompleteItem>
            ))}
          </AutocompleteList>
        </AutocompleteContent>
      </Autocomplete>
    </Field>
  ),
  play: async ({ canvas, step }) => {
    const input = canvas.getByRole("combobox", { name: "Street" });

    await step("typing narrows the suggestions and marks the typed words", async () => {
      await userEvent.click(input);
      await userEvent.keyboard("lane brook");
      await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
      const option = screen.getByRole("option");
      await expect(marks(option)).toEqual(["Brook", "Lane"]);
      await expect(option).toHaveAccessibleName("Saddle Brook Lane");
    });

    await step("arrows and Enter fill the field; any other text is kept as typed", async () => {
      await userEvent.keyboard("{ArrowDown}{Enter}");
      await waitFor(() => expect(input).toHaveValue("Saddle Brook Lane"));
      await userEvent.clear(input);
      await userEvent.keyboard("Elsewhere Road");
      await waitFor(() => expect(screen.getByText("No street matches. Keep typing: any street will do.")).toBeVisible());
      await userEvent.keyboard("{Escape}");
      await waitForClosed("autocomplete");
      await expect(input).toHaveValue("Elsewhere Road");
    });
  },
};

/**
 * Suggestions loaded as you type (AVE-207): "Searching…" while they load, never "no results"; the source's ranking
 * stands; the typed letters are marked for the eye only; and the count is read politely once they arrive.
 */
export const Directory: Story = {
  name: "Search as you type",
  tags: ["agent"],
  render: () => <ResidentSearch presentation="popover" />,
  play: async ({ canvas, step }) => {
    const input = canvas.getByRole("combobox", { name: "Resident" });

    await step("while the first suggestions load, the list says Searching…", async () => {
      await userEvent.click(input);
      await userEvent.keyboard("smi");
      await waitFor(() => expect(statusLine()).toHaveTextContent("Searching…"));
      await expect(statusLine()).toHaveAttribute("role", "status");
      await expect(statusLine()).toBeVisible();
      await expect(screen.queryByText(/No residents match/)).toBeNull();
    });

    await step("suggestions arrive with the typed letters marked, and the count is heard", async () => {
      await waitFor(() => expect(screen.getAllByRole("option").length).toBeGreaterThan(0));
      const first = screen.getAllByRole("option")[0]!;
      await expect(marks(first)).toEqual(["Smi"]);
      await expect(first.querySelector("mark")).toBeNull();
      await expect(first).toHaveAccessibleName(expect.stringMatching(/^\w+ Smithfield$/));
      await waitFor(() => expect(statusLine()).toHaveTextContent(/^\d+ results?$/));
      await expect(statusLine()).toHaveClass("sr-only");
    });

    await step("choosing one fills the field with it", async () => {
      const name = screen.getAllByRole("option")[0]!.textContent!;
      await userEvent.keyboard("{ArrowDown}{Enter}");
      await waitFor(() => expect(input).toHaveValue(name));
      await expect(canvas.getByTestId("text")).toHaveTextContent(`Text: ${name}`);
    });

    await step("text that matches nobody says so once it has loaded, and stays the field's value", async () => {
      await userEvent.clear(input);
      await userEvent.keyboard("qqq");
      await waitFor(() => expect(statusLine()).toHaveTextContent("No residents match “qqq”."));
      await expect(statusLine()).toBeVisible();
      await userEvent.keyboard("{Escape}");
      await waitForClosed("autocomplete");
      await expect(input).toHaveValue("qqq");
    });
  },
};

/** A directory that is down: the list says so, politely, and never that nothing matched. */
export const SearchFails: Story = {
  name: "Search as you type, failing",
  render: () => <ResidentSearch source={failingSearch} presentation="popover" />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("combobox", { name: "Resident" }));
    await userEvent.keyboard("oak");
    await waitFor(() => expect(statusLine()).toHaveTextContent("Couldn't search. Try again."));
    await expect(statusLine()).toBeVisible();
    await expect(screen.queryByText(/No residents match/)).toBeNull();
  },
};

/**
 * On a phone the suggestions open as the sheet with the field in its header (AVE-39), and Clear empties the field in
 * one tap (AVE-93). With a mouse there is no Clear: select the text and type over it.
 */
export const OnPhones: Story = {
  name: "On phones",
  globals: phone,
  render: () => <ResidentSearch />,
  play: async ({ canvas }) => {
    const field = () => screen.getByRole<HTMLInputElement>("combobox", { name: "Resident" });
    await userEvent.click(field());
    // The first letter opens the suggestions. On a phone that moves the field into the sheet's header, a new input,
    // so the rest is typed there.
    await userEvent.keyboard("t");
    await waitFor(() => expect(content()).not.toBeNull());
    if (coarse()) {
      await waitFor(() => expect(content().contains(field())).toBe(true));
      await userEvent.click(field());
    }
    await userEvent.keyboard("anaka");
    await waitFor(() => expect(screen.getAllByRole("option").length).toBeGreaterThan(0));
    await expect(content()).toHaveAttribute("data-presentation", coarse() ? "sheet" : "popover");
    if (coarse()) await expect(content().contains(field())).toBe(true);
    await userEvent.click(screen.getAllByRole("option")[0]!);
    await waitForClosed("autocomplete");
    await expect(field().value).toMatch(/ Tanaka$/);
    if (!coarse()) {
      await expect(canvas.queryByRole("button", { name: "Clear resident" })).toBeNull();
      return;
    }
    const clear = canvas.getByRole("button", { name: "Clear resident" });
    await expect(clear.getBoundingClientRect().width).toBe(44);
    await userEvent.click(clear);
    await waitFor(() => expect(field()).toHaveValue(""));
    await expect(field()).toHaveFocus();
    await expect(canvas.getByTestId("text")).toHaveTextContent("Text: (empty)");
  },
};
