import type { Meta, StoryObj } from "@storybook/react-vite";
import { households } from "../foundations/foundation-docs";
import { Code, Page, Section } from "./token-docs";

// Lifted surfaces (AVE-115). Avenue's default light page and cards are both white, and its dark muted fill is the
// card's own colour: right for an app whose cards carry a border (Management), too faint for one whose cards don't
// (Neighbors). `data-surface="lifted"` steps the page and the quiet fills so a borderless card, a field's fill and a
// skeleton still show. scripts/surface-contrast.test.ts holds the floors.

function BorderlessCard() {
  const [first, second] = households;
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-inset text-card-foreground shadow-card">
      <span className="text-compact font-medium">{first.address}</span>
      <div className="flex h-8 items-center rounded-lg bg-muted px-2 text-meta text-muted-foreground">
        Field fill on a card
      </div>
      <div className="flex flex-col gap-2" aria-hidden="true">
        <div className="h-3 w-2/3 rounded-sm bg-accent" />
        <div className="h-3 w-1/2 rounded-sm bg-accent" />
      </div>
      <div className="flex items-center justify-between rounded-lg bg-accent px-2 py-1 text-meta text-accent-foreground">
        <span>{second.address}</span>
        <span>Hovered row</span>
      </div>
    </div>
  );
}

function Panel({ label, lifted }: { label: string; lifted?: boolean }) {
  return (
    <div
      data-surface={lifted ? "lifted" : undefined}
      className="flex w-full max-w-sm flex-col gap-3 rounded-xl bg-background p-inset text-foreground"
    >
      <span className="text-meta font-medium text-muted-foreground">{label}</span>
      <BorderlessCard />
      <div className="flex h-8 items-center rounded-lg bg-muted px-2 text-meta text-muted-foreground">
        Field fill on the page
      </div>
    </div>
  );
}

function Surfaces() {
  return (
    <Page title="Surfaces">
      <Section
        title="Default and lifted"
        note='The same borderless card, field fills, skeleton and hovered row on each set. Lifted is opt-in: data-surface="lifted" on <html>, or on an element that paints bg-background. Open it in both themes.'
      >
        <div className="flex flex-wrap gap-6">
          <Panel label="Default" />
          <Panel label="Lifted" lifted />
        </div>
      </Section>
      <Section title="What lifted changes">
        <ul className="flex max-w-prose list-disc flex-col gap-1 pl-5 text-meta">
          <li>
            Light: <Code>background</Code> steps to onyx-50 under white cards; <Code>muted</Code> and <Code>accent</Code>{" "}
            step to onyx-100.
          </li>
          <li>
            Dark: <Code>muted</Code> steps to onyx-800, one above the card, instead of equal to it.
          </li>
          <li>Everything else, including borders, shadows and status colours, stays the default.</li>
        </ul>
      </Section>
    </Page>
  );
}

function LiftedPage() {
  return (
    <Page title="Lifted page">
      <div className="flex max-w-md flex-col gap-3">
        {households.slice(0, 3).map((h) => (
          <div key={h.address} className="flex flex-col gap-1 rounded-xl bg-card p-inset text-card-foreground shadow-card">
            <span className="text-compact font-medium">{h.address}</span>
            <span className="text-meta text-muted-foreground">
              {h.owner} · {h.amount}
            </span>
          </div>
        ))}
        <div className="flex h-8 items-center rounded-lg bg-muted px-2 text-meta text-muted-foreground">
          Field fill on the page
        </div>
      </div>
    </Page>
  );
}

const meta = {
  title: "Tokens/Surfaces",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DefaultAndLifted: Story = { name: "Default and lifted", render: () => <Surfaces /> };
/** The whole page lifted from <html>, the way an app opts in. */
export const Lifted: Story = { name: "Lifted page", render: () => <LiftedPage />, globals: { surface: "lifted" } };
