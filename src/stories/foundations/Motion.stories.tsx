import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";
import { Button } from "#avenue/components/button";
import { cn } from "#avenue/lib/utils";
import { Code, Page, Section } from "../tokens/token-docs";
import { DoDont, households, Rule, Rules } from "./foundation-docs";

// How things move. The app's overlays (menus, popovers, dialogs, tooltips) open with tw-animate-css at 100ms:
// fade-in-0 plus zoom-in-95, from the trigger's side. Toasts slide up 8px. Hover and focus use transition-colors.
// Avenue's stylesheet honours prefers-reduced-motion on every surface, as the desktop app's desktop.css does.

const patterns = [
  ["Menu, popover, tooltip", "100ms fade and zoom from 95%, from the side it opens on", "data-open:animate-in fade-in-0 zoom-in-95 duration-fast"],
  ["Dialog", "100ms fade and zoom; the backdrop fades", "data-open:animate-in fade-in-0 zoom-in-95 duration-fast"],
  ["Toast", "Fades in and slides up 8px", "animate-in fade-in slide-in-from-bottom-2 duration-slow"],
  ["Hover, focus, press", "Colour change only; buttons drop 1px when pressed", "transition-colors"],
  ["Disclosure chevron", "Turns 180° as the section opens", "transition-transform duration-moderate rotate-180"],
] as const;

function useReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setReduced(list.matches);
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Replays an opening menu so the motion can be compared. `slow` is the don't: a long slide from far away. */
function Replay({ slow }: { slow?: boolean }) {
  const [run, setRun] = useState(0);
  return (
    <div className="flex w-full max-w-xs flex-col items-start gap-group">
      <Button variant="outline" onClick={() => setRun((n) => n + 1)}>
        Replay
      </Button>
      <div
        key={run}
        className={cn(
          "flex w-48 flex-col rounded-lg border bg-popover p-1 shadow-popover animate-in",
          // The don't is deliberately slow and far: 600ms, sliding 48px.
          slow ? "fade-in-0 slide-in-from-left-12 duration-[600ms]" : "fade-in-0 zoom-in-95 slide-in-from-top-2 duration-fast",
        )}
      >
        {["Record payment", "Send reminder", "Open ledger"].map((item) => (
          <span key={item} className="rounded-sm px-2 py-1 text-control">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Total({ counting }: { counting?: boolean }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(960);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);
  // The don't counts up once per Replay, and never when Reduce motion is on.
  const replay = () => {
    if (!counting || reduced) return;
    window.clearInterval(timer.current);
    let n = 0;
    setShown(0);
    timer.current = window.setInterval(() => {
      n += 80;
      setShown(Math.min(n, 960));
      if (n >= 960) window.clearInterval(timer.current);
    }, 60);
  };
  return (
    <div className="flex w-full max-w-xs flex-col items-start gap-group">
      <Button variant="outline" onClick={replay}>
        Replay
      </Button>
      <div className="flex w-full flex-col gap-inline rounded-xl border bg-card p-inset">
        <span className="text-meta text-muted-foreground">Collected this year · {households.length} households</span>
        <span className="text-title font-semibold tabular-nums">${shown.toLocaleString("en-US")}.00</span>
      </div>
    </div>
  );
}

function MotionUse() {
  const reduced = useReducedMotion();
  return (
    <Page title="Motion">
      <Section
        title="What moves, and how"
        note="Motion only explains where something came from. Everything is short, so the app never makes anyone wait for an animation."
      >
        <div className="max-w-5xl">
          {patterns.map(([what, how, cls]) => (
            <div key={what} className="grid grid-cols-1 gap-inline border-b py-row-y md:grid-cols-[12rem_1fr_22rem] md:items-center md:gap-inset">
              <span className="text-compact font-medium">{what}</span>
              <span className="text-compact">{how}</span>
              <Code>{cls}</Code>
            </div>
          ))}
        </div>
      </Section>
      <Section
        title="Reduced motion"
        note="When someone turns on Reduce motion in their system settings, Avenue's stylesheet cuts every animation and transition to near zero, so things appear in place. Nothing else changes: the same states, the same focus."
      >
        <p className="m-0 flex items-center gap-group text-compact">
          <span
            className={cn(
              "inline-flex h-6 items-center rounded-full px-2 text-meta font-medium",
              reduced ? "bg-info-subtle text-info-subtle-foreground" : "bg-slate-subtle text-slate-subtle-foreground",
            )}
          >
            {reduced ? "Reduce motion is on" : "Reduce motion is off"}
          </span>
          <span className="text-muted-foreground">on this device, right now.</span>
        </p>
      </Section>
      <Section title="Rules">
        <Rules>
          <Rule why="A board member doing one quick job shouldn't wait for the interface.">
            Overlays open in 100ms. Nothing animates for longer than 200ms. Name the step: duration-fast (100ms),
            duration-moderate (150ms) or duration-slow (200ms), never a number (Tokens/Motion).
          </Rule>
          <Rule why="Motion that isn't triggered by the person pulls their eye away from the task.">
            Nothing moves on its own. No counting-up numbers, looping pulses or animated page changes; a spinner is the
            only motion that runs without a click, and only while something is loading.
          </Rule>
          <Rule>
            Motion never carries meaning on its own. A change that matters is also said in words (a toast, an inline
            message).
          </Rule>
          <Rule why="Some people get dizzy or sick from movement on screen.">
            Respect Reduce motion. Use tw-animate-css and transition utilities, which the stylesheet turns off for
            those people; don't animate from JavaScript where the stylesheet can't reach.
          </Rule>
        </Rules>
      </Section>
      <Section title="Do and don't">
        <DoDont
          good={<Replay />}
          bad={<Replay slow />}
          doCaption="A menu opens in 100ms, fading and growing slightly from its trigger. Press Replay to compare."
          dontCaption="A 600ms slide from the side: it feels slow every time, and the long travel is the kind of movement Reduce motion exists for."
        />
        <DoDont
          good={<Total />}
          bad={<Total counting />}
          doCaption="A total is shown as it is."
          dontCaption="A total that counts up shows wrong amounts while it runs, and makes the board wait for the real one."
        />
      </Section>
    </Page>
  );
}

const meta = {
  title: "Foundations/Motion",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

export const Use: StoryObj<typeof meta> = { name: "Motion", render: () => <MotionUse /> };
