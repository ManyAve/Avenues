import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarDays, ClipboardPaste, Download } from "lucide-react";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import {
  DisplayOptions,
  DisplayOptionsAction,
  DisplayOptionsCheckbox,
  DisplayOptionsDensity,
  DisplayOptionsSection,
} from "#avenue/components/display-options";
import type { Density } from "#avenue/components/register";
import { Toolbar, ToolbarControls } from "#avenue/components/toolbar";

// AVE-9 part 4: the households list's Display options. Nothing here is real data.

const meta = { title: "Composites/Display options", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const desktop = { viewport: { value: "desktop", isRotated: false } };
const wide = { viewport: { value: "wide", isRotated: false } };
const phone = { viewport: { value: "phone", isRotated: false } };

const onOff = (value: boolean) => (value ? "on" : "off");
const exportReason = "No households match the filters.";
const importHouseholds = fn();

function Options({ empty = false }: { empty?: boolean }) {
  const [lines, setLines] = useState(false);
  const [email, setEmail] = useState(false);
  const [keep, setKeep] = useState(false);
  const [density, setDensity] = useState<Density>("normal");
  return (
    <div className="min-h-140 bg-background">
      <Toolbar aria-label="Households">
        <ToolbarControls>
          <DisplayOptions>
            <DisplayOptionsSection title="Display">
              <DisplayOptionsCheckbox label="Column lines" checked={lines} onCheckedChange={(on) => setLines(on === true)} />
              <DisplayOptionsCheckbox label="Email column" checked={email} onCheckedChange={(on) => setEmail(on === true)} />
              <DisplayOptionsCheckbox
                label="Keep every column"
                hint="Narrow windows hide some columns to keep Next action in view."
                checked={keep}
                onCheckedChange={(on) => setKeep(on === true)}
              />
            </DisplayOptionsSection>
            <DisplayOptionsSection title="Row height">
              <DisplayOptionsDensity value={density} onValueChange={setDensity} />
              <p className="mt-2 text-muted-foreground">Addresses stay visible as you scroll.</p>
            </DisplayOptionsSection>
            <DisplayOptionsSection title="Import and export">
              <DisplayOptionsAction disabledReason={empty ? exportReason : undefined}>
                <Download aria-hidden /> Export households as CSV
              </DisplayOptionsAction>
              <DisplayOptionsAction onClick={importHouseholds}>
                <ClipboardPaste aria-hidden /> Import households from a spreadsheet
              </DisplayOptionsAction>
            </DisplayOptionsSection>
            <DisplayOptionsSection title="Once a year">
              <DisplayOptionsAction>
                <CalendarDays aria-hidden /> Set the 2027 assessment
              </DisplayOptionsAction>
            </DisplayOptionsSection>
          </DisplayOptions>
        </ToolbarControls>
      </Toolbar>
      {/* What the panel set, so the story shows its effect; labelled, not a bare debug line (AVE-91). */}
      <p className="px-page text-meta text-muted-foreground" data-testid="state">
        {`Settings: column lines ${onOff(lines)}, email column ${onOff(email)}, keep filters ${onOff(keep)}, ${density} rows`}
      </p>
    </div>
  );
}

const open = async (canvas: ReturnType<typeof within>, body: HTMLElement) => {
  await userEvent.tab();
  await expect(canvas.getByRole("button", { name: "Display options" })).toHaveFocus();
  await userEvent.keyboard("{Enter}");
  return within(body).findByRole("dialog", { name: "Display options" });
};

/** Open at 1440px, every section showing. */
export const Open: Story = {
  globals: wide,
  tags: ["agent"],
  render: () => <Options />,
  play: async ({ canvas, canvasElement }) => {
    const panel = await open(canvas, canvasElement.ownerDocument.body);
    await expect(within(panel).getByRole("checkbox", { name: /Keep every column/ })).toHaveAccessibleDescription(
      "Narrow windows hide some columns to keep Next action in view.",
    );
    await expect(within(panel).getByRole("radio", { name: "Normal" })).toBeChecked();
    // As the app's story ends: Column lines on and Compact rows.
    await userEvent.click(within(panel).getByRole("checkbox", { name: "Column lines" }));
    await userEvent.click(within(panel).getByRole("radio", { name: "Compact" }));
    await expect(canvas.getByTestId("state")).toHaveTextContent("Settings: column lines on, email column off, keep filters off, compact rows");
  },
};

/** Every option by keyboard: Space toggles, the arrows pick the row height, Esc returns to the button. */
export const KeyboardFlow: Story = {
  globals: wide,
  render: () => <Options />,
  play: async ({ canvas, canvasElement }) => {
    const panel = within(await open(canvas, canvasElement.ownerDocument.body));
    const state = canvas.getByTestId("state");
    const lines = panel.getByRole("checkbox", { name: "Column lines" });
    await waitFor(() => expect(lines).toHaveFocus());
    await userEvent.keyboard(" ");
    await userEvent.tab();
    await userEvent.keyboard(" ");
    await expect(state).toHaveTextContent("Settings: column lines on, email column on, keep filters off, normal rows");
    await userEvent.tab();
    await userEvent.tab();
    await expect(panel.getByRole("radio", { name: "Normal" })).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    await expect(state).toHaveTextContent("compact rows");
    await userEvent.tab();
    await userEvent.tab();
    await expect(panel.getByRole("button", { name: /Import households/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(importHouseholds).toHaveBeenCalled();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(canvas.getByRole("button", { name: "Display options" })).toHaveFocus());
  },
};

/** 900px with nothing to export: Export says why, and stays reachable so the reason is read. */
export const NothingToExport: Story = {
  globals: desktop,
  render: () => <Options empty />,
  play: async ({ canvas, canvasElement }) => {
    const panel = within(await open(canvas, canvasElement.ownerDocument.body));
    const exportButton = panel.getByRole("button", { name: /Export households/ });
    await expect(exportButton).toHaveAttribute("aria-disabled", "true");
    await expect(exportButton).toHaveAccessibleDescription(exportReason);
    await waitFor(() => expect(panel.getByText(exportReason)).toBeVisible());
  },
};

/** 390px phone (AVE-176): every option, Row height's three heights included, sits inside the popover. */
export const OnAPhone: Story = {
  globals: phone,
  render: () => <Options />,
  play: async ({ canvas, canvasElement }) => {
    const panel = await open(canvas, canvasElement.ownerDocument.body);
    const box = panel.getBoundingClientRect();
    const view = canvasElement.ownerDocument.documentElement.clientWidth;
    await expect(box.left).toBeGreaterThanOrEqual(0);
    await expect(box.right).toBeLessThanOrEqual(view);
    const inset = Number.parseFloat(getComputedStyle(panel).paddingRight);
    for (const option of [
      ...within(panel).getAllByRole("radio"),
      ...within(panel).getAllByRole("checkbox"),
      ...within(panel).getAllByRole("button"),
    ]) {
      const rect = option.getBoundingClientRect();
      await expect(rect.left, option.textContent ?? "").toBeGreaterThanOrEqual(box.left + inset - 0.5);
      await expect(rect.right, option.textContent ?? "").toBeLessThanOrEqual(box.right - inset + 0.5);
    }
    await userEvent.click(within(panel).getByRole("radio", { name: "Comfortable" }));
    await expect(canvas.getByTestId("state")).toHaveTextContent("comfortable rows");
  },
};
