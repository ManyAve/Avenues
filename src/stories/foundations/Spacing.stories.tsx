import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Select, type SelectOption } from "#avenue/components/select";
import { cn } from "#avenue/lib/utils";
import { Code, Page, Section } from "../tokens/token-docs";
import { DoDont, households, Rule, Rules, SeeTokens } from "./foundation-docs";

const years: SelectOption[] = ["2027", "2026", "2025"].map((y) => ({ value: y, label: y }));

// AVE-2 sections 1 and 2 as rules people can follow. The scale and heights themselves are on Tokens/Spacing.

const aliases = [
  ["inline", "4", "Icon to its label; count to its chip label"],
  ["group", "8", "Between controls in a toolbar; label to field"],
  ["row-y", "12", "Row padding top and bottom; between fields"],
  ["inset", "16", "Card, dialog and popover padding; row sides; gutter"],
  ["page", "16/20", "Page inset: 16px on phones, 20px from 640px"],
  ["section", "24", "Between sections inside a card or page"],
] as const;

function Chip({ label, active, height }: { label: string; active?: boolean; height: string }) {
  return (
    <span
      className={cn(
        "flex items-center rounded-full px-3 text-control",
        height,
        active ? "bg-primary-subtle text-primary-subtle-foreground" : "border",
      )}
    >
      {label}
    </span>
  );
}

function IconButton({ className }: { className: string }) {
  return (
    <span className={cn("flex items-center justify-center border border-input bg-card shadow-control", className)}>
      <SlidersHorizontal aria-hidden="true" className="size-4" />
      <span className="sr-only">Display options</span>
    </span>
  );
}

/** The Dues toolbar after AVE-2: every control md (32px), 8px apart. */
function ToolbarAfter() {
  return (
    <div className="flex flex-wrap items-center gap-group">
      <Chip label="Owing" active height="h-control-md" />
      <Chip label="Paid" height="h-control-md" />
      <Select options={years} defaultValue="2026" aria-label="Dues year" className="w-auto" />
      <IconButton className="size-control-md rounded-lg" />
    </div>
  );
}

/** The same toolbar today: 30px chips and select, a 29px icon button, 6px apart. Deliberately off the scale. */
function ToolbarBefore() {
  return (
    <div className="flex flex-wrap items-start gap-[6px]">
      <Chip label="Owing" active height="h-[30px]" />
      <Chip label="Paid" height="h-[30px]" />
      <span className="inline-flex h-[30px] items-center gap-inline rounded-full border border-input bg-card pr-2 pl-3 text-control shadow-control">
        2026 <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
      </span>
      <IconButton className="size-[29px] rounded-full" />
    </div>
  );
}

function List({ loose }: { loose?: boolean }) {
  return (
    <div className="w-full max-w-sm rounded-xl border bg-card">
      {households.slice(0, 3).map((h, i) => (
        <div
          key={h.address}
          className={cn(
            "flex justify-between text-compact",
            i > 0 && "border-t",
            // The don't mixes 10px, 14px and 6px on purpose: what the app has today.
            loose ? ["px-[14px] py-[10px]", "px-[10px] py-[6px]", "px-4 py-[14px]"][i] : "px-inset py-row-y",
          )}
        >
          <span>{h.address}</span>
          <span className="tabular-nums">{h.amount}</span>
        </div>
      ))}
    </div>
  );
}

function SpacingUse() {
  return (
    <Page title="Spacing">
      <SeeTokens>Tokens › Spacing (the 4px scale and control heights)</SeeTokens>
      <Section
        title="Pick a name, not a number"
        note="Every gap in a component is one of six names. Use them as p-inset, gap-group, py-row-y, px-page and gap-section."
      >
        <div className="max-w-3xl">
          {aliases.map(([name, px, use]) => (
            <div key={name} className="grid grid-cols-[5rem_4rem_1fr] items-center gap-inset border-b py-row-y">
              <Code className="text-foreground">{name}</Code>
              <Code>{px}px</Code>
              <span className="text-compact">{use}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Rules">
        <Rules>
          <Rule why="With about 40 different paddings, similar screens end up spaced differently.">
            Everything sits on the 4px grid. 6, 10 and 14px are gone; bun run check:classes flags them. 2px is only
            for optical nudges inside a control.
          </Rule>
          <Rule why="When a 30px select, 30px chips and a 29px button share a row, edges and text baselines don't line up.">
            Controls that share a row share a height: md (32px) in toolbars, sm (28px) in a card or dialog header, xs
            (24px) in table rows, lg (40px) for primary actions on phones and in empty states.
          </Rule>
          <Rule why="Phones need a 44px target; drawing a 44px control would break the row heights above.">
            Touch targets reach 44px by extending the hit area, not by drawing a bigger control.
          </Rule>
          <Rule>Rows are 12px top and bottom and 16px at the sides. Containers pad 16px. Sections are 24px apart.</Rule>
        </Rules>
      </Section>
      <Section title="Do and don't">
        <DoDont
          good={<ToolbarAfter />}
          bad={<ToolbarBefore />}
          doCaption="The Dues toolbar in Avenue: chips, year select and icon button all 32px, 8px apart, centred on one line."
          dontCaption="Today's toolbar: 30px and 29px controls, 6px apart, top-aligned. The edges and baselines drift."
        />
        <DoDont
          good={<List />}
          bad={<List loose />}
          doCaption="Every row 12px top and bottom, 16px at the sides."
          dontCaption="Rows padded 10, 6 and 14px. Each was close enough on its own; together the list looks uneven."
        />
      </Section>
    </Page>
  );
}

const meta = {
  title: "Foundations/Spacing",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

export const Rhythm: StoryObj<typeof meta> = { name: "Spacing", render: () => <SpacingUse /> };
