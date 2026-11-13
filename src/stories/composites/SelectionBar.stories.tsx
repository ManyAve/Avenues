import type { Meta, StoryObj } from "@storybook/react-vite";
import { Archive, CircleDollarSign, Megaphone } from "lucide-react";
import { useRef, useState } from "react";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { Checkbox } from "#avenue/components/checkbox";
import { SelectionBar, type SelectionAction } from "#avenue/components/selection-bar";

// AVE-9 part 4: the floating selection bar. Addresses are fictional.

const meta = { title: "Composites/Selection bar", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const desktop = { viewport: { value: "desktop", isRotated: false } };
const wide = { viewport: { value: "wide", isRotated: false } };

const homes = ["12 Birch Lane", "14 Birch Lane", "17 Birch Lane", "3 Cedar Court"];
const dueReason = "Set this year's assessment first.";
const announce = fn();
const requestDues = fn();

function List({ initial = [] as string[], duesReady = false, archivable = false }) {
  const [picked, setPicked] = useState<string[]>(initial);
  const first = useRef<HTMLButtonElement>(null);
  const actions: SelectionAction[] = [
    { id: "dues", label: "Request dues", icon: <CircleDollarSign aria-hidden />, confirm: "Sends a dues request to each selected household", ...(duesReady ? { onSelect: requestDues } : { disabledReason: dueReason }) },
    { id: "announce", label: "Announcement", icon: <Megaphone aria-hidden />, primary: true, onSelect: announce },
    // Archive empties the selection, so the bar goes away under focus, as Clear does (AVE-90).
    ...(archivable ? [{ id: "archive", label: "Archive", icon: <Archive aria-hidden />, onSelect: () => setPicked([]) }] : []),
  ];
  return (
    <div className="relative min-h-[420px] bg-background px-page py-inset">
      <ul className="grid gap-2">
        {homes.map((home, i) => (
          <li key={home}>
            <label className="flex items-center gap-2 text-control">
              <Checkbox
                ref={i === 0 ? first : undefined}
                checked={picked.includes(home)}
                onCheckedChange={(on) => setPicked((now) => (on ? [...now, home] : now.filter((h) => h !== home)))}
              />
              {home}
            </label>
          </li>
        ))}
      </ul>
      <SelectionBar
        count={picked.length}
        label={(n) => `${n} ${n === 1 ? "household" : "households"} selected`}
        actions={actions}
        onClear={() => setPicked([])}
        // The bar goes away with the selection, and hands focus back to the list's first stop.
        returnFocus={first}
      />
    </div>
  );
}

/** Two households selected at 1440px: the count, Request dues, Announcement and Clear. */
export const Wide: Story = {
  globals: wide,
  tags: ["agent"],
  render: () => <List initial={["12 Birch Lane", "3 Cedar Court"]} duesReady />,
  play: async ({ canvas }) => {
    const bar = canvas.getByRole("toolbar", { name: "Selection actions" });
    await expect(bar).toHaveTextContent("2 households selected");
    // A send asks an agent to check with the person first (AVE-85); Announcement only opens a draft.
    await expect(canvas.getByRole("button", { name: /Request dues/ })).toHaveAttribute(
      "data-agent-confirm",
      "Sends a dues request to each selected household",
    );
    await expect(canvas.getByRole("button", { name: /Announcement/ })).not.toHaveAttribute("data-agent-confirm");
  },
};

/** 900px with no assessment set yet: Request dues says why it's unavailable, and the bar still fits. */
export const DesktopMinimum: Story = {
  globals: desktop,
  render: () => <List initial={["14 Birch Lane"]} />,
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText(dueReason)).toBeVisible();
    await expect(canvas.getByRole("button", { name: /Request dues/ })).toHaveAccessibleDescription(dueReason);
    const bar = canvas.getByRole("toolbar", { name: "Selection actions" }).getBoundingClientRect();
    const frame = canvasElement.getBoundingClientRect();
    await expect(bar.left).toBeGreaterThanOrEqual(frame.left);
    await expect(bar.right).toBeLessThanOrEqual(frame.right);
    // The reason hangs from Request dues and doesn't widen its slot: Announcement sits the bar's gap after the button,
    // and the reason ends where the button does (AVE-91, as the page toolbar).
    const toolbar = canvas.getByRole("toolbar", { name: "Selection actions" });
    const dues = canvas.getByRole("button", { name: /Request dues/ }).getBoundingClientRect();
    const next = canvas.getByRole("button", { name: /Announcement/ }).getBoundingClientRect();
    await expect(next.left - dues.right).toBeCloseTo(Number.parseFloat(getComputedStyle(toolbar).columnGap), 0);
    const reason = canvas.getByText(dueReason);
    const range = document.createRange();
    range.selectNodeContents(reason);
    await expect(Math.abs(range.getBoundingClientRect().right - dues.right)).toBeLessThanOrEqual(1);
  },
};

/**
 * The count is announced as it changes, the first selection included; the bar is one Tab stop with arrows; a
 * disabled action stays reachable; Clear says so, and Clear or an action that empties the selection puts focus back
 * in the list through `returnFocus` (AVE-90).
 */
export const KeyboardFlow: Story = {
  globals: wide,
  render: () => <List archivable />,
  play: async ({ canvas }) => {
    const status = canvas.getByRole("status");
    await expect(status).toHaveTextContent("");
    await userEvent.tab();
    await userEvent.keyboard(" ");
    await waitFor(() => expect(status).toHaveTextContent("1 household selected"));
    await userEvent.tab();
    await userEvent.keyboard(" ");
    await waitFor(() => expect(status).toHaveTextContent("2 households selected"));
    // Into the bar: one Tab stop, landing on the first action that works.
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    const announcement = canvas.getByRole("button", { name: /Announcement/ });
    await expect(announcement).toHaveFocus();
    // The disabled action stays reachable, so its reason is read with it.
    await userEvent.keyboard("{ArrowLeft}");
    const dues = canvas.getByRole("button", { name: /Request dues/ });
    await expect(dues).toHaveFocus();
    await expect(dues).toHaveAttribute("aria-disabled", "true");
    await expect(dues).toHaveAccessibleDescription(dueReason);
    await userEvent.keyboard("{ArrowRight}{Enter}");
    await expect(announce).toHaveBeenCalled();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    await expect(canvas.getByRole("button", { name: "Clear selection" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(status).toHaveTextContent("Selection cleared"));
    await expect(canvas.queryByRole("toolbar", { name: "Selection actions" })).toBeNull();
    await expect(canvas.getAllByRole("checkbox")[0]).toHaveFocus();
    // An action that empties the selection hands focus back the same way.
    await userEvent.keyboard(" ");
    await waitFor(() => expect(status).toHaveTextContent("1 household selected"));
    for (const _ of homes) await userEvent.tab();
    await expect(canvas.getByRole("button", { name: /Announcement/ })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("button", { name: /Archive/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(status).toHaveTextContent("Selection cleared"));
    await expect(canvas.queryByRole("toolbar", { name: "Selection actions" })).toBeNull();
    await expect(canvas.getAllByRole("checkbox")[0]).toHaveFocus();
  },
};
