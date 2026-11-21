import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { cn } from "#avenue/lib/utils";
import { Code, Page, Section, useComputed } from "./token-docs";

// Shadows and surface levels. Light surfaces are white and lift with a close shadow; dark ones step up in onyx.

const shadows = [
  ["shadow-control", "shadow-control", "A raised part inside a control, such as a selected segment"],
  ["shadow-card", "shadow-card", "Cards and table frames"],
  ["shadow-popover", "shadow-popover", "Menus, popovers and dialogs"],
] as const;

const levels = [
  ["elevated-0", "Sidebar and app frame"],
  ["elevated-1", "Page background"],
  ["elevated-2", "Cards and popovers"],
] as const;

// AVE-182: the page-level stack, lowest first. A small order inside one component keeps Tailwind's numbers under
// `isolate`; these are for things that stack against the rest of the page.
const layers = [
  ["sticky-group", "z-sticky-group", "5", "A sticky group or day bar, which scrolls under the column header"],
  ["sticky", "z-sticky", "10", "A sticky column header"],
  ["sticky-bar", "z-sticky-bar", "20", "A toolbar, tab bar or page header stuck to the top, above the sticky column headers"],
  ["dock", "z-dock", "40", "The docked windows along the bottom edge"],
  ["overlay", "z-overlay", "50", "Dialogs, alert dialogs, drawers and their backdrop"],
  ["toast", "z-toast", "70", "Toasts, above an open dialog"],
] as const;

function Layer({ name, cls, use }: { name: string; cls: string; use: string }) {
  const [ref, z] = useComputed<HTMLSpanElement>((s) => s.zIndex);
  return (
    <div className="grid grid-cols-[8rem_3rem_10rem_1fr] items-baseline gap-4 border-b py-row-y">
      <Code className="text-foreground">{name}</Code>
      <Code>{z}</Code>
      <Code>
        <span ref={ref} data-layer={name} className={cn("relative", cls)}>
          {cls}
        </span>
      </Code>
      <span className="text-meta text-muted-foreground">{use}</span>
    </div>
  );
}

function Layers() {
  return (
    <Page title="Layers">
      <Section title="Stack" note="Use the name, never z-50 or z-[70], for anything that stacks against the page.">
        <div>
          {layers.map(([name, cls, , use]) => (
            <Layer key={name} name={name} cls={cls} use={use} />
          ))}
        </div>
      </Section>
      <Section
        title="Overlay"
        note="bg-overlay dims the page behind a dialog, alert dialog or drawer: 10% black in both themes. ui-sdk's --ui-overlay reads the same token."
      >
        <div className="relative isolate h-32 w-80 overflow-hidden rounded-xl border bg-background p-inset">
          <span className="text-meta text-muted-foreground">Maple Row households</span>
          <div data-slot="overlay-sample" className="absolute inset-0 bg-overlay" />
          <div className="absolute end-inset bottom-inset rounded-lg bg-popover px-4 py-2 text-meta shadow-popover">
            Record payment
          </div>
        </div>
      </Section>
    </Page>
  );
}

function Elevation() {
  return (
    <Page title="Elevation">
      <Section title="Shadows">
        <div className="flex flex-wrap gap-6">
          {shadows.map(([name, cls, use]) => (
            <div key={name} className={cn("flex h-24 w-48 flex-col justify-end gap-1 rounded-xl bg-card p-inset", cls)}>
              <Code className="text-foreground">{name}</Code>
              <span className="text-meta text-muted-foreground">{use}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section
        title="Surface levels"
        note="In light mode the app paints background, card, popover and sidebar white instead, so these levels reach surfaces only in dark mode."
      >
        <div className="flex flex-wrap gap-6">
          {levels.map(([name, use]) => (
            <div
              key={name}
              className="flex h-24 w-48 flex-col justify-end gap-1 rounded-xl border p-inset"
              style={{ background: `var(--${name})` }}
            >
              <Code className="text-foreground">{name}</Code>
              <span className="text-meta text-muted-foreground">{use}</span>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  );
}

const meta = {
  title: "Tokens/Elevation",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

export const Shadows: StoryObj<typeof meta> = { render: () => <Elevation /> };
export const LayerStack: StoryObj<typeof meta> = {
  name: "Layers",
  render: () => <Layers />,
  play: async ({ canvasElement }) => {
    for (const [name, , z] of layers) {
      const el = canvasElement.querySelector(`[data-layer="${name}"]`);
      await expect(el && getComputedStyle(el).zIndex, name).toBe(z);
    }
    const overlay = canvasElement.querySelector('[data-slot="overlay-sample"]');
    await expect(overlay && getComputedStyle(overlay).backgroundColor).toBe("rgba(0, 0, 0, 0.1)");
  },
};
