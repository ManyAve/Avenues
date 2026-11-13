import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "#avenue/components/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "#avenue/components/field";
import { Select, type SelectOption } from "#avenue/components/select";
import { createAgent } from "@ui-sdk/react/agent";
import { cn } from "#avenue/lib/utils";

// AVE-7. One Select for the app's 20 native selects. md (32px, lg corner) by default; sm (28px, md corner) in a card
// or dialog header; never a pill. All data is fictional.

const methods: SelectOption[] = [
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
  { value: "money-order", label: "Money order" },
  { value: "other", label: "Other" },
];

const years: SelectOption[] = ["2027", "2026", "2025"].map((y) => ({ value: y, label: y }));

const roles: SelectOption[] = [
  { value: "president", label: "President" },
  { value: "treasurer", label: "Treasurer" },
  { value: "secretary", label: "Secretary" },
  { value: "member", label: "Member at large" },
  { value: "past", label: "Past president (non-voting, keeps read access to the register)", disabled: true },
];

const long: SelectOption[] = [
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

const meta = {
  title: "Components/Select",
  component: Select,
  parameters: { layout: "padded" },
  args: { options: methods, placeholder: "Choose a method", native: "never" },
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
        <Select options={methods} defaultValue="check" native="never" />
      </Labelled>
      <Labelled label="sm · 28px, md corner (card or dialog header)">
        <Select options={methods} defaultValue="check" size="sm" native="never" />
      </Labelled>
    </div>
  ),
};

export const Placeholder: Story = {
  render: () => (
    <Labelled label="Payment method">
      <Select options={methods} placeholder="Choose a method" native="never" />
    </Labelled>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Labelled label="Payment method" description="Resolve the household first.">
      <Select options={methods} defaultValue="check" disabled native="never" />
    </Labelled>
  ),
};

export const DisabledOption: Story = {
  name: "Disabled option",
  render: () => (
    <Labelled label="Board role">
      <Select options={roles} defaultValue="treasurer" native="never" />
    </Labelled>
  ),
  play: async ({ canvas }) => {
    // The list is as wide as its field (UI Designer, AVE-7); a long option wraps instead of widening it.
    const trigger = canvas.getByRole("combobox", { name: "Board role" });
    await userEvent.click(trigger);
    const list = await screen.findByRole("listbox");
    const popup = list.closest("[data-slot=select-content]") ?? list;
    await waitFor(() =>
      expect(Math.round(popup.getBoundingClientRect().width)).toBe(Math.round(trigger.getBoundingClientRect().width)),
    );
    await expect(screen.getByRole("option", { name: /Past president/ })).toHaveAttribute("aria-disabled", "true");
  },
};

export const Invalid: Story = {
  render: () => (
    <Labelled label="Payment method" invalid error="Choose how the payment was made.">
      <Select options={methods} placeholder="Choose a method" native="never" />
    </Labelled>
  ),
};

export const LongOptions: Story = {
  name: "Long options",
  render: () => (
    <Labelled label="Template">
      <Select options={long} defaultValue="a" native="never" />
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
        <Select options={methods} placeholder="Choose a method" native="always" />
      </Labelled>
      <Labelled label="Same field, Avenue list">
        <Select options={methods} placeholder="Choose a method" native="never" />
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

/** The keyboard and labelling contract: open, arrows, type-ahead, Escape keeps the old value. */
export const Keyboard: Story = {
  render: function Render() {
    const [value, setValue] = useState<string | null>("check");
    return (
      <div className="grid gap-group">
        <Labelled label="Payment method">
          <Select options={methods} value={value} onValueChange={setValue} native="never" />
        </Labelled>
        <output className="text-meta text-muted-foreground" data-testid="value">
          {value}
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
    });
  },
};

export const InvalidIsAnnounced: Story = {
  name: "Invalid wiring",
  render: () => (
    <Labelled label="Payment method" invalid error="Choose how the payment was made.">
      <Select options={methods} placeholder="Choose a method" native="never" />
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
    <p className="text-[1.75rem] leading-tight font-[560] tabular-nums">$120.00</p>
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
        <div className="text-meta font-[550] tracking-wide text-muted-foreground uppercase">Dues</div>
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
        <CardTitle className="text-meta font-[550] tracking-wide text-muted-foreground uppercase">
          <h2>Dues</h2>
        </CardTitle>
        <CardAction className="flex items-center gap-group text-meta text-muted-foreground">
          <span>Account summary ·</span>
          <Select options={years} defaultValue="2026" size="sm" aria-label="Dues year" native="never" className="w-auto" />
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
    // A narrow field's list is never narrower than 192px.
    const list = await screen.findByRole("listbox");
    const popup = list.closest("[data-slot=select-content]") ?? list;
    await waitFor(() => expect(Math.round(popup.getBoundingClientRect().width)).toBe(192));
    await userEvent.click(await screen.findByRole("option", { name: "2025" }));
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
    <div className="flex w-[900px] justify-end p-inset">
      <Card className="w-80 overflow-hidden rounded-xl shadow-card ring-border" data-testid="card">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-meta font-[550] tracking-wide text-muted-foreground uppercase">
            <h2>Dues</h2>
          </CardTitle>
          <CardAction>
            <Select
              options={years}
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
        <Select options={methods} value={method} onValueChange={setMethod} native="never" />
      </Labelled>
      <Labelled label="Board role">
        <Select options={roles} value={role} onValueChange={setRole} placeholder="Choose a role" native="never" />
      </Labelled>
      <output data-testid="value" className="text-meta text-muted-foreground">
        {method ?? "(none)"} / {role ?? "(none)"}
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
