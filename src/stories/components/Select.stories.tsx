import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { HouseIcon } from "lucide-react";
import { Button } from "#avenue/components/button";
import { Combobox } from "#avenue/components/combobox";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "#avenue/components/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "#avenue/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type ListData,
  type ListItem,
} from "#avenue/components/select";
import { createAgent } from "@ui-sdk/react/agent";
import { cn } from "#avenue/lib/utils";
import { expectListSheet, swipeDown, waitForClosed } from "./sheet-kit";

// AVE-7. One Select for the app's 20 native selects. md (32px, lg corner) by default; sm (28px, md corner) in a card
// or dialog header; never a pill. All data is fictional.

const methods: ListItem[] = [
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
  { value: "money-order", label: "Money order" },
  { value: "other", label: "Other" },
];

const years: ListItem[] = ["2027", "2026", "2025"].map((y) => ({ value: y, label: y }));

const roles: ListItem[] = [
  { value: "president", label: "President" },
  { value: "treasurer", label: "Treasurer" },
  { value: "secretary", label: "Secretary" },
  { value: "member", label: "Member at large" },
  { value: "past", label: "Past president (non-voting, keeps read access to the register)", disabled: true },
];

const long: ListItem[] = [
  { value: "a", label: "Late dues notice, second reminder, sent by mail and email to the owner of record" },
  { value: "b", label: "Architectural review request for exterior paint colour, fence or landscaping changes" },
  { value: "c", label: "Short" },
];

/** Avenue's Field (AVE-6) labels the Select, describes it and shows its error. */
function Labelled({
  label,
  description,
  error,
  invalid,
  children,
  className,
}: {
  label: string;
  description?: string;
  error?: string;
  invalid?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Field {...(invalid ? { invalid: true } : {})} className={cn("w-64", className)}>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

const phone = { viewport: { value: "phone", isRotated: false } };
const coarse = () => matchMedia("(pointer: coarse)").matches;

/** True while the open list presents as a bottom sheet (ui-sdk's `data-presentation`, AVE-39). */
function isSheet(content: Element) {
  return content.getAttribute("data-presentation") === "sheet";
}


const meta = {
  title: "Components/Select",
  component: Select,
  parameters: { layout: "padded" },
  args: { items: methods, placeholder: "Choose a method", native: "never" },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Labelled label="Payment method">
      <Select {...args} />
    </Labelled>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="grid w-72 gap-section">
      <Labelled label="md · 32px, lg corner (default)">
        <Select items={methods} defaultValue="check" native="never" />
      </Labelled>
      <Labelled label="sm · 28px, md corner (card or dialog header)">
        <Select items={methods} defaultValue="check" size="sm" native="never" />
      </Labelled>
    </div>
  ),
};

export const Placeholder: Story = {
  render: () => (
    <Labelled label="Payment method">
      <Select items={methods} placeholder="Choose a method" native="never" />
    </Labelled>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Labelled label="Payment method" description="Resolve the household first.">
      <Select items={methods} defaultValue="check" disabled native="never" />
    </Labelled>
  ),
};

export const DisabledOption: Story = {
  name: "Disabled option",
  render: () => (
    <Labelled label="Board role">
      <Select items={roles} defaultValue="treasurer" native="never" />
    </Labelled>
  ),
  play: async ({ canvas }) => {
    // The list is as wide as its field (UI Designer, AVE-7); a long option wraps instead of widening it.
    const trigger = canvas.getByRole("combobox", { name: "Board role" });
    await userEvent.click(trigger);
    const list = await screen.findByRole("listbox");
    const popup = list.closest("[data-slot=select-content]") ?? list;
    // On a phone the list is a sheet as wide as the screen (AVE-39).
    const width = isSheet(popup) ? innerWidth : trigger.getBoundingClientRect().width;
    await waitFor(() => expect(Math.round(popup.getBoundingClientRect().width)).toBe(Math.round(width)));
    await expect(screen.getByRole("option", { name: /Past president/ })).toHaveAttribute("aria-disabled", "true");
  },
};

export const Invalid: Story = {
  render: () => (
    <Labelled label="Payment method" invalid error="Choose how the payment was made.">
      <Select items={methods} placeholder="Choose a method" native="never" />
    </Labelled>
  ),
};

export const LongOptions: Story = {
  name: "Long options",
  render: () => (
    <Labelled label="Template">
      <Select items={long} defaultValue="a" native="never" />
    </Labelled>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Template" });
    // The closed control keeps its width and truncates; the open list wraps up to its max width.
    await expect(trigger.getBoundingClientRect().width).toBeLessThanOrEqual(256);
    // On a phone (the touch story-test project) an md select matches the 44px text fields (AVE-22).
    await expect(trigger.getBoundingClientRect().height).toBe(matchMedia("(pointer: coarse)").matches ? 44 : 32);
  },
};

export const NativeOnPhones: Story = {
  name: "Native list (phones)",
  render: () => (
    <div className="grid w-72 gap-section">
      <Labelled label="Payment method (OS picker)">
        <Select items={methods} placeholder="Choose a method" native="always" />
      </Labelled>
      <Labelled label="Same field, Avenue list">
        <Select items={methods} placeholder="Choose a method" native="never" />
      </Labelled>
    </div>
  ),
  play: async ({ canvas }) => {
    // On touch-first devices the OS picker opens, but the closed control is the same: height, corner, border.
    const native = canvas.getByRole("combobox", { name: "Payment method (OS picker)" });
    const avenue = canvas.getByRole("combobox", { name: "Same field, Avenue list" });
    await expect(native.tagName).toBe("SELECT");
    const a = getComputedStyle(native);
    const b = getComputedStyle(avenue);
    await expect(native.getBoundingClientRect().height).toBe(avenue.getBoundingClientRect().height);
    await expect(a.borderTopLeftRadius).toBe(b.borderTopLeftRadius);
    await expect(a.borderTopColor).toBe(b.borderTopColor);
    await userEvent.selectOptions(native, "cash");
    await expect(native).toHaveValue("cash");
  },
};

/**
 * AVE-145: the OS picker reports a choice as ui-sdk does, with details Avenue builds (reason "item-press", the select's
 * change event, how it was chosen), and `details.cancel()` puts the old value back. Here cash is refused, as an app
 * might refuse a method it doesn't take.
 */
export const NativeRefusesAChange: Story = {
  name: "Native list refuses a change",
  render: function Render() {
    const [heard, setHeard] = useState("");
    return (
      <div className="grid w-72 gap-group">
        <Labelled label="Payment method">
          <Select
            items={methods}
            defaultValue="check"
            native="always"
            onValueChange={(value, details) => {
              setHeard(`${value}, ${details.reason}, ${details.event?.type ?? "no event"}`);
              if (value === "cash") details.cancel();
            }}
          />
        </Labelled>
        <output data-testid="heard" className="text-meta text-muted-foreground">
          {heard}
        </output>
      </div>
    );
  },
  play: async ({ canvas }) => {
    const select = canvas.getByRole("combobox", { name: "Payment method" });
    await userEvent.selectOptions(select, "cash");
    await expect(canvas.getByTestId("heard")).toHaveTextContent("cash, item-press, change");
    await expect(select).toHaveValue("check");
    await userEvent.selectOptions(select, "bank");
    await expect(select).toHaveValue("bank");
  },
};

/** The keyboard and labelling contract: open, arrows, type-ahead, Escape keeps the old value. */
export const Keyboard: Story = {
  render: function Render() {
    const [value, setValue] = useState<string | null>("check");
    return (
      <div className="grid gap-group">
        <Labelled label="Payment method">
          <Select items={methods} value={value} onValueChange={setValue} native="never" />
        </Labelled>
        <output className="text-meta text-muted-foreground" data-testid="value">
          Chosen: {value}
        </output>
      </div>
    );
  },
  play: async ({ canvas, step }) => {
    const trigger = canvas.getByRole("combobox", { name: "Payment method" });

    await step("labelled by its Field label", async () => {
      await expect(trigger).toHaveAccessibleName("Payment method");
      await expect(trigger).toHaveTextContent("Check");
    });

    await step("Tab focuses it; ArrowDown opens the list", async () => {
      await userEvent.tab();
      await expect(trigger).toHaveFocus();
      await userEvent.keyboard("{ArrowDown}");
      const list = await screen.findByRole("listbox");
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await waitFor(() => expect(within(list).getByRole("option", { name: "Check" })).toHaveFocus());
    });

    await step("arrows move; Enter chooses", async () => {
      await userEvent.keyboard("{ArrowDown}");
      await waitFor(() => expect(screen.getByRole("option", { name: "Cash" })).toHaveFocus());
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
      await expect(canvas.getByTestId("value")).toHaveTextContent("cash");
      await expect(trigger).toHaveFocus();
    });

    await step("type-ahead jumps to a match", async () => {
      await userEvent.keyboard("{Enter}");
      await screen.findByRole("listbox");
      await userEvent.keyboard("mo");
      await waitFor(() => expect(screen.getByRole("option", { name: "Money order" })).toHaveFocus());
    });

    await step("Escape closes and keeps the old value", async () => {
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
      await expect(canvas.getByTestId("value")).toHaveTextContent("cash");
      await expect(trigger).toHaveTextContent("Cash");
      await expect(trigger).toHaveFocus();
    });

    await step("Space opens it too", async () => {
      await userEvent.keyboard(" ");
      await screen.findByRole("listbox");
      await userEvent.keyboard("{Escape}");
      await waitForClosed("select");
    });
  },
};

/**
 * AVE-209: the highlighted row (a faint brand tint, `accent`) beside the chosen one (its check). Cash is chosen; the
 * arrow has moved on to Bank transfer. The tint is the only fill in the list, so it reads as "you're here", and the
 * chosen row keeps the popover's own colour and its check, so the two never look alike. Captured open, light and dark.
 */
export const HighlightedAndChosen: Story = {
  name: "Highlighted and chosen",
  render: () => (
    <Labelled label="Payment method">
      <Select items={methods} defaultValue="cash" native="never" />
    </Labelled>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Payment method" });
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    const list = await screen.findByRole("listbox");
    const chosen = within(list).getByRole("option", { name: "Cash" });
    await waitFor(() => expect(chosen).toHaveFocus());
    await userEvent.keyboard("{ArrowDown}");
    const highlighted = within(list).getByRole("option", { name: "Bank transfer" });
    await waitFor(() => expect(highlighted).toHaveAttribute("data-highlighted"));
    await expect(chosen).toHaveAttribute("aria-selected", "true");
    await expect(chosen).not.toHaveAttribute("data-highlighted");
    await expect(highlighted).toHaveAttribute("aria-selected", "false");
    // The tint shows on the popover; the chosen row doesn't wear it.
    const popup = list.closest<HTMLElement>("[data-slot=select-content]") ?? list;
    const fill = (el: Element) => getComputedStyle(el).backgroundColor;
    const surface = fill(popup);
    await waitFor(() => expect(fill(highlighted)).not.toBe(surface));
    await expect(fill(chosen)).not.toBe(fill(highlighted));
  },
};

export const InvalidIsAnnounced: Story = {
  name: "Invalid wiring",
  render: () => (
    <Labelled label="Payment method" invalid error="Choose how the payment was made.">
      <Select items={methods} placeholder="Choose a method" native="never" />
    </Labelled>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Payment method" });
    await expect(trigger).toHaveAttribute("data-invalid");
    await expect(trigger).toHaveAccessibleDescription(/Choose how the payment was made/);
  },
};

// ——— The year select in the Dues card: before (app today) and after (Avenue) ———

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="grid w-96 max-w-full content-start gap-group">
      <figcaption className="text-meta text-muted-foreground">{label}</figcaption>
      {children}
    </figure>
  );
}

const balance = (
  <div className="grid gap-1">
    <p className="text-display leading-tight font-emphasis tabular-nums">$120.00</p>
    <p className="text-meta text-muted-foreground">Outstanding balance</p>
  </div>
);

/**
 * The app today, rebuilt from manyave-management e01cc90: its Card and CardHeader classes (ui/card.tsx), the Dues
 * card header (detail.tsx) and YearSelect (dues.tsx). A copy for comparison only; Avenue never ships it.
 */
function BeforeCard() {
  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground shadow-card ring-1 ring-border">
      <div className="grid auto-rows-min grid-cols-[1fr_auto] items-start gap-1 border-b px-4 pb-3">
        <div className="text-meta font-emphasis tracking-wide text-muted-foreground uppercase">Dues</div>
        <div className="col-start-2 row-span-2 row-start-1 flex items-center gap-1 self-start justify-self-end text-meta text-muted-foreground">
          Account summary ·{" "}
          <select
            aria-label="Dues year"
            defaultValue="2026"
            className="h-[30px] shrink-0 rounded-full border bg-background px-2 text-meta shadow-control outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:[color-scheme:dark]"
          >
            {years.map((y) => (
              <option key={y.value}>{y.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="px-4">{balance}</div>
    </div>
  );
}

/** AVE-2 section 6 on Avenue's Card: an sm Select on the title's line, 16px from the top and right edges. */
function AfterCard() {
  return (
    <Card className="shadow-card ring-border">
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-meta font-emphasis tracking-wide text-muted-foreground uppercase">
          <h2>Dues</h2>
        </CardTitle>
        <CardAction className="flex items-center gap-group text-meta text-muted-foreground">
          <span>Account summary ·</span>
          <Select items={years} defaultValue="2026" size="sm" aria-label="Dues year" native="never" className="w-auto" />
        </CardAction>
      </CardHeader>
      <CardContent>{balance}</CardContent>
    </Card>
  );
}

export const InCardHeader: Story = {
  name: "Inside a card header",
  render: () => (
    <Figure label="Avenue: sm Select in the Dues card header">
      <AfterCard />
    </Figure>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Dues year" });
    const style = getComputedStyle(trigger);
    await expect(trigger.getBoundingClientRect().height).toBe(28);
    await expect(style.borderTopLeftRadius).toBe("8px");
    await userEvent.click(trigger);
    // A narrow field's list is never narrower than 192px. On a phone it is a sheet as wide as the screen (AVE-39).
    const list = await screen.findByRole("listbox");
    const popup = list.closest("[data-slot=select-content]") ?? list;
    await waitFor(() => expect(Math.round(popup.getBoundingClientRect().width)).toBe(isSheet(popup) ? innerWidth : 192));
    await userEvent.click(await screen.findByRole("option", { name: "2025" }));
    await waitForClosed("select");
    await expect(trigger).toHaveTextContent("2025");
  },
};

/** True when the point is painted by `el` or something inside it, so nothing (a card's overflow) cuts it there. */
function paintedAt(el: Element, x: number, y: number) {
  const hit = document.elementFromPoint(x, y);
  return !!hit && (hit === el || el.contains(hit));
}

/**
 * Each corner of the box is painted by the element itself. Chromium hit-tests rounded corners, so each point sits
 * on the straight edge just past the element's own radius, 2px in.
 */
async function expectUncut(el: Element) {
  const r = el.getBoundingClientRect();
  const dx = Math.max(2, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0) + 1;
  for (const [x, y] of [
    [r.left + dx, r.top + 2],
    [r.right - dx, r.top + 2],
    [r.left + dx, r.bottom - 2],
    [r.right - dx, r.bottom - 2],
  ] as const) {
    await expect(paintedAt(el, x, y), `${el.getAttribute("data-slot")} is cut at ${x},${y}`).toBe(
      true,
    );
  }
}

/**
 * Management's dues year picker (Architect, AVE-7): in a rounded, overflow-hidden card at the right edge of the 900px
 * minimum window, the closed sm Select is not cut by the card's corner, and its open list is not clipped by the card.
 */
export const InClippedCardAtEdge: Story = {
  name: "In a clipped card at the window edge",
  // The 900px desktop window is the case, so the touch story-test project keeps its default viewport here instead of
  // the 390px phone (AVE-22); the touch targets are still measured.
  parameters: { layout: "fullscreen", viewport: { disabled: true } },
  render: () => (
    <div className="flex w-225 justify-end p-inset">
      <Card className="w-80 overflow-hidden rounded-xl shadow-card ring-border" data-testid="card">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-meta font-emphasis tracking-wide text-muted-foreground uppercase">
            <h2>Dues</h2>
          </CardTitle>
          <CardAction>
            <Select
              items={years}
              defaultValue="2026"
              size="sm"
              aria-label="Dues year"
              native="never"
              className="w-auto"
            />
          </CardAction>
        </CardHeader>
        <CardContent>{balance}</CardContent>
      </Card>
    </div>
  ),
  play: async ({ canvas, step }) => {
    const card = canvas.getByTestId("card");
    const trigger = canvas.getByRole("combobox", { name: "Dues year" });

    await step("the closed select sits inside the card, uncut", async () => {
      await expect(getComputedStyle(card).overflow).toBe("hidden");
      const c = card.getBoundingClientRect();
      const t = trigger.getBoundingClientRect();
      // Clear of the card's rounded corner on both axes, so the radius can't clip it.
      const radius = parseFloat(getComputedStyle(card).borderTopRightRadius);
      await expect(c.right - t.right).toBeGreaterThanOrEqual(radius / 2);
      await expect(t.top - c.top).toBeGreaterThanOrEqual(radius / 2);
      await expectUncut(trigger);
    });

    await step("the open list is not clipped by the card or the window", async () => {
      await userEvent.click(trigger);
      const list = await screen.findByRole("listbox");
      const popup = list.closest("[data-slot=select-content]") ?? list;
      await waitFor(() => expect(Math.round(popup.getBoundingClientRect().width)).toBe(192));
      const p = popup.getBoundingClientRect();
      // It reaches past the card, and still shows whole.
      await expect(p.bottom).toBeGreaterThan(card.getBoundingClientRect().top + 60);
      await expect(p.left).toBeGreaterThanOrEqual(0);
      await expect(p.right).toBeLessThanOrEqual(window.innerWidth);
      await expectUncut(popup);
      for (const name of ["2027", "2026", "2025"])
        await expectUncut(screen.getByRole("option", { name }));
      await userEvent.keyboard("{Escape}");
    });
  },
};

export const YearSelectBeforeAfter: Story = {
  name: "Year select, before and after",
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-wrap gap-section">
      <Figure label="Before: the app today (30px pill with shadow, top-aligned)">
        <BeforeCard />
      </Figure>
      <Figure label="After: Avenue Select, sm (28px, 8px corner, centred)">
        <AfterCard />
      </Figure>
    </div>
  ),
};

function AgentForm() {
  const [method, setMethod] = useState<string | null>("check");
  const [role, setRole] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-group">
      <Labelled label="Payment method">
        <Select items={methods} value={method} onValueChange={setMethod} native="never" />
      </Labelled>
      <Labelled label="Board role">
        <Select items={roles} value={role} onValueChange={setRole} placeholder="Choose a role" native="never" />
      </Labelled>
      <output data-testid="value" className="text-meta text-muted-foreground">
        Chosen: {method ?? "(none)"} / {role ?? "(none)"}
      </output>
    </div>
  );
}

/** An agent finds each Select by its Field label, reads its value and items, and changes it. */
export const Agent: Story = {
  tags: ["agent"],
  render: () => <AgentForm />,
  play: async ({ canvas }) => {
    const agent = createAgent();
    const selects = agent.snapshot().filter((entry) => !entry.offPage && entry.component === "select");
    await expect(selects.map((entry) => entry.label)).toEqual(["Payment method", "Board role"]);
    const method = selects.find((entry) => entry.label === "Payment method");
    await expect(method?.["value"]).toBe("check");
    const result = await agent.act({ steps: [{ ref: "Board role", action: "setValue", args: ["Treasurer"] }] });
    await expect(result.ok, result.error?.message).toBe(true);
    await waitFor(() => expect(canvas.getByTestId("value")).toHaveTextContent("check / treasurer"));
  },
};

function PhoneForm({ presentation }: { presentation?: "sheet" | undefined }) {
  const [value, setValue] = useState<string | null>("check");
  return (
    <div className="grid gap-group">
      <Labelled label="Payment method" className="w-full">
        {/* On a phone the OS picker opens by default (AVE-7); native="never" asks for Avenue's own list. */}
        <Select items={methods} value={value} onValueChange={setValue} native="never" presentation={presentation} />
      </Labelled>
      <output className="text-meta text-muted-foreground" data-testid="value">
        Chosen: {value}
      </output>
    </div>
  );
}

/**
 * Avenue's list on a 390px phone (AVE-39): by default (`presentation="auto"`) it opens as a bottom sheet on a small
 * touch screen and as the popover with a mouse, decided each time it opens. The sheet is Drawer's: 14px top corners,
 * the handle, home-indicator padding and 44px rows. Choosing a row closes it and puts focus back on the field.
 */
export const SheetOnPhones: Story = {
  name: "Sheet on phones",
  globals: phone,
  render: () => <PhoneForm />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Payment method" });
    await userEvent.click(trigger);
    const list = await screen.findByRole("listbox");
    const content = list.closest<HTMLElement>("[data-slot=select-content]")!;
    await expect(content).toHaveAttribute("data-presentation", coarse() ? "sheet" : "popover");
    if (!isSheet(content)) {
      await userEvent.keyboard("{Escape}");
      await waitForClosed("select");
      return;
    }
    await expectListSheet(content, "[data-slot=select-item]");
    // Each row's check sits on the page's 16px line.
    const check = within(list).getByRole("option", { name: "Check" }).querySelector("svg")!.getBoundingClientRect();
    await expect(Math.round(check.left - content.getBoundingClientRect().left)).toBe(16);
    await userEvent.click(within(list).getByRole("option", { name: "Bank transfer" }));
    await waitForClosed("select");
    await expect(canvas.getByTestId("value")).toHaveTextContent("bank");
    await expect(trigger).toHaveFocus();
  },
};

/** The sheet, open, for the light and dark captures: as a phone shows it, on any screen. */
export const SheetOpen: Story = {
  name: "Sheet, open",
  globals: phone,
  render: () => <PhoneForm presentation="sheet" />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("combobox", { name: "Payment method" }));
    const list = await screen.findByRole("listbox");
    await expectListSheet(list.closest<HTMLElement>("[data-slot=select-content]")!, "[data-slot=select-item]");
  },
};

/**
 * The keyboard in the sheet (a phone with a keyboard, or a sheet asked for on a wide screen): Enter opens it, the
 * arrows move, Enter chooses and focus returns to the field; Escape closes it and keeps the value.
 */
export const SheetKeyboard: Story = {
  name: "Sheet keyboard",
  globals: phone,
  render: () => <PhoneForm presentation="sheet" />,
  play: async ({ canvas, step }) => {
    const trigger = canvas.getByRole("combobox", { name: "Payment method" });
    await step("Enter opens the sheet on the chosen row", async () => {
      trigger.focus();
      await userEvent.keyboard("{Enter}");
      const list = await screen.findByRole("listbox");
      await expect(list.closest("[data-slot=select-content]")).toHaveAttribute("data-presentation", "sheet");
      await waitFor(() => expect(within(list).getByRole("option", { name: "Check" })).toHaveFocus());
    });
    await step("arrows move; Enter chooses and focus returns to the field", async () => {
      await userEvent.keyboard("{ArrowDown}");
      await waitFor(() => expect(screen.getByRole("option", { name: "Cash" })).toHaveFocus());
      await userEvent.keyboard("{Enter}");
      await waitForClosed("select");
      await expect(canvas.getByTestId("value")).toHaveTextContent("cash");
      await expect(trigger).toHaveFocus();
    });
    await step("Escape closes the sheet and keeps the value", async () => {
      await userEvent.keyboard("{Enter}");
      await screen.findByRole("listbox");
      await userEvent.keyboard("{ArrowDown}");
      await userEvent.keyboard("{Escape}");
      await waitForClosed("select");
      await expect(canvas.getByTestId("value")).toHaveTextContent("cash");
      await expect(trigger).toHaveFocus();
    });
  },
};

/** A swipe down closes the sheet without changing the value, and focus returns to the field. */
export const SheetSwipeToClose: Story = {
  name: "Sheet swipe to close",
  globals: phone,
  render: () => <PhoneForm presentation="sheet" />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Payment method" });
    await userEvent.click(trigger);
    const list = await screen.findByRole("listbox");
    const content = list.closest<HTMLElement>("[data-slot=select-content]")!;
    await expectListSheet(content, "[data-slot=select-item]");
    await swipeDown(content);
    await waitForClosed("select");
    await expect(canvas.getByTestId("value")).toHaveTextContent("check");
    await expect(trigger).toHaveFocus();
  },
};

/**
 * Select and Combobox side by side at each size (AVE-84): their icons follow the control size, as Button's do, 16px in
 * an md field and 14px in an sm one (a card or dialog header).
 */
export const IconSizes: Story = {
  render: () => (
    <div className="grid w-160 grid-cols-2 gap-group">
      {(["md", "sm"] as const).map((size) => (
        <div key={size} className="contents">
          <Select aria-label={`Year, ${size}`} items={years} defaultValue="2026" size={size} native="never" />
          <Combobox
            aria-label={`Household, ${size}`}
            items={[{ value: "h1", label: "12 Lantern Row · Ada Okafor" }]}
            value="h1"
            onValueChange={() => {}}
            icon={<HouseIcon />}
            triggerLabel={`Show households, ${size}`}
            size={size}
          />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const [size, px] of [
      ["md", 16],
      ["sm", 14],
    ] as const) {
      const select = within(canvasElement).getByRole("combobox", { name: `Year, ${size}` });
      const combobox = within(canvasElement).getByRole("combobox", { name: `Household, ${size}` });
      const field = combobox.closest<HTMLElement>("[data-slot=combobox]")!;
      // Select's chevron, Combobox's house and up-down chevron; not the phone's clear button (AVE-93).
      const icons = [...select.querySelectorAll("svg"), ...field.querySelectorAll("svg")].filter(
        (svg) => !svg.closest("[data-slot=combobox-clear]"),
      );
      await expect(icons).toHaveLength(3);
      for (const icon of icons) await expect(icon.getBoundingClientRect().width).toBe(px);
    }
  },
};

// AVE-146: items in ui-sdk's shape (groups, separators, object values) and the parts, nested as ui-sdk's Composition
// shows. All names and addresses are fictional.

const categories: ListData = [
  { value: "dues", label: "Dues" },
  { value: "fees", label: "Late fees" },
  { type: "separator" },
  {
    type: "group",
    label: "Projects",
    items: [
      { value: "pool", label: "Pool resurfacing" },
      { value: "gate", label: "Front gate" },
    ],
  },
  { type: "group", label: "Other", items: ["Donation", "Refund"] },
];

/** A grouped list: group headings named for screen readers, a line between, arrows straight across the groups. */
export const Grouped: Story = {
  render: function Render() {
    const [value, setValue] = useState<string | null>("dues");
    return (
      <div className="grid w-72 gap-section">
        <Labelled label="Category">
          <Select items={categories} value={value} onValueChange={setValue} native="never" />
        </Labelled>
        <Labelled label="Category (OS picker)">
          <Select items={categories} defaultValue="dues" native="always" />
        </Labelled>
        <output className="text-meta text-muted-foreground" data-testid="value">
          Chosen: {value}
        </output>
      </div>
    );
  },
  play: async ({ canvas, step }) => {
    const trigger = canvas.getByRole("combobox", { name: "Category" });
    await step("each group is named by its heading", async () => {
      trigger.focus();
      await userEvent.keyboard("{ArrowDown}");
      const list = await screen.findByRole("listbox");
      await expect(within(list).getByRole("group", { name: "Projects" })).toBeInTheDocument();
      await expect(within(list).getByRole("group", { name: "Other" })).toBeInTheDocument();
      await expect(list.querySelector("[data-slot=select-separator]")).not.toBeNull();
    });
    await step("arrows cross from one group into the next; Enter chooses", async () => {
      // The OS picker beside it has options of its own, so these are found in the open list.
      const list = screen.getByRole("listbox");
      await waitFor(() => expect(within(list).getByRole("option", { name: "Dues" })).toHaveFocus());
      await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");
      await waitFor(() => expect(within(list).getByRole("option", { name: "Donation" })).toHaveFocus());
      await userEvent.keyboard("{Enter}");
      await waitForClosed("select");
      await expect(canvas.getByTestId("value")).toHaveTextContent("Donation");
      await expect(trigger).toHaveTextContent("Donation");
    });
    await step("the OS picker shows the same groups as its own", async () => {
      const native = canvas.getByRole("combobox", { name: "Category (OS picker)" });
      await expect([...native.querySelectorAll("optgroup")].map((g) => g.label)).toEqual(["Projects", "Other"]);
      await userEvent.selectOptions(native, "gate");
      await expect(native).toHaveValue("gate");
    });
  },
};

const people = [
  { value: "ada", label: "Ada Okafor", line: "Treasurer · 12 Lantern Row" },
  { value: "bram", label: "Bram Hollis", line: "Secretary · 14 Lantern Row" },
  { value: "cora", label: "Cora Mendez", line: "Member at large · 3 Quill Court" },
];

/**
 * Built from parts (AVE-146): the root keeps `items`, so the trigger has its labels before the list opens, and each
 * SelectItem draws a second line. The trigger shows only the label.
 */
export const SecondLine: Story = {
  name: "Second line",
  render: function Render() {
    const [value, setValue] = useState<string | null>("ada");
    return (
      <div className="grid gap-group">
        <Labelled label="Signer">
          <Select items={people} value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {people.map((person) => (
                <SelectItem key={person.value} value={person.value} label={person.label}>
                  <span className="block">{person.label}</span>
                  <span className="block text-meta text-muted-foreground">{person.line}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Labelled>
        <output className="text-meta text-muted-foreground" data-testid="value">
          Chosen: {value}
        </output>
      </div>
    );
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Signer" });
    await expect(trigger).toHaveTextContent(/^Ada Okafor$/);
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await screen.findByRole("listbox");
    await waitFor(() => expect(screen.getByRole("option", { name: /Ada Okafor/ })).toHaveFocus());
    await expect(screen.getByRole("option", { name: /Bram Hollis/ })).toHaveTextContent("Secretary · 14 Lantern Row");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await waitForClosed("select");
    await expect(canvas.getByTestId("value")).toHaveTextContent("bram");
    await expect(trigger).toHaveTextContent(/^Bram Hollis$/);
    await expect(trigger).toHaveFocus();
  },
};

type Member = { id: number; name: string };
const members: Member[] = [
  { id: 1042, name: "Ada Okafor" },
  { id: 1043, name: "Bram Hollis" },
  { id: 1101, name: "Cora Mendez" },
];

/**
 * Object values (AVE-146): the value is the member, not an id string. `itemToValue` gives the id the form posts,
 * `itemToLabel` the name, and `isItemEqualToValue` matches a copy of a member (as a server would send back).
 */
export const ObjectValues: Story = {
  name: "Object values",
  render: function Render() {
    const [value, setValue] = useState<Member | null>({ id: 1043, name: "Bram Hollis" });
    const [posted, setPosted] = useState("");
    return (
      <form
        className="grid w-72 gap-group"
        onSubmit={(event) => {
          event.preventDefault();
          setPosted(String(new FormData(event.currentTarget).get("assignee")));
        }}
      >
        <Labelled label="Assignee">
          <Select
            name="assignee"
            items={members.map((m) => ({ value: m, label: m.name }))}
            value={value}
            onValueChange={setValue}
            itemToValue={(m) => String(m.id)}
            itemToLabel={(m) => m.name}
            isItemEqualToValue={(a, b) => a.id === b.id}
            native="never"
          />
        </Labelled>
        <Button type="submit" variant="outline" className="justify-self-start">
          Post the form
        </Button>
        <output className="text-meta text-muted-foreground" data-testid="value">
          Chosen: {value ? `${value.name} (${value.id})` : "none"}; posted: {posted}
        </output>
      </form>
    );
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Assignee" });
    await expect(trigger).toHaveTextContent("Bram Hollis");
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await screen.findByRole("listbox");
    await waitFor(() => expect(screen.getByRole("option", { name: "Bram Hollis" })).toHaveFocus());
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await waitForClosed("select");
    await expect(canvas.getByTestId("value")).toHaveTextContent("Cora Mendez (1101)");
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Post the form" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByTestId("value")).toHaveTextContent("posted: 1101");
  },
};
