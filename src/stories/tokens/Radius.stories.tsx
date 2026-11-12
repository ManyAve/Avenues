import type { Meta, StoryObj } from "@storybook/react-vite";
import { cn } from "#avenue/lib/utils";
import { Code, Page, Section, SelectMock, useComputed } from "./token-docs";

// AVE-2 sections 3 to 6: five corner steps from --radius (10px), pills only for labels and tokens,
// and rounded things inside rounded things.

const steps = [
  ["xs", "rounded-xs", "Checkboxes, small marks, keyboard hints, progress tracks"],
  ["sm", "rounded-sm", "Items inside a menu or padded list"],
  ["md", "rounded-md", "xs and sm controls; segmented-control items; tooltips"],
  ["lg", "rounded-lg", "md and lg controls; menus and popovers"],
  ["xl", "rounded-xl", "Cards, dialogs, sheets, table frames"],
  ["full", "rounded-full", "Labels and tokens only: badges, counts, avatars, switches, filter chips, tags, section tabs"],
] as const;

function Step({ name, cls, use }: { name: string; cls: string; use: string }) {
  const [ref, radius] = useComputed<HTMLDivElement>((s) => s.borderTopLeftRadius);
  return (
    <div className="grid grid-cols-[3rem_5rem_6rem_1fr] items-center gap-4 border-b py-row-y">
      <Code className="text-foreground">{name}</Code>
      <Code>{name === "full" ? "pill" : radius}</Code>
      <div ref={ref} className={cn("h-12 w-24 border-2 border-primary bg-primary-subtle", cls)} />
      <span className="text-meta text-muted-foreground">{use}</span>
    </div>
  );
}

function CornerScale() {
  return (
    <Page title="Corners">
      <Section
        title="Scale"
        note="lg, md and xl look exactly as in the app. 2xl, 3xl and 4xl are retired: the theme clears them, so the class renders square, and bun run check:classes flags it. xs is 4px, not Tailwind's 2px."
      >
        <div>
          {steps.map(([name, cls, use]) => (
            <Step key={name} name={name} cls={cls} use={use} />
          ))}
        </div>
      </Section>
    </Page>
  );
}

function NestedCorners() {
  return (
    <Page title="Rounded inside rounded">
      <Section
        title="Concentric when tight"
        note="When the gap to the container's edge is smaller than its corner, the inner corner is the outer corner minus the gap, rounded down to a step. The app's segmented control is 10px with 3px padding: 7px rounds down to sm (6px), never up to md, which would be rounder than the container allows."
      >
        {/* 3px is the app's segmented-control padding, an optical inset inside a control (AVE-2 allows these). */}
        <div className="inline-flex w-fit gap-0.5 rounded-lg border bg-muted p-[3px]">
          {["Month", "Quarter", "Year"].map((label, i) => (
            <span
              key={label}
              className={cn(
                "flex h-control-sm items-center rounded-sm px-3 text-control",
                i === 2 ? "bg-card shadow-control" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </Section>
      <Section
        title="A control in a card's corner"
        note="The Dues card after AVE-2, in the app's header layout: DUES on the left; Account summary and an sm year select (28px, md corner) on the right, the select 8px from its label, 16px from the card's top and right edges and vertically centred on the header line. Never a pill inside a card's corner zone."
      >
        <div className="w-full max-w-md rounded-xl border bg-card shadow-card">
          <div className="flex items-center justify-between gap-group border-b px-inset py-row-y">
            <h3 className="text-meta font-semibold tracking-wide text-muted-foreground uppercase">Dues</h3>
            <div className="flex items-center gap-group text-meta text-muted-foreground">
              <span>Account summary ·</span>
              <SelectMock size="sm" />
            </div>
          </div>
          <div className="flex flex-col gap-2 p-inset text-compact">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Billed</span>
              <span>$240.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span>$120.00</span>
            </div>
          </div>
        </div>
      </Section>
    </Page>
  );
}

const meta = {
  title: "Tokens/Radius",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Scale: Story = { render: () => <CornerScale /> };
export const Nested: Story = { name: "Rounded inside rounded", render: () => <NestedCorners /> };
