import type { Meta, StoryObj } from "@storybook/react-vite";
import { Download, FileUp, Layers, Plus, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Chip } from "#avenue/components/chip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "#avenue/components/dropdown-menu";
import {
  PhoneToolbar,
  Toolbar,
  ToolbarActions,
  ToolbarControls,
  ToolbarFilters,
  ToolbarItem,
  ToolbarSearch,
  type ToolbarAction,
} from "#avenue/components/toolbar";
import { ToolbarButton } from "#avenue/components/toolbar-button";

// AVE-9 part 4: the page toolbar and the phone toolbar. Counts and labels are fictional.

const meta = { title: "Composites/Toolbar", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const desktop = { viewport: { value: "desktop", isRotated: false } };
const wide = { viewport: { value: "wide", isRotated: false } };
const phone = { viewport: { value: "phone", isRotated: false } };

const filters = [
  { id: "attention", label: "Needs attention", count: 10 },
  { id: "owing", label: "Balance owing", count: 9 },
  { id: "complaints", label: "Open complaints", count: 4 },
  { id: "contact", label: "Needs contact", count: 3 },
];

const importReason = "Set up dues first.";
const exportHouseholds = fn();
const addHousehold = fn();

const actions: ToolbarAction[] = [
  { id: "import", label: "Import", icon: <FileUp aria-hidden />, disabledReason: importReason },
  { id: "export", label: "Export", icon: <Download aria-hidden />, onSelect: exportHouseholds },
];

function Filters() {
  const [on, setOn] = useState<string[]>([]);
  return (
    <ToolbarFilters>
      {filters.map((f) => (
        <Chip
          key={f.id}
          count={f.count}
          pressed={on.includes(f.id)}
          onPressedChange={(pressed) => setOn((now) => (pressed ? [...now, f.id] : now.filter((id) => id !== f.id)))}
        >
          {f.label}
        </Chip>
      ))}
    </ToolbarFilters>
  );
}

function HouseholdsToolbar() {
  return (
    <div className="min-h-[360px] bg-background">
      <Toolbar aria-label="Households">
        <Filters />
        <ToolbarControls>
          <ToolbarSearch placeholder="Search households or people…" aria-label="Search households or people" kbd="/" />
          <DropdownMenu>
            <ToolbarItem aria-label="Group by" render={<DropdownMenuTrigger render={<ToolbarButton />} />}>
              <Layers aria-hidden />
            </ToolbarItem>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem>Street</DropdownMenuItem>
              <DropdownMenuItem>No grouping</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ToolbarItem aria-label="Display options" render={<ToolbarButton />}>
            <SlidersHorizontal aria-hidden />
          </ToolbarItem>
          <ToolbarActions
            actions={actions}
            primary={{ id: "add", label: "Add household", icon: <Plus aria-hidden />, onSelect: addHousehold }}
          />
        </ToolbarControls>
      </Toolbar>
      <div className="px-page py-inset">
        <Button variant="outline">After the toolbar</Button>
      </div>
    </div>
  );
}

/** 1440px: every action is a button; Import shows why it's unavailable under it. */
export const Wide: Story = {
  globals: wide,
  tags: ["agent"],
  render: () => <HouseholdsToolbar />,
  play: async ({ canvas }) => {
    const toolbar = canvas.getByRole("toolbar", { name: "Households" });
    const bar = within(toolbar);
    await expect(bar.getByRole("button", { name: /Export/ })).toBeVisible();
    const importButton = bar.getByRole("button", { name: /Import/ });
    await expect(importButton).toHaveAttribute("aria-disabled", "true");
    await expect(importButton).toHaveAccessibleDescription(importReason);
    await expect(bar.queryByRole("button", { name: "More actions" })).toBeNull();
  },
};

/** 900px, the desktop window minimum: the actions fold into More, and Import keeps its reason there. */
export const DesktopMinimum: Story = {
  globals: desktop,
  render: () => <HouseholdsToolbar />,
  play: async ({ canvas, canvasElement }) => {
    const bar = within(canvas.getByRole("toolbar", { name: "Households" }));
    await expect(bar.queryByRole("button", { name: /Export/ })).toBeNull();
    const more = bar.getByRole("button", { name: "More actions" });
    more.focus();
    await userEvent.keyboard("{ArrowDown}");
    const page = within(canvasElement.ownerDocument.body);
    const importItem = await page.findByRole("menuitem", { name: /Import/ });
    await expect(importItem).toHaveAttribute("aria-disabled", "true");
    await expect(importItem).toHaveAccessibleDescription(importReason);
    await waitFor(() => expect(page.getByText(importReason)).toBeVisible());
    // Choose Export by keyboard: the menu closes and focus goes back to More.
    await waitFor(() => expect(importItem).toHaveFocus());
    await userEvent.keyboard("{ArrowDown}");
    await expect(page.getByRole("menuitem", { name: /Export/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(exportHouseholds).toHaveBeenCalled();
    await waitFor(() => expect(more).toHaveFocus());
  },
};

// The fold's edge (AVE-9: actions fold into More below 1100px). The stories above sit at 900 and 1440, so a moved
// breakpoint passed them; these pin both sides of it, and 1100 is the narrowest window that has to fit every button.
const foldEdge = {
  viewport: {
    options: {
      atFold: { name: "At the fold (1100px)", styles: { width: "1100px", height: "700px" }, type: "desktop" },
      belowFold: { name: "Below the fold (1099px)", styles: { width: "1099px", height: "700px" }, type: "desktop" },
    },
  },
};

/** 1100px, the narrowest window where the actions stay buttons. */
export const AtTheFold: Story = {
  globals: { viewport: { value: "atFold", isRotated: false } },
  parameters: foldEdge,
  render: () => <HouseholdsToolbar />,
  play: async ({ canvas }) => {
    const bar = within(canvas.getByRole("toolbar", { name: "Households" }));
    await expect(bar.getByRole("button", { name: /Export/ })).toBeVisible();
    await expect(bar.getByRole("button", { name: /Import/ })).toHaveAccessibleDescription(importReason);
    await expect(bar.queryByRole("button", { name: "More actions" })).toBeNull();
  },
};

/** 1099px: one pixel narrower, the actions fold into More. */
export const BelowTheFold: Story = {
  globals: { viewport: { value: "belowFold", isRotated: false } },
  parameters: foldEdge,
  render: () => <HouseholdsToolbar />,
  play: async ({ canvas }) => {
    const bar = within(canvas.getByRole("toolbar", { name: "Households" }));
    await expect(bar.getByRole("button", { name: "More actions" })).toBeVisible();
    await expect(bar.queryByRole("button", { name: /Export/ })).toBeNull();
  },
};

/** One Tab stop: Tab lands on the first chip, the arrows cross chips, search and buttons, and Tab leaves. */
export const KeyboardFlow: Story = {
  globals: wide,
  render: () => <HouseholdsToolbar />,
  play: async ({ canvas }) => {
    const bar = within(canvas.getByRole("toolbar", { name: "Households" }));
    await userEvent.tab();
    const first = bar.getByRole("button", { name: /Needs attention/ });
    await expect(first).toHaveFocus();
    // Arrows move without pressing: the chip stays off.
    await userEvent.keyboard("{ArrowRight}");
    await expect(bar.getByRole("button", { name: /Balance owing/ })).toHaveFocus();
    await expect(first).toHaveAttribute("aria-pressed", "false");
    await userEvent.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    const search = bar.getByRole("searchbox", { name: "Search households or people" });
    await expect(search).toHaveFocus();
    // The field keeps its keys while typing; at the end of its text, ArrowRight moves on.
    await userEvent.keyboard("Birch");
    await expect(search).toHaveValue("Birch");
    await userEvent.keyboard("{ArrowLeft}");
    await expect(search).toHaveFocus();
    await userEvent.keyboard("{End}{ArrowRight}");
    await expect(bar.getByRole("button", { name: "Group by" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(bar.getByRole("button", { name: "Display options" })).toHaveFocus();
    // A disabled action stays reachable, so its reason can be read.
    await userEvent.keyboard("{ArrowRight}");
    await expect(bar.getByRole("button", { name: /Import/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{End}");
    await expect(bar.getByRole("button", { name: /Add household/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(addHousehold).toHaveBeenCalled();
    // Space presses a chip.
    await userEvent.keyboard("{Home} ");
    await expect(first).toHaveAttribute("aria-pressed", "true");
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "After the toolbar" })).toHaveFocus();
    // Shift+Tab comes back to the item focused last.
    await userEvent.tab({ shift: true });
    await expect(first).toHaveFocus();
  },
};

const newHousehold = fn();

/** The phone toolbar: search, New and More on one row, the chips as one scrolling strip under it. */
export const Phone: Story = {
  globals: phone,
  render: () => (
    <div className="min-h-[400px] bg-background">
      <PhoneToolbar
        aria-label="Households"
        searchProps={{ "aria-label": "Search households" }}
        filters={filters.map((f) => (
          <Chip key={f.id} count={f.count}>
            {f.label}
          </Chip>
        ))}
        newMenu={
          <>
            <DropdownMenuItem onSelect={newHousehold}>Household</DropdownMenuItem>
            <DropdownMenuItem>Announcement</DropdownMenuItem>
          </>
        }
        moreMenu={
          <>
            <DropdownMenuItem>Group by street</DropdownMenuItem>
            <DropdownMenuItem disabled reason={importReason}>
              Import households
            </DropdownMenuItem>
          </>
        }
      />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const bar = within(canvas.getByRole("toolbar", { name: "Households" }));
    await userEvent.tab();
    await expect(bar.getByRole("searchbox", { name: "Search households" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    const newButton = bar.getByRole("button", { name: /New/ });
    await expect(newButton).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    const page = within(canvasElement.ownerDocument.body);
    const item = await page.findByRole("menuitem", { name: "Household" });
    await waitFor(() => expect(item).toHaveFocus());
    await userEvent.keyboard("{Enter}");
    await expect(newHousehold).toHaveBeenCalled();
    await waitFor(() => expect(newButton).toHaveFocus());
    await userEvent.keyboard("{ArrowRight}");
    await expect(bar.getByRole("button", { name: "More" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(bar.getByRole("button", { name: /Needs attention/ })).toHaveFocus();
  },
};
