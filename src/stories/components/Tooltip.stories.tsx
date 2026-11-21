import type { Meta, StoryObj } from "@storybook/react-vite";
import { SaveIcon, Settings2Icon } from "lucide-react";
import { useState } from "react";
import { ariaKeyshortcuts, formatShortcut, useShortcut } from "@ui-sdk/react/shortcuts";
import { expect, userEvent, waitFor } from "storybook/test";
import { Badge } from "#avenue/components/badge";
import { Button } from "#avenue/components/button";
import { InfoTip, Tooltip, TooltipContent, TooltipShortcut, TooltipTrigger } from "#avenue/components/tooltip";

// ui-sdk keeps the tooltip in the page while closed, hidden, so "open" means present and not hidden.
const queryTip = () => document.querySelector<HTMLElement>("[data-slot=tooltip-content]:not([hidden])");
const findTip = () => waitFor(() => queryTip() ?? Promise.reject(new Error("tooltip not open")));

const meta = {
  title: "Components/Tooltip",
  component: Tooltip,
  decorators: [(Story) => <div className="flex min-h-40 items-end justify-center gap-4 p-inset">{Story()}</div>],
} satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Open: 8px corner, inverted colours, arrow. A tooltip names an icon button; it never holds the only copy of something. */
export const Open: Story = {
  render: () => (
    <Tooltip defaultOpen>
      <TooltipTrigger render={<Button variant="outline" size="icon-md" aria-label="Display options" />}>
        <Settings2Icon aria-hidden />
      </TooltipTrigger>
      <TooltipContent>Display options</TooltipContent>
    </Tooltip>
  ),
  play: async () => {
    await expect(await findTip()).toHaveTextContent("Display options");
  },
};

/** Keyboard focus opens it and Esc closes it. */
export const OnFocus: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" size="icon-md" aria-label="Display options" />}>
        <Settings2Icon aria-hidden />
      </TooltipTrigger>
      <TooltipContent>Display options</TooltipContent>
    </Tooltip>
  ),
  play: async ({ canvas }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Display options" })).toHaveFocus();
    await expect(await findTip()).toHaveTextContent("Display options");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(queryTip()).toBeNull());
  },
};

function SaveWithHint() {
  const [saved, setSaved] = useState(0);
  const save = () => setSaved((count) => count + 1);
  useShortcut("mod+s", save, { description: "Save the notice" });
  return (
    <div className="flex flex-col items-center gap-group">
      <Tooltip shortcut="mod+s">
        <TooltipTrigger render={<Button variant="outline" size="icon-md" aria-label="Save notice" />} onClick={save}>
          <SaveIcon aria-hidden />
        </TooltipTrigger>
        <TooltipContent>
          Save notice
          <TooltipShortcut />
        </TooltipContent>
      </Tooltip>
      <output className="block text-meta text-muted-foreground">{saved > 0 ? `Saved ${saved}×` : "Not saved yet"}</output>
    </div>
  );
}

/**
 * The tooltip teaches the keys (AVE-194): `shortcut="mod+s"` shows ⌘S on a Mac and Ctrl+S elsewhere,
 * hidden from screen readers, which hear the button's `aria-keyshortcuts`. The keys do what the button does. Menu /
 * Shortcuts on a Mac shows the Mac spelling.
 */
export const WithAShortcut: Story = {
  tags: ["agent"],
  render: () => <SaveWithHint />,
  play: async ({ canvas }) => {
    const save = canvas.getByRole("button", { name: "Save notice" });
    await userEvent.tab();
    await expect(save).toHaveFocus();
    const apple = ariaKeyshortcuts("mod+s").startsWith("Meta");
    await expect(save).toHaveAttribute("aria-keyshortcuts", apple ? "Meta+S" : "Control+S");
    const tip = await findTip();
    const keys = tip.querySelector("[data-slot=tooltip-shortcut]");
    await expect(keys).toHaveTextContent(formatShortcut("mod+s"));
    await expect(formatShortcut("mod+s")).toContain(apple ? "⌘S" : "Ctrl+S");
    await expect(keys).toHaveAttribute("aria-hidden", "true");
    await userEvent.keyboard(apple ? "{Meta>}s{/Meta}" : "{Control>}s{/Control}");
    await expect(canvas.getByRole("status")).toHaveTextContent("Saved 1×");
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByRole("status")).toHaveTextContent("Saved 2×");
  },
};

/**
 * Help on a label that isn't a control (the Status help). The ? is a real button: hover, keyboard focus and a tap
 * all open the text, a second tap closes it, and a screen reader reads it as the button's description.
 */
export const HelpOnALabel: Story = {
  tags: ["agent"],
  render: () => (
    <span className="inline-flex items-center gap-1">
      <Badge variant="secondary">Past due</Badge>
      <InfoTip label="About Past due">Dues were not paid by the due date, March 1.</InfoTip>
    </span>
  ),
  play: async ({ canvas }) => {
    const help = canvas.getByRole("button", { name: "About Past due" });
    await userEvent.tab();
    await expect(help).toHaveFocus();
    await expect(await findTip()).toHaveTextContent("Dues were not paid by the due date, March 1.");
    await expect(await findTip()).toHaveAttribute("role", "tooltip");
    await expect(help).toHaveAccessibleDescription("Dues were not paid by the due date, March 1.");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(queryTip()).toBeNull());
    // A press or tap opens it too, and a second press closes it (ui-sdk's toggleable tooltip).
    await userEvent.click(help);
    await waitFor(async () => expect(await findTip()).toBeVisible()); // fades in from opacity 0
    await userEvent.click(help);
    await waitFor(() => expect(queryTip()).toBeNull());
  },
};
