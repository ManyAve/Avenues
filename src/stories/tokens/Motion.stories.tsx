import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";
import { Button } from "#avenue/components/button";
import { cn } from "#avenue/lib/utils";
import { Code, Page, Section, useComputed } from "./token-docs";

// AVE-182: the three durations Foundations/Motion allows. Tailwind's duration-* sets tw-animate-css's time too, so
// `animate-in duration-fast` and `transition-opacity duration-fast` run for the same 100ms.

const durations = [
  ["fast", "duration-fast", "100ms", "An overlay opening or closing: menus, popovers, tooltips, dialogs, their backdrop"],
  ["moderate", "duration-moderate", "150ms", "A small change in place: a disclosure chevron turning, a button fading in"],
  ["slow", "duration-slow", "200ms", "The longest anything moves: a toast arriving"],
] as const;

function Duration({ name, cls, use, moved }: { name: string; cls: string; use: string; moved: boolean }) {
  // The utility's own value (--tw-duration): under test, preview.tsx zeroes every transition-duration itself.
  const [ref, time] = useComputed<HTMLDivElement>((s) => s.getPropertyValue("--tw-duration"));
  return (
    <div className="grid grid-cols-[7rem_4rem_10rem_1fr] items-center gap-4 border-b py-row-y">
      <Code className="text-foreground">{name}</Code>
      <Code>{time}</Code>
      <div className="h-control-sm w-40 rounded-md bg-muted">
        <div
          ref={ref}
          data-duration={name}
          className={cn("size-control-sm rounded-md bg-primary transition-transform motion-reduce:transition-none", cls, moved && "translate-x-33")}
        />
      </div>
      <span className="text-meta text-muted-foreground">{use}</span>
    </div>
  );
}

function DurationScale() {
  const [moved, setMoved] = useState(false);
  return (
    <Page title="Motion">
      <Section
        title="Three durations"
        note="Nothing runs longer than duration-slow. Use the name, never duration-300 or duration-[250ms]. Reduce motion cuts all three to near zero."
      >
        <div className="flex flex-col items-start gap-group">
          <Button variant="outline" onClick={() => setMoved((m) => !m)}>
            Move all three
          </Button>
          <div className="w-full">
            {durations.map(([name, cls, , use]) => (
              <Duration key={name} name={name} cls={cls} use={use} moved={moved} />
            ))}
          </div>
        </div>
      </Section>
    </Page>
  );
}

const meta = {
  title: "Tokens/Motion",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

export const Durations: StoryObj<typeof meta> = {
  render: () => <DurationScale />,
  play: async ({ canvasElement }) => {
    for (const [name, , time] of durations) {
      const el = canvasElement.querySelector(`[data-duration="${name}"]`);
      await expect(el && getComputedStyle(el).getPropertyValue("--tw-duration"), name).toBe(time);
    }
  },
};
