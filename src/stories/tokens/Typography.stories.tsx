import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { cn } from "#avenue/lib/utils";
import { Code, Page, Section, useComputed } from "./token-docs";

// The type scale as the browser renders it. Switch "Type scale" in the toolbar to desktop to load desktop.css,
// which drops compact to 14px and meta to 13px; control stays 14px on both.

const steps = [
  ["display", "text-display", "Dues for 2026"],
  ["heading", "text-heading", "Maple Row households"],
  ["title", "text-title", "Account summary"],
  ["post", "text-post", "The pool opens on Saturday at ten."],
  ["compact", "text-compact", "Body text and ordinary controls."],
  ["control", "text-control", "Inside buttons, selects and row actions."],
  ["meta", "text-meta", "Updated 3 days ago by the treasurer."],
] as const;

function Step({ name, cls, sample }: { name: string; cls: string; sample: string }) {
  const [ref, size] = useComputed<HTMLParagraphElement>((s) => `${s.fontSize} / ${s.lineHeight}`);
  return (
    <div className="grid grid-cols-[7rem_10rem_1fr] items-baseline gap-4 border-b py-row-y">
      <Code className="text-foreground">{name}</Code>
      <Code>{size}</Code>
      <p ref={ref} className={cn(cls, "truncate")}>
        {sample}
      </p>
    </div>
  );
}

function TypeScale() {
  const [ref, scale] = useComputed<HTMLDivElement>((s) =>
    Number.parseFloat(s.getPropertyValue("--text-compact")) === 0.875 ? "desktop" : "web",
  );
  return (
    <Page title="Type scale">
      <Section
        title={`App scale: ${scale}`}
        note="Six steps with a 14px floor on the web. text-xs and text-sm follow meta and compact, so shadcn primitives use the app scale."
      >
        <div ref={ref}>
          {steps.map(([name, cls, sample]) => (
            <Step key={name} name={name} cls={cls} sample={sample} />
          ))}
        </div>
      </Section>
      <Section title="Fonts">
        <div className="flex flex-col gap-2">
          <p className="font-sans text-compact">Sans: system UI stack, with the ss01 stylistic set.</p>
          <p className="font-mono text-compact">Mono: JetBrains Mono, then the platform monospace. 0123456789</p>
        </div>
      </Section>
    </Page>
  );
}

// Name, class and the size tokens.css gives it.
const webSite = [
  ["web-hero", "text-web-hero", "38px"],
  ["web-hero-narrow", "text-web-hero-narrow", "34px"],
  ["web-section", "text-web-section", "24px"],
  ["web-card", "text-web-card", "17px"],
  ["web-glyph", "text-web-glyph", "55px"],
] as const;

function SiteStep({ name, cls }: { name: string; cls: string }) {
  const [ref, size] = useComputed<HTMLParagraphElement>((s) => s.fontSize);
  return (
    <div className="grid grid-cols-[10rem_6rem_1fr] items-baseline gap-4 border-b py-row-y">
      <Code className="text-foreground">{name}</Code>
      <Code>{size}</Code>
      <p ref={ref} className={cn(cls, "truncate leading-tight")} style={{ fontFamily: "Georgia, serif" }}>
        Maple Row
      </p>
    </div>
  );
}

// AVE-182: Tailwind's three weights and the three Avenue adds, in order, with where each goes.
const weights = [
  ["normal", "font-normal", "400", "Body text, descriptions, a field's help"],
  ["quiet", "font-quiet", "450", "Small muted text, so it keeps its stroke: column headers, an outline status"],
  ["medium", "font-medium", "500", "Controls and labels: buttons, tabs, field labels, table headings"],
  ["emphasis", "font-emphasis", "550", "A title or term inside body text: row and list titles, detail terms, the open nav tab"],
  ["semibold", "font-semibold", "600", "A selected or today date, a count badge, an empty state's title"],
  ["heading", "font-heading", "620", "Page and detail headings"],
] as const;

function Weight({ name, cls, use }: { name: string; cls: string; use: string }) {
  const [ref, weight] = useComputed<HTMLParagraphElement>((s) => s.fontWeight);
  return (
    <div className="grid grid-cols-[7rem_4rem_16rem_1fr] items-baseline gap-4 border-b py-row-y">
      <Code className="text-foreground">{name}</Code>
      <Code>{weight}</Code>
      <p ref={ref} className={cn(cls, "truncate text-compact")}>
        Maple Row households
      </p>
      <span className="text-meta text-muted-foreground">{use}</span>
    </div>
  );
}

function WeightScale() {
  return (
    <Page title="Font weight">
      <Section
        title="Six weights"
        note="normal, medium and semibold are Tailwind's own. quiet, emphasis and heading are the in-between weights the app draws, named for where they go. Use the name, never font-[550]."
      >
        {weights.map(([name, cls, , use]) => (
          <Weight key={name} name={name} cls={cls} use={use} />
        ))}
      </Section>
    </Page>
  );
}

function SiteScale() {
  return (
    <Page title="Public-site preview scale">
      <Section
        title="Georgia display sizes"
        note="Used only by the public-site preview; its body and meta reuse the app steps. Each is a utility (text-web-card, ...) with no line height of its own: the place that uses it sets one."
      >
        {webSite.map(([name, cls]) => (
          <SiteStep key={name} name={name} cls={cls} />
        ))}
      </Section>
    </Page>
  );
}

const meta = {
  title: "Tokens/Typography",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Scale: Story = { render: () => <TypeScale /> };
export const Desktop: Story = { render: () => <TypeScale />, globals: { typeScale: "desktop" } };
export const Weights: Story = {
  name: "Font weight",
  render: () => <WeightScale />,
  // Each weight class makes its weight (AVE-182).
  play: async ({ canvasElement }) => {
    for (const [, cls, weight] of weights) {
      const el = canvasElement.querySelector(`.${cls}`);
      await expect(el && getComputedStyle(el).fontWeight, cls).toBe(weight);
    }
  },
};
export const PublicSite: Story = {
  name: "Public-site preview",
  render: () => <SiteScale />,
  // Each text-web-* class makes its font size (AVE-178): before, Tailwind made no CSS for them.
  play: async ({ canvasElement }) => {
    for (const [, cls, px] of webSite) {
      const el = canvasElement.querySelector(`.${cls}`);
      await expect(el && getComputedStyle(el).fontSize, cls).toBe(px);
    }
  },
};
