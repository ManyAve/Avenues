import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bell, FileText, Inbox, Mail, Send, SlidersHorizontal, Wallet } from "lucide-react";
import { cn } from "#avenue/lib/utils";
import { Code, Page, Section } from "../tokens/token-docs";
import { DoDont, households, Rule, Rules } from "./foundation-docs";

// How to use icons. ManyAve uses lucide-react only (82 imports in ManyAve Management at e01cc90, no other set),
// at the default 2px stroke.

const sizes = [
  ["size-3", "12px", "Inside a badge or status pill", Bell],
  ["size-3.5", "14px", "Inside xs controls and dense table cells", Mail],
  ["size-4", "16px", "Default: buttons, selects, menus, rows", Send],
  ["size-6", "24px", "The one icon in an empty state", Inbox],
] as const;

const actions = [
  ["Request payment", Wallet],
  ["Review letter", FileText],
  ["Follow up", Send],
] as const;

function NextActions({ iconsOnly }: { iconsOnly?: boolean }) {
  return (
    <div className="w-full max-w-sm divide-y rounded-xl border bg-card">
      {households.slice(1, 4).map((h, i) => {
        const [label, Icon] = actions[i] ?? actions[0];
        return (
          <div key={h.address} className="flex items-center justify-between gap-group px-inset py-row-y">
            <span className="text-compact">{h.address}</span>
            <span
              className={cn(
                "flex h-control-xs items-center gap-inline rounded-md border border-input bg-card text-control shadow-control",
                iconsOnly ? "w-control-xs justify-center" : "px-2",
              )}
            >
              <Icon aria-hidden="true" className="size-3.5" />
              {iconsOnly ? <span className="sr-only">{label}</span> : label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Toolbar({ mixed }: { mixed?: boolean }) {
  return (
    <div className="flex items-center gap-group">
      <span className="flex h-control-md items-center gap-inline rounded-lg border border-input bg-card px-3 text-control shadow-control">
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Display
      </span>
      <span className="flex h-control-md items-center gap-inline rounded-lg border border-input bg-card px-3 text-control shadow-control">
        {mixed ? (
          // The don't swaps in an emoji, deliberately: a second icon style beside lucide.
          <span aria-hidden="true">✉️</span>
        ) : (
          <Mail aria-hidden="true" className="size-4" />
        )}
        Announce
      </span>
      <span className="flex h-control-md items-center gap-inline rounded-lg border border-input bg-card px-3 text-control shadow-control">
        <Send aria-hidden="true" className={mixed ? "size-5 stroke-1" : "size-4"} />
        Send
      </span>
    </div>
  );
}

function IconUse() {
  return (
    <Page title="Icons">
      <Section title="Sizes" note="Four sizes. An icon takes the size of the text it sits beside; the control's height doesn't change.">
        <div className="max-w-3xl">
          {sizes.map(([cls, px, use, Icon]) => (
            <div key={cls} className="grid grid-cols-[2rem_5rem_3.5rem_1fr] items-center gap-inset border-b py-row-y">
              <Icon aria-hidden="true" className={cls} />
              <Code className="text-foreground">{cls}</Code>
              <Code>{px}</Code>
              <span className="text-compact">{use}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Rules">
        <Rules>
          <Rule why="One stroke weight and corner style keeps icons quiet; the mockup asks for restrained icons.">
            Use lucide-react only, at its default stroke. No emoji, no second icon set, no hand-drawn SVGs for things
            lucide has.
          </Rule>
          <Rule why="Volunteers new to the tool every year shouldn't have to learn a pictogram.">
            An icon goes with a word. Icon-only buttons are for the few actions everyone knows (close, more, search)
            and always have an accessible name and a tooltip.
          </Rule>
          <Rule>
            Icons beside a label are decoration: aria-hidden, 4px from the label (gap-inline), in the label's colour or
            muted-foreground.
          </Rule>
          <Rule>An icon is never the only sign of a status. Status is a word in a pill (see Color).</Rule>
          <Rule>Each next action has its own icon, used the same way everywhere: Wallet for payments, FileText for letters.</Rule>
        </Rules>
      </Section>
      <Section title="Do and don't">
        <DoDont
          good={<NextActions />}
          bad={<NextActions iconsOnly />}
          doCaption="Each row's next step says what it does, with its icon beside the words."
          dontCaption="Icons alone: a wallet, a page and a paper plane leave a new treasurer guessing."
        />
        <DoDont
          good={<Toolbar />}
          bad={<Toolbar mixed />}
          doCaption="One set, one size, one stroke."
          dontCaption="An emoji and a thin oversized icon beside lucide icons: three styles in one toolbar."
        />
      </Section>
    </Page>
  );
}

const meta = {
  title: "Foundations/Icons",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

export const Use: StoryObj<typeof meta> = { name: "Icons", render: () => <IconUse /> };
