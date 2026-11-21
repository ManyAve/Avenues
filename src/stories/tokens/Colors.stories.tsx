import type { Meta, StoryObj } from "@storybook/react-vite";
import { cn } from "#avenue/lib/utils";
import { Code, Page, Section } from "./token-docs";

// Every colour token, light and dark (toolbar). Values come from src/styles/tokens.css, copied from the app.

const palettes = {
  onyx: ["25", "50", "100", "200", "300", "400", "500", "600", "700", "750", "800", "850", "900", "950"],
  grape: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  teal: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  slate: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
} as const;

function Palette() {
  return (
    <Page title="Palette">
      {Object.entries(palettes).map(([name, steps]) => (
        <Section
          key={name}
          title={name}
          note={
            name === "teal" || name === "slate"
              ? `Replaces Tailwind's own ${name}-* values, as the app does.`
              : `Avenue's own ${name} ramp, used through the semantic tokens.`
          }
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2">
            {steps.map((step) => (
              <div key={step} className="flex flex-col gap-1">
                <div
                  className="h-12 rounded-md border"
                  style={{ background: `var(--color-${name}-${step})` }}
                />
                <Code className="text-foreground">{step}</Code>
              </div>
            ))}
          </div>
        </Section>
      ))}
    </Page>
  );
}

const fills = [
  ["primary", "bg-primary", "text-primary-foreground"],
  ["secondary", "bg-secondary", "text-secondary-foreground"],
  ["muted", "bg-muted", "text-muted-foreground"],
  ["accent", "bg-accent", "text-accent-foreground"],
  ["fill", "bg-fill", "text-foreground"],
  ["success", "bg-success", "text-success-foreground"],
  ["info", "bg-info", "text-info-foreground"],
  ["warning", "bg-warning", "text-warning-foreground"],
  ["destructive", "bg-destructive", "text-destructive-foreground"],
] as const;

const subtle = [
  ["primary-subtle", "bg-primary-subtle", "text-primary-subtle-foreground"],
  ["slate-subtle", "bg-slate-subtle", "text-slate-subtle-foreground"],
  ["success-subtle", "bg-success-subtle", "text-success-subtle-foreground"],
  ["info-subtle", "bg-info-subtle", "text-info-subtle-foreground"],
  ["warning-subtle", "bg-warning-subtle", "text-warning-subtle-foreground"],
  ["destructive-subtle", "bg-destructive-subtle", "text-destructive-subtle-foreground"],
] as const;

const surfaces = [
  ["background", "bg-background", "text-foreground"],
  ["card", "bg-card", "text-card-foreground"],
  ["popover", "bg-popover", "text-popover-foreground"],
  ["sidebar", "bg-sidebar", "text-sidebar-foreground"],
  ["sidebar-primary", "bg-sidebar-primary", "text-sidebar-primary-foreground"],
  ["sidebar-accent", "bg-sidebar-accent", "text-sidebar-accent-foreground"],
] as const;

function Pairs({ items }: { items: readonly (readonly [string, string, string])[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
      {items.map(([name, surface, text]) => (
        <div
          key={name}
          className={cn("flex h-20 flex-col justify-end rounded-xl border p-3 shadow-card", surface, text)}
        >
          <span className="text-compact font-medium">{name}</span>
          <span className="text-meta">Aa 123</span>
        </div>
      ))}
    </div>
  );
}

const text = [
  ["foreground", "text-foreground", "Typed text and body copy"],
  ["muted-foreground", "text-muted-foreground", "Secondary text: hints, meta, captions"],
  ["placeholder", "text-placeholder", "A field's placeholder, at least 2:1 from typed text (AVE-186)"],
] as const;

function TextColors() {
  return (
    <div className="flex flex-col gap-group rounded-xl border bg-card p-3 shadow-card">
      {text.map(([name, cls, use]) => (
        <div key={name} className="flex flex-wrap items-baseline gap-group">
          <Code className="w-40 text-foreground">{name}</Code>
          <span className={cn("text-compact", cls)}>{use}</span>
        </div>
      ))}
    </div>
  );
}

function SemanticColors() {
  return (
    <Page title="Semantic colours">
      <Section title="Fills" note="Each fill with its foreground. Text on every pair reaches 4.5:1 in both themes.">
        <Pairs items={fills} />
      </Section>
      <Section title="Subtle fills" note="Badges, alerts and highlighted rows.">
        <Pairs items={subtle} />
      </Section>
      <Section title="Surfaces">
        <Pairs items={surfaces} />
      </Section>
      <Section title="Text" note="On a card. Each reaches 4.5:1 on the page, card and muted fill in both themes.">
        <TextColors />
      </Section>
    </Page>
  );
}

const lines = [
  ["border", "border-border"],
  ["input", "border-input"],
  ["control-outline", "border-control-outline"],
  ["border-floating", "border-border-floating"],
  ["sidebar-border", "border-sidebar-border"],
] as const;

function LinesAndCharts() {
  return (
    <Page title="Lines, focus and charts">
      <Section title="Lines">
        <div className="flex flex-wrap gap-4">
          {lines.map(([name, cls]) => (
            <div key={name} className={cn("flex h-16 w-40 items-end rounded-lg border-2 bg-card p-3", cls)}>
              <Code className="text-foreground">{name}</Code>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Focus ring" note="ring and sidebar-ring; the base layer draws outlines at ring/50.">
        <div className="flex flex-wrap gap-4">
          <div className="flex h-16 w-40 items-end rounded-lg bg-card p-3 ring-2 ring-ring ring-offset-2 ring-offset-background">
            <Code className="text-foreground">ring</Code>
          </div>
          <div className="flex h-16 w-40 items-end rounded-lg bg-sidebar p-3 ring-2 ring-sidebar-ring ring-offset-2 ring-offset-background">
            <Code className="text-foreground">sidebar-ring</Code>
          </div>
        </div>
      </Section>
      <Section title="Charts">
        <div className="flex h-32 items-end gap-3">
          {(["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"] as const).map((cls, i) => (
            <div key={cls} className="flex w-16 flex-col items-center gap-1">
              <div className={cn("w-full rounded-t-md", cls)} style={{ height: `${(5 - i) * 1.25 + 1}rem` }} />
              <Code className="text-foreground">chart-{i + 1}</Code>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  );
}

const tints = ["teal", "plum", "iris", "stone"] as const;

function Tints() {
  return (
    <Page title="Decorative tints">
      <Section
        title="data-tint"
        note="Avatars and street bars, picked by hashing a name. They carry no status meaning; green, amber and blue stay for paid, owing and processing."
      >
        <div className="flex flex-wrap gap-6">
          {tints.map((tint) => (
            <div key={tint} data-tint={tint} className="flex items-center gap-3">
              <span
                className="flex size-10 items-center justify-center rounded-full text-compact font-semibold"
                style={{ background: "var(--tint-bg)", color: "var(--tint-fg)" }}
              >
                {tint.slice(0, 2).toUpperCase()}
              </span>
              <span className="h-10 w-1 rounded-full" style={{ background: "var(--tint-solid)" }} />
              <Code className="text-foreground">{tint}</Code>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  );
}

const meta = {
  title: "Tokens/Colors",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Semantic: Story = { render: () => <SemanticColors /> };
export const PaletteRamps: Story = { name: "Palette", render: () => <Palette /> };
export const LinesFocusCharts: Story = { name: "Lines, focus and charts", render: () => <LinesAndCharts /> };
export const DecorativeTints: Story = { name: "Decorative tints", render: () => <Tints /> };
