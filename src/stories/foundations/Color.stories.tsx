import type { Meta, StoryObj } from "@storybook/react-vite";
import { cn } from "#avenue/lib/utils";
import { Code, Page, Section } from "../tokens/token-docs";
import { DoDont, households, Rule, Rules, SeeTokens } from "./foundation-docs";

// How to use colour. The values live on Tokens/Colors; this page says which colour means what.
// The status meanings are the app's own (ManyAve Management, app/ui/components/cell-data.ts at e01cc90).

type Tone = "success" | "warning" | "primary" | "info" | "neutral" | "destructive";

const dot: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  primary: "bg-primary",
  info: "bg-info",
  neutral: "bg-slate-subtle-foreground",
  destructive: "bg-destructive",
};

const fill: Record<Tone, string> = {
  success: "bg-success-subtle text-success-subtle-foreground",
  warning: "bg-warning-subtle text-warning-subtle-foreground",
  primary: "bg-primary-subtle text-primary-subtle-foreground",
  info: "bg-info-subtle text-info-subtle-foreground",
  neutral: "bg-slate-subtle text-slate-subtle-foreground",
  destructive: "bg-destructive-subtle text-destructive-subtle-foreground",
};

/** The app's status pill: outlined with a coloured dot, or `filled` with a tint. The word always carries the meaning. */
function Status({ tone, filled, children }: { tone: Tone; filled?: boolean; children: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-inline rounded-full px-2 text-meta font-medium whitespace-nowrap",
        filled ? fill[tone] : "border bg-background text-muted-foreground",
      )}
    >
      {filled ? null : <span aria-hidden="true" className={cn("size-2 rounded-full", dot[tone])} />}
      {children}
    </span>
  );
}

const tones: readonly (readonly [Tone, string, string])[] = [
  ["success", "Done, nothing more to do", "Paid · Resolved"],
  ["warning", "Needs the board's attention soon", "Owing · Follow-up due"],
  ["primary", "Part-way, or ready for the board to act on", "Partial · Draft ready"],
  ["info", "Settled but worth knowing", "In credit · Letter recorded"],
  ["neutral", "Waiting, not set, or not yet looked at", "Processing · Not set · Needs review"],
  ["destructive", "Something failed, or an action can't be undone", "Payment request failed · Delete household"],
];

const duesStatus = {
  paid: ["success", "Paid"],
  owing: ["warning", "Owing"],
  partial: ["primary", "Partial"],
  credit: ["info", "In credit"],
  processing: ["neutral", "Processing"],
} as const;

function Rows({ colourOnly }: { colourOnly?: boolean }) {
  return (
    <div className="w-full max-w-sm divide-y rounded-xl border bg-card">
      {households.slice(0, 3).map((h) => {
        const [tone, label] = duesStatus[h.status];
        return (
          <div key={h.address} className="flex items-center justify-between gap-group px-inset py-row-y">
            <span className="text-compact">{h.address}</span>
            <span className="flex items-center gap-group">
              <span className="text-compact tabular-nums">{h.amount}</span>
              {colourOnly ? (
                <span className={cn("size-3 rounded-full", dot[tone])}>
                  <span className="sr-only">{label}</span>
                </span>
              ) : (
                <Status tone={tone}>{label}</Status>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StatusColour() {
  return (
    <Page title="Color">
      <SeeTokens>Tokens › Colors</SeeTokens>
      <Section
        title="What each status colour means"
        note="Five tones carry status, plus destructive for failures and actions that can't be undone. Pick the tone by what the board should do next, not by how good or bad the news feels."
      >
        <div className="flex max-w-3xl flex-col">
          {tones.map(([tone, meaning, examples]) => (
            <div key={tone} className="grid grid-cols-[7rem_1fr] items-center gap-inset border-b py-row-y sm:grid-cols-[7rem_1fr_14rem]">
              <Code className="text-foreground">{tone}</Code>
              <span className="text-compact">{meaning}</span>
              <span className="col-span-2 flex flex-wrap gap-group sm:col-span-1">
                {examples.split(" · ").map((label) => (
                  <Status key={label} tone={tone}>
                    {label}
                  </Status>
                ))}
              </span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Rules">
        <Rules>
          <Rule why="About one in twelve men can't tell green from amber, and a dot means nothing to a screen reader.">
            Colour never carries meaning alone. A status is always a word, with the colour as a second signal.
          </Rule>
          <Rule why="The outlined pill keeps busy tables calm; the filled one is for a register where status is the point.">
            Use the outlined pill with a dot in tables and lists. Use the filled tint only where status is the main
            thing on the row, as in the complaints register.
          </Rule>
          <Rule why="Primary is the brand and the main action; red reads as an error.">
            Primary marks the one main action on a screen and part-way states. Destructive is only for failures and
            actions that can't be undone, never for money that is merely owed.
          </Rule>
          <Rule why="They are hashed from a name, so the same colour lands on unrelated households.">
            The decorative tints (teal, plum, iris, stone) are for avatars and street bars only and never mean a
            status.
          </Rule>
          <Rule why="Every pair is checked for 4.5:1 contrast in both themes; a hand-picked colour isn't.">
            Put text in a fill's own foreground: text-success-subtle-foreground on bg-success-subtle, not body text
            or a palette step.
          </Rule>
        </Rules>
      </Section>
      <Section title="Do and don't">
        <DoDont
          good={<Rows />}
          bad={<Rows colourOnly />}
          doCaption="Say the status in words, with the dot as a second signal."
          dontCaption="A coloured dot alone: green and amber look alike to many people."
        />
        <DoDont
          good={
            <div className="flex flex-wrap gap-group">
              <Status tone="warning">Owing</Status>
              <Status tone="warning">Follow-up due</Status>
            </div>
          }
          bad={
            <div className="flex flex-wrap gap-group">
              <Status tone="destructive" filled>
                Owing
              </Status>
              <Status tone="destructive" filled>
                Follow-up due
              </Status>
            </div>
          }
          doCaption="Owed dues and due follow-ups are warning: the board has something to do."
          dontCaption="Red for owing reads as an error and alarms neighbours who simply haven't paid yet."
        />
      </Section>
    </Page>
  );
}

const meta = {
  title: "Foundations/Color",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

export const StatusAndUse: StoryObj<typeof meta> = { name: "Colour and status", render: () => <StatusColour /> };
