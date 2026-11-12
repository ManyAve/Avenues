import type { Meta, StoryObj } from "@storybook/react-vite";
import { Code, Page, Section, useComputed } from "../tokens/token-docs";
import { DoDont, households, Rule, Rules, SeeTokens } from "./foundation-docs";

// How to use type. The sizes live on Tokens/Typography; this page says which step to use where, and holds the floor.
// Switch "Type scale" in the toolbar (or open the Desktop story) to see the desktop app's scale.

const roles = [
  ["display", "text-display", "The one number or name a page is about", "Dues for 2026"],
  ["heading", "text-heading", "Page title", "Households"],
  ["title", "text-title", "Card, dialog and sheet titles", "Account summary"],
  ["post", "text-post", "Reading text: announcements and letters", "The pool opens on Saturday at ten."],
  ["compact", "text-compact", "Everything else: rows, forms, body", "14 Alder Lane · R. Okafor"],
  ["control", "text-control", "Inside buttons, selects, chips and menus", "Record payment"],
  ["meta", "text-meta", "Passive detail: dates, counts, hints", "Updated 3 days ago"],
] as const;

function Role({ name, cls, use, sample }: { name: string; cls: string; use: string; sample: string }) {
  const [ref, size] = useComputed<HTMLParagraphElement>((s) => s.fontSize);
  return (
    <div className="grid grid-cols-[6rem_3.5rem_1fr] items-baseline gap-inset border-b py-row-y md:grid-cols-[6rem_3.5rem_16rem_1fr]">
      <Code className="text-foreground">{name}</Code>
      <Code>{size}</Code>
      <span className="col-span-3 text-meta text-muted-foreground md:col-span-1">{use}</span>
      <p ref={ref} className={`col-span-3 m-0 truncate md:col-span-1 ${cls}`}>
        {sample}
      </p>
    </div>
  );
}

function Row({ small }: { small?: boolean }) {
  const h = households[1];
  return (
    <div className="flex w-full max-w-sm items-center justify-between gap-group rounded-xl border bg-card px-inset py-row-y">
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-compact">{h.address}</span>
        {/* The don't deliberately uses 12px to show what breaking the floor looks like. */}
        <span className={small ? "text-[12px] leading-4 text-muted-foreground" : "text-meta text-muted-foreground"}>
          {h.owner} · last paid 14 Mar
        </span>
      </span>
      <span className="text-compact tabular-nums">{h.amount}</span>
    </div>
  );
}

function MoneyRow({ cut }: { cut?: boolean }) {
  return (
    <div className="w-56 rounded-xl border bg-card px-inset py-row-y">
      {cut ? (
        <div className="flex items-center gap-group">
          <span className="min-w-0 flex-1 truncate text-compact">27 Cedar Row, Unit B</span>
          <span className="w-12 truncate text-compact tabular-nums">$1,240.00</span>
        </div>
      ) : (
        <div className="flex flex-col gap-inline">
          <span className="truncate text-compact">27 Cedar Row, Unit B</span>
          <span className="text-compact tabular-nums">$1,240.00</span>
        </div>
      )}
    </div>
  );
}

function TypeUse() {
  const [ref, scale] = useComputed<HTMLDivElement>((s) =>
    Number.parseFloat(s.getPropertyValue("--text-compact")) === 0.875 ? "desktop" : "web",
  );
  return (
    <Page title="Typography">
      <SeeTokens>Tokens › Typography (sizes, line heights, fonts)</SeeTokens>
      <Section
        title={`Which step, where (${scale} scale)`}
        note="Seven steps, one job each. The web scale is the published one. The desktop app loads desktop.css, which brings compact down to 14px and meta to 13px; control stays 14px on both."
      >
        <div ref={ref} className="max-w-5xl">
          {roles.map(([name, cls, use, sample]) => (
            <Role key={name} name={name} cls={cls} use={use} sample={sample} />
          ))}
        </div>
      </Section>
      <Section title="Rules">
        <Rules>
          <Rule why="Board members read on phones at the mailbox and on old laptops; UX.md sets the floor.">
            Nothing is smaller than 14px. The one exception is meta on the desktop scale (13px), which is only for
            passive detail like dates and counts, never for anything someone has to act on.
          </Rule>
          <Rule why="A control's label is something to act on, so it never drops to 13px.">
            Text inside a control uses text-control, 14px on both scales. Don't size a button label with meta.
          </Rule>
          <Rule why="A cut amount or status is a wrong amount or status.">
            Never truncate or wrap money, status or button labels. Truncate the snippet first, then the owner, then the
            address; at large text, stack a row's parts instead.
          </Rule>
          <Rule why="Tabular figures keep columns of money lined up.">Money uses tabular-nums.</Rule>
          <Rule why="Shouting reads as a warning and is harder to scan.">
            Use sentence case for titles and buttons. Uppercase is only for the small tracked labels on card
            headers (DUES).
          </Rule>
        </Rules>
      </Section>
      <Section title="Do and don't">
        <DoDont
          good={<Row />}
          bad={<Row small />}
          doCaption="Secondary detail in meta: 14px on the web, 13px on desktop."
          dontCaption="12px to fit more on the line. It breaks the floor; move the detail to its own line instead."
        />
        <DoDont
          good={<MoneyRow />}
          bad={<MoneyRow cut />}
          doCaption="When the row is narrow, stack its parts so the amount stays whole."
          dontCaption="Truncating the amount to fit: $1,24… could be any number."
        />
      </Section>
    </Page>
  );
}

const meta = {
  title: "Foundations/Typography",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Web: Story = { name: "Typography (web)", render: () => <TypeUse /> };
export const Desktop: Story = { name: "Typography (desktop)", render: () => <TypeUse />, globals: { typeScale: "desktop" } };
