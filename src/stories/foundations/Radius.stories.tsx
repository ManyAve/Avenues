import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronDown } from "lucide-react";
import { cn } from "#avenue/lib/utils";
import { Code, Page, Section, SelectMock } from "../tokens/token-docs";
import { DoDont, Rule, Rules, SeeTokens } from "./foundation-docs";

// AVE-2 sections 3 to 6 as rules people can follow: which corner, rounded things inside rounded things, where pills
// go, and the year select in the Dues card. The scale itself is on Tokens/Radius.
// The year select is drawn with SelectMock, a stand-in, until AVE-7's Select is merged; then swap it in here.

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
    <div className="w-full max-w-sm rounded-xl border bg-card shadow-card">
      <div
        className={cn(
          "flex justify-between gap-group border-b px-inset",
          before ? "items-start pt-[6px] pr-[6px] pb-row-y" : "items-center py-row-y",
        )}
      >
        <h3 className="m-0 text-meta font-semibold tracking-wide text-muted-foreground uppercase">
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
            <SelectMock size="sm" />
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

function Segmented({ tight }: { tight?: boolean }) {
  return (
    // 3px is the app's segmented-control padding: an optical inset inside a control, which AVE-2 allows.
    // Drawn at twice the size so the corners can be compared.
    <div className="inline-flex gap-0.5 rounded-lg border bg-muted p-[3px]" style={{ zoom: 1.75 }}>
      {["Month", "Quarter", "Year"].map((label, i) => (
        <span
          key={label}
          className={cn(
            "flex h-control-sm items-center px-3 text-control",
            tight ? "rounded-lg" : "rounded-sm",
            i === 2 ? "bg-card shadow-control" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
      ))}
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
        note="The select is a drawn stand-in until Avenue's Select lands; its size, corner and placement are the rule."
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
          good={<Segmented />}
          bad={<Segmented tight />}
          doCaption="10px container with 3px padding: 10 − 3 = 7, rounded down to sm (6px). The curves stay parallel."
          dontCaption="Items with the container's own 10px corner, 3px from its edge: the curves pinch at every corner."
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

export const Corners: StoryObj<typeof meta> = { name: "Radius and nested corners", render: () => <CornerUse /> };
