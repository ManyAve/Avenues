import type { Meta, StoryObj } from "@storybook/react-vite";
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
    s.getPropertyValue("--text-compact").trim() === "0.875rem" ? "desktop" : "web",
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

const webSite = [
  ["web-hero", "--text-web-hero"],
  ["web-hero-narrow", "--text-web-hero-narrow"],
  ["web-section", "--text-web-section"],
  ["web-card", "--text-web-card"],
  ["web-glyph", "--text-web-glyph"],
] as const;

function SiteScale() {
  return (
    <Page title="Public-site preview scale">
      <Section
        title="Georgia display sizes"
        note="Used only by the embedded public-site preview; its body and meta reuse the app steps. These are raw sizes, not utilities."
      >
        {webSite.map(([name, variable]) => (
          <div key={name} className="grid grid-cols-[10rem_1fr] items-baseline gap-4 border-b py-row-y">
            <Code className="text-foreground">{name}</Code>
            <p className="truncate leading-tight" style={{ fontFamily: "Georgia, serif", fontSize: `var(${variable})` }}>
              Maple Row
            </p>
          </div>
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
export const PublicSite: Story = { name: "Public-site preview", render: () => <SiteScale /> };
