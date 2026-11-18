import type { Meta, StoryObj } from "@storybook/react-vite";
import { Download, FileUp, Layers, Mail, Plus, Send, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Chip } from "#avenue/components/chip";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "#avenue/components/menu";
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
          <Menu>
            <ToolbarItem aria-label="Group by" render={<MenuTrigger render={<ToolbarButton />} />}>
              <Layers aria-hidden />
            </ToolbarItem>
            <MenuContent align="end" className="w-44">
              <MenuItem>Street</MenuItem>
              <MenuItem>No grouping</MenuItem>
            </MenuContent>
          </Menu>
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
    // The reason doesn't widen Import's column: Import to Export is gap-controls, like every other gap (AVE-86), and
    // the reason wraps to Import's width without reaching under Export (AVE-160).
    const actionRow = toolbar.querySelector<HTMLElement>("[data-slot=toolbar-actions]")!;
    const gap = parseFloat(getComputedStyle(actionRow).columnGap);
    const exportButton = bar.getByRole("button", { name: /Export/ });
    await expect(Math.round(exportButton.getBoundingClientRect().left - importButton.getBoundingClientRect().right)).toBe(gap);
    const reason = actionRow.querySelector<HTMLElement>("[data-slot=toolbar-actions-reason]")!;
    const text = document.createRange();
    text.selectNodeContents(reason);
    for (const line of text.getClientRects()) {
      await expect(Math.round(line.left)).toBeGreaterThanOrEqual(Math.floor(importButton.getBoundingClientRect().left));
      await expect(Math.round(line.right)).toBeLessThanOrEqual(Math.ceil(importButton.getBoundingClientRect().right));
    }
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
    // Every control is spaced by gap-controls alone, More included (AVE-86).
    const gap = parseFloat(getComputedStyle(canvasElement.querySelector("[data-slot=toolbar-controls]")!).columnGap);
    const before = bar.getByRole("button", { name: "Display options" });
    await expect(Math.round(more.getBoundingClientRect().left - before.getBoundingClientRect().right)).toBe(gap);
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

// A send carries `confirm`, so an agent asks a person before it runs (AGENTS.md rule 9, AVE-85). The attribute is on
// the button at 1100px and up, and on the More item below it.
const sendNotices = fn();
const mailLetters = fn();
const sends: ToolbarAction[] = [
  { id: "mail", label: "Mail letters", icon: <Mail aria-hidden />, confirm: "Mails 42 dues letters", onSelect: mailLetters },
];
const sendPrimary: ToolbarAction = {
  id: "send",
  label: "Send notices",
  icon: <Send aria-hidden />,
  confirm: "Sends 42 dues notices",
  onSelect: sendNotices,
};

function NoticesToolbar() {
  return (
    <div className="min-h-[360px] bg-background">
      <Toolbar aria-label="Dues notices">
        <ToolbarControls>
          <ToolbarSearch placeholder="Search notices…" aria-label="Search notices" />
          <ToolbarActions actions={sends} primary={sendPrimary} />
        </ToolbarControls>
      </Toolbar>
    </div>
  );
}

/** 1440px: Send notices and Mail letters are buttons, and each asks an agent to confirm before it runs. */
export const SendsAskFirst: Story = {
  globals: wide,
  tags: ["agent"],
  render: () => <NoticesToolbar />,
  play: async ({ canvas }) => {
    const bar = within(canvas.getByRole("toolbar", { name: "Dues notices" }));
    await expect(bar.getByRole("button", { name: /Send notices/ })).toHaveAttribute(
      "data-agent-confirm",
      "Sends 42 dues notices",
    );
    await expect(bar.getByRole("button", { name: /Mail letters/ })).toHaveAttribute(
      "data-agent-confirm",
      "Mails 42 dues letters",
    );
  },
};

/** 900px: Mail letters folds into More and keeps its confirmation there. */
export const SendsAskFirstFolded: Story = {
  globals: desktop,
  tags: ["agent"],
  render: () => <NoticesToolbar />,
  play: async ({ canvas, canvasElement }) => {
    const bar = within(canvas.getByRole("toolbar", { name: "Dues notices" }));
    await expect(bar.getByRole("button", { name: /Send notices/ })).toHaveAttribute(
      "data-agent-confirm",
      "Sends 42 dues notices",
    );
    await expect(bar.queryByRole("button", { name: /Mail letters/ })).toBeNull();
    bar.getByRole("button", { name: "More actions" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    const mail = await within(canvasElement.ownerDocument.body).findByRole("menuitem", { name: /Mail letters/ });
    await expect(mail).toHaveAttribute("data-agent-confirm", "Mails 42 dues letters");
    await userEvent.keyboard("{Escape}");
    await expect(mailLetters).not.toHaveBeenCalled();
  },
};

/** The wide breakpoint is one value: the toolbar's fold reads the `--breakpoint-wide` token the `wide:` variant uses. */
export const WideIsAToken: Story = {
  globals: wide,
  render: () => <NoticesToolbar />,
  play: async ({ canvasElement }) => {
    const width = getComputedStyle(canvasElement.ownerDocument.documentElement).getPropertyValue("--breakpoint-wide");
    await expect(width.trim()).toBe("68.75rem");
  },
};

// AVE-87: a stand-in for the wide (1100px) query, so a story can cross the fold without resizing the window. It goes in
// before render, because the toolbar subscribes to the query when it mounts.
const fold = { wide: true, listeners: new Set<() => void>() };
function stubFold() {
  const real = window.matchMedia.bind(window);
  fold.wide = true;
  fold.listeners.clear();
  window.matchMedia = (query: string) => {
    // The toolbar asks for `(min-width: <--breakpoint-wide>)`, 1100px however the token spells it.
    const wideQuery = `(min-width: ${getComputedStyle(document.documentElement).getPropertyValue("--breakpoint-wide").trim()})`;
    if (query !== wideQuery) return real(query);
    return {
      media: query,
      get matches() {
        return fold.wide;
      },
      onchange: null,
      addEventListener: (_: string, listener: () => void) => fold.listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => fold.listeners.delete(listener),
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  };
  return () => {
    window.matchMedia = real;
  };
}
function crossFold(toWide: boolean) {
  fold.wide = toWide;
  for (const listener of [...fold.listeners]) listener();
}

/**
 * Focus on Export when the window narrows past 1100px moves to More, not to the page; widening again puts it on
 * the first action, Import (AVE-87).
 */
export const FoldKeepsFocus: Story = {
  globals: wide,
  beforeEach: stubFold,
  render: () => <HouseholdsToolbar />,
  play: async ({ canvas }) => {
    const bar = within(canvas.getByRole("toolbar", { name: "Households" }));
    bar.getByRole("button", { name: /Export/ }).focus();
    crossFold(false);
    await waitFor(() => expect(bar.getByRole("button", { name: "More actions" })).toHaveFocus());
    crossFold(true);
    await waitFor(() => expect(bar.getByRole("button", { name: /Import/ })).toHaveFocus());
    // Focus elsewhere stays where it is.
    const search = bar.getByRole("searchbox", { name: "Search households or people" });
    search.focus();
    crossFold(false);
    await waitFor(() => expect(bar.getByRole("button", { name: "More actions" })).toBeVisible());
    await expect(search).toHaveFocus();
    // The bar keeps one Tab stop through it all.
    await expect(bar.getAllByRole("button").filter((b) => b.tabIndex === 0).length + (search.tabIndex === 0 ? 1 : 0)).toBe(1);
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
            <MenuItem onSelect={newHousehold}>Household</MenuItem>
            <MenuItem>Announcement</MenuItem>
          </>
        }
        moreMenu={
          <>
            <MenuItem>Group by street</MenuItem>
            <MenuItem disabled disabledReason={importReason}>
              Import households
            </MenuItem>
          </>
        }
      />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const bar = within(canvas.getByRole("toolbar", { name: "Households" }));
    // The chip row fades its last 28px at 700px and narrower, and drops the fade once scrolled to its end (AVE-86).
    const chips = canvasElement.querySelector<HTMLElement>("[data-slot=chip-row]")!;
    if (innerWidth <= 700) {
      await expect(getComputedStyle(chips).maskImage).toContain("linear-gradient");
      chips.scrollLeft = chips.scrollWidth;
      await waitFor(() => expect(chips).toHaveAttribute("data-scroll-end"));
      await expect(getComputedStyle(chips).maskImage).toBe("none");
      chips.scrollLeft = 0;
      await waitFor(() => expect(chips).not.toHaveAttribute("data-scroll-end"));
    }
    // Controls that share a row share a height (AVE-2 §2, AVE-94): 44px with the search field on a touch screen, 32px
    // with a mouse.
    const heights = [bar.getByRole("searchbox"), bar.getByRole("button", { name: /New/ }), bar.getByRole("button", { name: "More" })].map(
      (control) => control.getBoundingClientRect().height,
    );
    await expect(heights).toEqual(Array(3).fill(matchMedia("(pointer: coarse)").matches ? 44 : 32));
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

// AVE-160: three disabled actions whose reasons are wider than their buttons. Each reason wraps to its own button's
// width, and neighbours that share a reason share one line as wide as both, so no two lines ever print over each other.
// The board's Dues toolbar at 1280px, for an association with no households, is where they first met.
const boardWidth = {
  viewport: {
    options: { board: { name: "Board (1280px)", styles: { width: "1280px", height: "700px" }, type: "desktop" } },
  },
};
const board = { viewport: { value: "board", isRotated: false } };

const longReasons: ToolbarAction[] = [
  {
    id: "payment",
    label: "Record payment",
    icon: <Plus aria-hidden />,
    disabledReason: "Add a household to this view before recording a payment.",
  },
  { id: "notice", label: "Late-dues notice", disabledReason: "Nobody in this view is late, so there is no one to remind." },
];
const longPrimary: ToolbarAction = {
  id: "request",
  label: "Request dues",
  icon: <Mail aria-hidden />,
  disabledReason: "Set this year's dues amount before you ask anyone to pay.",
};

const sharedReason = "No households in this view.";
const sharedReasons: ToolbarAction[] = [
  { id: "payment", label: "Record payment", icon: <Plus aria-hidden />, disabledReason: sharedReason },
  { id: "notice", label: "Late-dues notice", disabledReason: sharedReason },
];
const sharedPrimary: ToolbarAction = {
  id: "request",
  label: "Request dues",
  icon: <Mail aria-hidden />,
  disabledReason: "No one in this view owes dues.",
};

function DuesToolbar({ actions: dues, primary }: { actions: ToolbarAction[]; primary: ToolbarAction }) {
  return (
    <div className="min-h-[320px] bg-background">
      <Toolbar aria-label="Dues">
        <ToolbarControls>
          <ToolbarActions actions={dues} primary={primary} />
        </ToolbarControls>
      </Toolbar>
    </div>
  );
}

/** No two reason lines overlap, none runs past the buttons it captions, and each disabled button is described by its line. */
async function expectReasonsApart(canvasElement: HTMLElement, expected: Record<string, string>) {
  const bar = within(canvasElement.querySelector<HTMLElement>("[role=toolbar]")!);
  const lines = [...canvasElement.querySelectorAll<HTMLElement>("[data-slot=toolbar-actions-reason]")];
  const boxes = lines.map((line) => {
    const text = document.createRange();
    text.selectNodeContents(line);
    return { line, rects: [...text.getClientRects()] };
  });
  for (const [i, a] of boxes.entries())
    for (const b of boxes.slice(i + 1))
      for (const r of a.rects)
        for (const s of b.rects) {
          const apart = r.right <= s.left || s.right <= r.left || r.bottom <= s.top || s.bottom <= r.top;
          await expect(apart, `"${a.line.textContent}" overlaps "${b.line.textContent}"`).toBe(true);
        }
  for (const [name, reason] of Object.entries(expected)) {
    const button = bar.getByRole("button", { name: new RegExp(name) });
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(button).toHaveAccessibleDescription(reason);
  }
  // Each line stays within the buttons it captions.
  for (const { line, rects } of boxes) {
    const captioned = [...canvasElement.querySelectorAll<HTMLElement>("[data-slot=toolbar-actions] button")].filter((b) =>
      b.getAttribute("aria-describedby")?.split(" ").includes(line.id),
    );
    await expect(captioned.length).toBeGreaterThan(0);
    const left = Math.min(...captioned.map((b) => b.getBoundingClientRect().left));
    const right = Math.max(...captioned.map((b) => b.getBoundingClientRect().right));
    for (const r of rects) {
      await expect(Math.round(r.left)).toBeGreaterThanOrEqual(Math.floor(left));
      await expect(Math.round(r.right)).toBeLessThanOrEqual(Math.ceil(right));
    }
  }
  return lines;
}

/** 1280px: three different long reasons, each wrapped to its own button. */
export const LongReasons: Story = {
  globals: board,
  parameters: boardWidth,
  render: () => <DuesToolbar actions={longReasons} primary={longPrimary} />,
  play: async ({ canvasElement }) => {
    const lines = await expectReasonsApart(canvasElement, {
      "Record payment": "Add a household to this view before recording a payment.",
      "Late-dues notice": "Nobody in this view is late, so there is no one to remind.",
      "Request dues": "Set this year's dues amount before you ask anyone to pay.",
    });
    await expect(lines).toHaveLength(3);
    // Still one Tab stop, and the arrows reach every disabled action.
    await userEvent.tab();
    await expect(within(canvasElement).getByRole("button", { name: /Record payment/ })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(within(canvasElement).getByRole("button", { name: /Late-dues notice/ })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(within(canvasElement).getByRole("button", { name: /Request dues/ })).toHaveFocus();
  },
};

/** 1280px: Record payment and Late-dues notice share a reason, so they share one line; Request dues has its own. */
export const SharedReason: Story = {
  globals: board,
  parameters: boardWidth,
  render: () => <DuesToolbar actions={sharedReasons} primary={sharedPrimary} />,
  play: async ({ canvasElement }) => {
    const lines = await expectReasonsApart(canvasElement, {
      "Record payment": sharedReason,
      "Late-dues notice": sharedReason,
      "Request dues": "No one in this view owes dues.",
    });
    await expect(lines.map((line) => line.textContent)).toEqual([sharedReason, "No one in this view owes dues."]);
  },
};

/** A phone: the actions fold into More, which keeps each reason under its item; Request dues' reason wraps to it. */
export const LongReasonsPhone: Story = {
  globals: phone,
  render: () => <DuesToolbar actions={longReasons} primary={longPrimary} />,
  play: async ({ canvasElement }) => {
    await expectReasonsApart(canvasElement, { "Request dues": "Set this year's dues amount before you ask anyone to pay." });
    const bar = within(canvasElement.querySelector<HTMLElement>("[role=toolbar]")!);
    await userEvent.tab();
    await expect(bar.getByRole("button", { name: "More actions" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    const page = within(canvasElement.ownerDocument.body);
    const item = await page.findByRole("menuitem", { name: /Record payment/ });
    await expect(item).toHaveAccessibleDescription("Add a household to this view before recording a payment.");
    await expect(await page.findByRole("menuitem", { name: /Late-dues notice/ })).toHaveAccessibleDescription(
      "Nobody in this view is late, so there is no one to remind.",
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(bar.getByRole("button", { name: "More actions" })).toHaveFocus());
  },
};

/** A phone with the shared reasons folded into More: Request dues' own reason is the only line on the bar. */
export const SharedReasonPhone: Story = {
  globals: phone,
  render: () => <DuesToolbar actions={sharedReasons} primary={sharedPrimary} />,
  play: async ({ canvasElement }) => {
    const lines = await expectReasonsApart(canvasElement, { "Request dues": "No one in this view owes dues." });
    await expect(lines).toHaveLength(1);
    const bar = within(canvasElement.querySelector<HTMLElement>("[role=toolbar]")!);
    bar.getByRole("button", { name: "More actions" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    const page = within(canvasElement.ownerDocument.body);
    await expect(await page.findByRole("menuitem", { name: /Record payment/ })).toHaveAccessibleDescription(sharedReason);
    await userEvent.keyboard("{Escape}");
  },
};
