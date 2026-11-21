import type { Meta, StoryObj } from "@storybook/react-vite";
import { Code, Page, Section } from "../tokens/token-docs";
import { DoDont, households, Rule, Rules } from "./foundation-docs";

// Light and dark. The app's dark theme is the `.dark` class on <html>; Storybook's toolbar flips the same class.
// Open this page in both themes: the don't examples only show their problem in one of them.

const pairs = [
  ["Page", "bg-background text-foreground"],
  ["Card, table frame", "bg-card text-card-foreground"],
  ["Menu, popover, dialog", "bg-popover text-popover-foreground"],
  ["Quiet fill, secondary text", "bg-muted text-muted-foreground"],
  ["Highlighted item in a list", "bg-accent text-accent-foreground"],
  ["Skeleton, progress track, quote", "bg-fill text-foreground"],
  ["Lines", "border-border, inputs border-input"],
  ["Focus", "ring-ring (outline at ring/50)"],
] as const;

function Card({ fixed }: { fixed?: boolean }) {
  const h = households[2];
  return (
    <div
      className={
        fixed
          ? // The don't hard-codes light-theme colours on purpose.
            // oxlint-disable-next-line tailwindcss/no-hardcoded-colors
            "flex w-full max-w-xs flex-col gap-inline rounded-xl border border-[#e5e5e5] bg-[#ffffff] p-inset text-[#171717]"
          : "flex w-full max-w-xs flex-col gap-inline rounded-xl border bg-card p-inset text-card-foreground shadow-card"
      }
    >
      <span className="text-compact font-medium">{h.address}</span>
      {/* oxlint-disable-next-line tailwindcss/no-hardcoded-colors -- the don't, as above. */}
      <span className={fixed ? "text-meta text-[#525252]" : "text-meta text-muted-foreground"}>
        {h.owner} · {h.amount} owed of $240.00
      </span>
    </div>
  );
}

function Tag({ raw }: { raw?: boolean }) {
  return (
    <span
      className={
        raw
          ? "inline-flex h-6 items-center rounded-full px-2 text-meta font-medium"
          : "inline-flex h-6 items-center rounded-full bg-primary-subtle px-2 text-meta font-medium text-primary-subtle-foreground"
      }
      // The don't reaches past the semantic tokens to two fixed palette steps, on purpose.
      style={raw ? { background: "var(--color-grape-100)", color: "var(--color-grape-700)" } : undefined}
    >
      Board member
    </span>
  );
}

function ThemeUse() {
  return (
    <Page title="Theming">
      <Section
        title="One set of names, two themes"
        note="Components name a role (card, muted, border), never a colour. Each role has a light and a dark value, so the same markup is right in both themes."
      >
        <div className="max-w-3xl">
          {pairs.map(([use, cls]) => (
            <div key={use} className="grid grid-cols-[12rem_1fr] items-center gap-inset border-b py-row-y">
              <span className="text-compact">{use}</span>
              <Code className="text-foreground">{cls}</Code>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Rules">
        <Rules>
          <Rule why="A fixed colour is right in one theme and wrong in the other.">
            Use the semantic tokens only. No hex, rgb or oklch values, and no palette steps (grape-100, onyx-700) in
            components; those exist to define the tokens.
          </Rule>
          <Rule>
            Pair every fill with its own foreground: bg-card with text-card-foreground, bg-warning-subtle with
            text-warning-subtle-foreground. The pairs are checked for 4.5:1 contrast in both themes.
          </Rule>
          <Rule why="Light surfaces are white and lift with a close shadow; dark surfaces step up in onyx.">
            Don't fake depth with a darker or lighter grey. Use the surface tokens and the three shadows (see
            Elevation).
          </Rule>
          <Rule>
            Dark is the .dark class on the html element, as in the app. Write dark: variants only when a token can't
            express the difference.
          </Rule>
          <Rule>Check every story in light and dark before it's done.</Rule>
        </Rules>
      </Section>
      <Section title="Do and don't" note="Switch the toolbar to dark: the don'ts stay light.">
        <DoDont
          good={<Card />}
          bad={<Card fixed />}
          doCaption="bg-card, text-card-foreground, text-muted-foreground: right in both themes."
          dontCaption="White and near-black written as hex. Identical in light mode; a bright slab in dark mode."
        />
        <DoDont
          good={<Tag />}
          bad={<Tag raw />}
          doCaption="A tag in primary-subtle and its foreground."
          dontCaption="grape-100 and grape-700 picked from the palette: a pale chip that glares on a dark page."
        />
      </Section>
    </Page>
  );
}

const meta = {
  title: "Foundations/Theming",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

export const Use: StoryObj<typeof meta> = { name: "Theming", render: () => <ThemeUse /> };
