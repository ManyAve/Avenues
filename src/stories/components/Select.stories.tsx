import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "#avenue/components/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "#avenue/components/field";
import { Select, type SelectOption } from "#avenue/components/select";
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
    <Field invalid={invalid} className={cn("w-64", className)}>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError match>{error}</FieldError>}
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
    await expect(trigger.getBoundingClientRect().height).toBe(32);
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
    <figure className="grid w-96 content-start gap-group">
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
    await userEvent.click(await screen.findByRole("option", { name: "2025" }));
    await expect(trigger).toHaveTextContent("2025");
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
