import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronDown } from "lucide-react";
import { expect, within } from "storybook/test";
import { Select, type ListItem } from "#avenue/components/select";
import { cn } from "#avenue/lib/utils";
import { Code, Page, Section } from "../tokens/token-docs";
import { DoDont, Rule, Rules, SeeTokens } from "./foundation-docs";

// AVE-2 sections 3 to 6 as rules people can follow: which corner, rounded things inside rounded things, where pills
// go, and the year select in the Dues card. The scale itself is on Tokens/Radius.
// The "do" Dues card uses Avenue's real Select (AVE-26); the "don't" card is the app's pill, drawn for comparison.

const years: ListItem[] = ["2027", "2026", "2025"].map((y) => ({ value: y, label: y }));

const uses = [
  ["xs", "4px", "Checkboxes, small marks, keyboard hints, progress tracks"],
  ["sm", "6px", "Items inside a menu or a padded list; segmented-control items"],
  ["md", "8px", "xs and sm controls (24 and 28px); tooltips"],
  ["lg", "10px", "md and lg controls (32 and 40px); menus and popovers"],
  ["xl", "14px", "Cards, dialogs, sheets, table frames"],
  ["full", "pill", "Labels and tokens only: status, counts, avatars, switches, filter chips, tags, section tabs"],
] as const;

/** The Dues card header. `before` is the app today; the after follows AVE-2 section 6. */
function DuesCard({ before }: { before?: boolean }) {
  return (
    <div data-dues-card={before ? "before" : "after"} className="w-full max-w-sm rounded-xl border bg-card shadow-card">
      <div
        className={cn(
          "flex justify-between gap-group border-b px-inset",
          before ? "items-start pt-[6px] pr-[6px] pb-row-y" : "items-center pt-inset pb-row-y",
        )}
      >
        <h3 className="m-0 text-meta font-emphasis tracking-wide text-muted-foreground uppercase">
          Dues
        </h3>
        <div className={cn("flex gap-group text-meta text-muted-foreground", before ? "items-start" : "items-center")}>
          <span>Account summary ·</span>
          {before ? (
            // Deliberately the app's current pill: 30px tall, 15px corner, rounder than the 14px card.
            <span className="inline-flex h-[30px] items-center gap-inline rounded-full border border-input bg-card pr-2 pl-3 text-control text-foreground shadow-control">
              2026
              <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
            </span>
          ) : (
            <Select items={years} defaultValue="2026" size="sm" aria-label="Dues year" className="w-auto" />
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 p-inset text-compact">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Billed</span>
          <span className="tabular-nums">$240.00</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Paid</span>
          <span className="tabular-nums">$120.00</span>
        </div>
      </div>
    </div>
  );
}

function Segmented({ tight, copy }: { tight?: boolean | undefined; copy?: boolean | undefined }) {
  return (
    // 3px is the app's segmented-control padding: an optical inset inside a control, which AVE-2 allows. Drawn at
    // md (32px: 1px border, 3px padding, 24px items) with control text. Drawn, not Avenue's ToggleGroup, because that
    // ships spaced or joined items, not a padded track, so it can't show this rule.
    <div data-segmented={copy ? undefined : true} className="inline-flex h-control-md gap-0.5 rounded-lg border bg-muted p-[3px]">
      {["Month", "Quarter", "Year"].map((label, i) => (
        <span
          key={label}
          className={cn(
            "flex h-full items-center px-3 text-control",
            tight ? "rounded-lg" : "rounded-sm",
            i === 2 ? "bg-card shadow-control" : "text-muted-foreground",
            // The crop shows corners, not letters. In dark the selected item is close to the track's tone, so the
            // crop outlines it (0.5px, 2px once enlarged) to keep its curve readable.
            copy && "text-transparent",
            copy && i === 2 && "ring-[0.5px] ring-foreground/50",
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

/**
 * At true md size a 6px and a 10px item corner are hard to tell apart, so each card adds a 4× crop of the track's
 * top-right corner: the selected item's corner inside the track's. A decorative copy, hidden from assistive tech.
 */
function SegmentedWithCorner({ tight }: { tight?: boolean | undefined }) {
  return (
    <div className="flex items-center gap-section">
      <Segmented tight={tight} />
      <div
        aria-hidden="true"
        data-corner-crop
        className="relative size-28 shrink-0 overflow-hidden rounded-md border bg-background"
      >
        <div className="absolute top-4 right-4 origin-top-right scale-400">
          <Segmented tight={tight} copy />
        </div>
      </div>
    </div>
  );
}

function Actions({ pills }: { pills?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-group">
      <span className="flex h-control-md items-center rounded-full bg-primary-subtle px-3 text-control text-primary-subtle-foreground">
        Owing 3
      </span>
      <span className="flex h-control-md items-center rounded-full border px-3 text-control">Paid</span>
      <span
        className={cn(
          "flex h-control-md items-center bg-primary px-3 text-control font-medium text-primary-foreground",
          pills ? "rounded-full" : "rounded-lg",
        )}
      >
        Record payment
      </span>
    </div>
  );
}

function CornerUse() {
  return (
    <Page title="Radius">
      <SeeTokens>Tokens › Radius (the corner scale)</SeeTokens>
      <Section title="Which corner" note="Six steps. A control's corner follows its height; containers use xl.">
        <div className="max-w-3xl">
          {uses.map(([name, px, use]) => (
            <div key={name} className="grid grid-cols-[4rem_3.5rem_1fr] items-center gap-inset border-b py-row-y">
              <Code className="text-foreground">{name}</Code>
              <Code>{px}</Code>
              <span className="text-compact">{use}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Rules">
        <Rules>
          <Rule why="When an inner curve is rounder than the one it sits in, or closer to it than its own curve, the two fight and the inner element looks jammed in.">
            Concentric when tight: if the gap to the container's edge is smaller than the container's corner, the
            inner corner is the outer corner minus the gap, rounded down to a step (never below xs).
          </Rule>
          <Rule>
            Never rounder than the container. Nothing inside a card is a pill unless it is at least 16px from every
            edge and outside the header's corner zones.
          </Rule>
          <Rule>
            A control in a container's corner sits 16px from both edges and is centred on the header's text line, not
            top-aligned.
          </Rule>
          <Rule why="The shape says what a control does: a pill is something you pick or read, a rectangle something you act on or fill in.">
            Pills are for labels and tokens: status, counts, avatars, switches, filter chips, tags and the top bar's
            section tabs. Buttons, selects, inputs, search fields, menus and cards are never pills. A standalone
            icon button that never has a label may be a circle.
          </Rule>
          <Rule>2xl, 3xl and 4xl are retired, and corners are never written as literal pixels.</Rule>
        </Rules>
      </Section>
      <Section
        title="The year select in the Dues card"
        note="The do card uses Avenue's Select; its size, corner and placement are the rule."
      >
        <DoDont
          good={<DuesCard />}
          bad={<DuesCard before />}
          doCaption="An sm select (28px, 8px corner) with the input border, centred on the title line, 16px from the card's top and right edges and 8px from its label. DUES and Account summary share a baseline."
          dontCaption="Today: a 30px pill (15px corner) in a 14px card, top-aligned. It is rounder than its card, pushes the divider down, and the title and label no longer line up."
        />
      </Section>
      <Section title="More do and don't">
        <DoDont
          good={<SegmentedWithCorner />}
          bad={<SegmentedWithCorner tight />}
          doCaption="10px container with 3px padding: 10 − 3 = 7, rounded down to sm (6px). In the 4× crop the curves stay parallel."
          dontCaption="Items with the container's own 10px corner, 3px from its edge. In the 4× crop the curves pinch together at the corner."
        />
        <DoDont
          good={<Actions />}
          bad={<Actions pills />}
          doCaption="Filter chips are pills; the action beside them is a rectangle with the button corner."
          dontCaption="A pill-shaped button reads as one more filter chip, so the row no longer says which thing acts."
        />
      </Section>
    </Page>
  );
}

const meta = {
  title: "Foundations/Radius",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

export const Corners: StoryObj<typeof meta> = {
  name: "Radius and nested corners",
  render: () => <CornerUse />,
  // The "do" card's select is the real component, so the rule is measured on it rather than taken on trust.
  play: async ({ canvas, canvasElement }) => {
    const control = canvas.getByRole("combobox", { name: "Dues year" });
    // On a phone the sm Select is a transparent native <select> over a 44px band; the field drawn under it
    // (its next sibling) is what the corner rule describes.
    const trigger = matchMedia("(pointer: coarse)").matches ? (control.nextElementSibling as HTMLElement) : control;
    const card = canvasElement.querySelector<HTMLElement>("[data-dues-card=after]");
    if (!card) throw new Error("The Dues card is missing");
    const label = within(card).getByText("Account summary ·");
    const title = within(card).getByRole("heading", { name: "Dues" });
    const t = trigger.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const l = label.getBoundingClientRect();
    const h = title.getBoundingClientRect();
    // AVE-2 section 6: sm (28px, 8px corner), 16px inside the card's top and right edges, 8px from its label,
    // centred on the title's line.
    await expect(t.height).toBe(28);
    await expect(getComputedStyle(trigger).borderTopLeftRadius).toBe("8px");
    await expect(t.top - c.top - card.clientTop).toBe(16);
    await expect(c.right - card.clientLeft - t.right).toBe(16);
    await expect(t.left - l.right).toBe(8);
    await expect(Math.abs((t.top + t.bottom) / 2 - (h.top + h.bottom) / 2)).toBeLessThanOrEqual(0.5);
    // The segmented examples are drawn at md: a 32px track with 14px text, not enlarged.
    for (const track of canvasElement.querySelectorAll<HTMLElement>("[data-segmented]")) {
      await expect(track.getBoundingClientRect().height).toBe(32);
      await expect(getComputedStyle(track.querySelector("span") ?? track).fontSize).toBe("14px");
    }
  },
};
