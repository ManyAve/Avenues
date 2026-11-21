import type { Meta, StoryObj } from "@storybook/react-vite";
import { cn } from "#avenue/lib/utils";
import { Code, Page, Section } from "../tokens/token-docs";
import { DoDont, households, Rule, Rules, SeeTokens } from "./foundation-docs";

// How to use elevation. The shadows and surface levels are on Tokens/Elevation.

const levels = [
  ["shadow-control", "A raised part inside a control", "A selected segment. Fields and buttons are flat"],
  ["shadow-card", "Lifts a card off the page", "A raised card: a short, soft shadow and the floating edge"],
  ["shadow-popover", "Floats above everything until dismissed", "Menus, popovers, dialogs, toasts: a long, soft shadow and the floating edge"],
] as const;

function Menu({ heavy }: { heavy?: boolean }) {
  return (
    <div className="relative h-40 w-full max-w-xs">
      <div className="absolute inset-x-0 top-0 rounded-xl border bg-card p-inset shadow-card">
        <p className="m-0 text-compact">{households[0].address}</p>
        <p className="m-0 text-meta text-muted-foreground">{households[0].owner}</p>
      </div>
      <div
        className={cn(
          "absolute top-12 right-4 flex w-44 flex-col rounded-lg bg-popover p-1",
          // The don't's shadow is deliberately a bespoke one, to show what not to invent.
          // oxlint-disable-next-line tailwindcss/no-hardcoded-colors
          heavy ? "shadow-[0_24px_48px_-8px_rgb(0_0_0/0.45)]" : "border border-border-floating shadow-popover",
        )}
      >
        {["Record payment", "Send reminder", "Open ledger"].map((item) => (
          <span key={item} className="rounded-sm px-2 py-1 text-control">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Nested({ stacked }: { stacked?: boolean }) {
  return (
    <div className="flex w-full max-w-xs flex-col gap-group rounded-xl border bg-card p-inset shadow-card">
      <span className="text-control font-semibold">Recent payments</span>
      {households.slice(0, 2).map((h) =>
        stacked ? (
          <div key={h.address} className="flex justify-between rounded-xl border bg-card p-row-y text-compact shadow-card">
            <span>{h.address}</span>
            <span className="tabular-nums">{h.amount}</span>
          </div>
        ) : (
          <div key={h.address} className="flex justify-between border-t pt-group text-compact">
            <span>{h.address}</span>
            <span className="tabular-nums">{h.amount}</span>
          </div>
        ),
      )}
    </div>
  );
}

function ElevationUse() {
  return (
    <Page title="Elevation">
      <SeeTokens>Tokens › Elevation (shadows and surface levels)</SeeTokens>
      <Section title="Three heights" note="Something's shadow says how far it is from the page, not how important it is.">
        <div className="max-w-3xl">
          {levels.map(([name, meaning, use]) => (
            <div key={name} className="grid grid-cols-[8rem_1fr] items-center gap-inset border-b py-row-y md:grid-cols-[8rem_1fr_16rem]">
              <Code className="text-foreground">{name}</Code>
              <span className="text-compact">{meaning}</span>
              <span className="col-span-2 text-meta text-muted-foreground md:col-span-1">{use}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Rules">
        <Rules>
          <Rule why="Each shadow is a tight contact shade plus a soft one pulled in under the surface, tinted with the page's ink, so things float without looking heavy. A hand-made shadow breaks that balance.">
            Use only the three shadows. No shadow-lg, shadow-2xl or hand-written shadows.
          </Rule>
          <Rule why="In dark mode a shadow barely shows, so each level is also a lighter onyx surface.">
            In dark mode, depth comes from the surface levels as much as the shadow. Use bg-card and bg-popover, never
            a fixed colour, and both themes stay right.
          </Rule>
          <Rule>
            Don't put a card in a card. Inside a card, separate items with a border or space, not another shadow.
          </Rule>
          <Rule why="The faint edge melts into the shadow, and still shows where a white menu ends over a white card. Forced-colours mode drops shadows, so floating parts draw a real border there.">
            Anything that floats (menu, popover, dialog, toast) takes shadow-popover and the border-floating edge, in both
            themes. Flat cards and fields keep border.
          </Rule>
        </Rules>
      </Section>
      <Section title="Do and don't">
        <DoDont
          good={<Menu />}
          bad={<Menu heavy />}
          doCaption="A menu over a card: shadow-popover and the border-floating edge."
          dontCaption="A large, dark, hand-made shadow. It sits around the menu, not under it, and is heavier still in dark mode."
        />
        <DoDont
          good={<Nested />}
          bad={<Nested stacked />}
          doCaption="Items inside a card are split by a border."
          dontCaption="Cards inside a card, each with its own shadow and corner: three layers of depth for one list."
        />
      </Section>
    </Page>
  );
}

const meta = {
  title: "Foundations/Elevation",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

export const Use: StoryObj<typeof meta> = { name: "Elevation", render: () => <ElevationUse /> };
