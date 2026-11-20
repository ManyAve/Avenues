import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Button } from "#avenue/components/button";
import { Select, type ListItem } from "#avenue/components/select";
import { cn } from "#avenue/lib/utils";
import { Code, Page, Section, useComputed } from "./token-docs";

// AVE-2 sections 1 and 2: one 4px grid, named aliases, and four control heights. The heights are shown on Avenue's
// Button, the one component that ships all four (Select ships sm and md only); the toolbar uses the real Select.

const years: ListItem[] = ["2027", "2026", "2025"].map((y) => ({ value: y, label: y }));

const scale = [
  ["0.5", "w-0.5", "Optical nudges inside a control only"],
  ["1", "w-1", "Icon to its label"],
  ["2", "w-2", "Between controls in a group; label to field"],
  ["3", "w-3", "Row padding top and bottom; between fields"],
  ["4", "w-4", "Container padding; row sides; gutter"],
  ["5", "w-5", "Page inset on desktop"],
  ["6", "w-6", "Between sections"],
  ["8", "w-8", "Between page-level blocks"],
  ["12", "w-12", "Empty-state padding"],
] as const;

const aliases = [
  ["inline", "w-inline", "Icon to label, count to chip label"],
  ["group", "w-group", "Controls in a group or toolbar"],
  ["row-y", "w-row-y", "Row padding top and bottom"],
  ["inset", "w-inset", "Card, dialog and popover padding"],
  ["page", "w-page", "Page inset: 16px, 20px from 640px wide"],
  ["section", "w-section", "Between sections"],
] as const;

function Bar({ label, cls, use }: { label: string; cls: string; use: string }) {
  const [ref, width] = useComputed<HTMLDivElement>((s) => s.width);
  return (
    <div className="grid grid-cols-[6rem_4rem_3.5rem_1fr] items-center gap-4 border-b py-2">
      <Code className="text-foreground">{label}</Code>
      <Code>{width}</Code>
      <div ref={ref} className={cn("h-4 rounded-xs bg-primary", cls)} />
      <span className="text-meta text-muted-foreground">{use}</span>
    </div>
  );
}

function SpacingScale() {
  return (
    <Page title="Spacing">
      <Section
        title="Scale"
        note="Tailwind's 4px base: p-1 is 4px, p-12 is 48px. The 6, 10 and 14px steps (*-1.5, *-2.5, *-3.5) are off the grid; bun run check:classes flags them."
      >
        <div>
          {scale.map(([step, cls, use]) => (
            <Bar key={step} label={step} cls={cls} use={use} />
          ))}
        </div>
      </Section>
      <Section
        title="Aliases"
        note="Components pick an alias, not a raw step: p-inset, gap-group, py-row-y, px-page, gap-section."
      >
        <div>
          {aliases.map(([name, cls, use]) => (
            <Bar key={name} label={name} cls={cls} use={use} />
          ))}
        </div>
      </Section>
    </Page>
  );
}

const heights = [
  ["xs", "Inside table rows and dense lists"],
  ["sm", "In a card or dialog header"],
  ["md", "Default: buttons, inputs, selects, toolbars"],
  ["lg", "Primary actions on mobile and in empty states"],
] as const;

function Control({ size, use }: { size: (typeof heights)[number][0]; use: string }) {
  const [ref, height] = useComputed<HTMLButtonElement>((s) => `${s.height}, ${s.borderTopLeftRadius} corner`);
  return (
    <div className="grid grid-cols-[3rem_9rem_8rem_1fr] items-center gap-4 border-b py-row-y">
      <Code className="text-foreground">{size}</Code>
      <Code>{height}</Code>
      <Button ref={ref} variant="outline" size={size} className="justify-self-start">
        Save
      </Button>
      <span className="text-meta text-muted-foreground">{use}</span>
    </div>
  );
}

function ControlHeights() {
  return (
    <Page title="Control heights">
      <Section
        title="Four sizes"
        note="h-control-xs to h-control-lg (also size- and min-h-). Controls that share a row share a height. Text inside a control stays at text-control (14px), so xs is the smallest control that holds text. Touch targets reach 44px by extending the hit area, not the drawn control."
      >
        <div>
          {heights.map(([size, use]) => (
            <Control key={size} size={size} use={use} />
          ))}
        </div>
      </Section>
      <Section title="One row, one height" note="A toolbar: chips, the year select and an icon button, all md (32px).">
        <div className="flex items-center gap-group rounded-xl border bg-card px-inset py-row-y">
          <span className="flex h-control-md items-center rounded-full bg-primary-subtle px-3 text-control text-primary-subtle-foreground">
            Owing
          </span>
          <span className="flex h-control-md items-center rounded-full border px-3 text-control">Paid</span>
          <Select items={years} defaultValue="2026" aria-label="Dues year" className="w-auto" />
          <span className="flex size-control-md items-center justify-center rounded-lg border border-input text-control">
            <span aria-hidden="true">⋯</span>
            <span className="sr-only">More</span>
          </span>
        </div>
      </Section>
    </Page>
  );
}

const meta = {
  title: "Tokens/Spacing",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Scale: Story = { render: () => <SpacingScale /> };
export const Heights: Story = {
  name: "Control heights",
  render: () => <ControlHeights />,
  // Measured on the real components: Button's four sizes, and the toolbar's md Select at the toolbar's height.
  play: async ({ canvas }) => {
    const buttons = canvas.getAllByRole("button", { name: "Save" });
    await expect(buttons.map((b) => b.getBoundingClientRect().height)).toEqual([
      // xs is 28px on a phone (AVE-22), so with the 16px phone gap its 44px tap area doesn't reach a neighbour's.
      matchMedia("(pointer: coarse)").matches ? 28 : 24,
      28,
      32,
      40,
    ]);
    await expect(buttons.map((b) => getComputedStyle(b).borderTopLeftRadius)).toEqual(["8px", "8px", "10px", "10px"]);
    const select = canvas.getByRole("combobox", { name: "Dues year" });
    // A phone grows the md field to 44px (AVE-22).
    await expect(select.getBoundingClientRect().height).toBe(matchMedia("(pointer: coarse)").matches ? 44 : 32);
    await expect(getComputedStyle(select).borderTopLeftRadius).toBe("10px");
    // AVE-29: a row of controls shares one text size. Buttons and chips use text-control (14px) at every width and on
    // both type scales; a field joins them at 768px and up, and keeps 16px below so iOS doesn't zoom on focus.
    const fontSize = (el: Element) => getComputedStyle(el).fontSize;
    const chips = [canvas.getByText("Owing"), canvas.getByText("Paid")];
    await expect([...buttons, ...chips].map(fontSize)).toEqual(Array(6).fill("14px"));
    await expect(fontSize(select)).toBe(window.matchMedia("(min-width: 48rem)").matches ? "14px" : "16px");
  },
};
