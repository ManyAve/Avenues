import type { Meta, StoryObj } from "@storybook/react-vite";
import { cn } from "../../lib/utils";
import { Code, Page, Section } from "./token-docs";

// Shadows and surface levels. Light surfaces are white and lift with a close shadow; dark ones step up in onyx.

const shadows = [
  ["shadow-control", "shadow-control", "Inputs, selects and secondary buttons"],
  ["shadow-card", "shadow-card", "Cards and table frames"],
  ["shadow-popover", "shadow-popover", "Menus, popovers and dialogs"],
] as const;

const levels = [
  ["elevated-0", "Sidebar and app frame"],
  ["elevated-1", "Page background"],
  ["elevated-2", "Cards and popovers"],
] as const;

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
