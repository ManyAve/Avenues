import type { Meta, StoryObj } from "@storybook/react-vite";
import { createAgent } from "@ui-sdk/react/agent";
import { useState } from "react";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import {
  PullToRefresh,
  PullToRefreshContent,
  PullToRefreshStatus,
  PullToRefreshTrigger,
} from "#avenue/components/pull-to-refresh";
import { PULL_HOLD } from "#avenue/lib/pull-to-refresh";

// AVE-200. A list a finger pulls down from its top to reload, with a Refresh button beside it and a polite status line.
// Fictional notices from Sunnydale HOA.

const NOTICES = [
  { id: "pool", title: "Pool closes early on Friday", meta: "Pool committee · 9:40 AM" },
  { id: "meeting", title: "Board meeting moves to Tuesday", meta: "Board · Yesterday" },
  { id: "trash", title: "Trash pickup is a day late", meta: "Sunnydale HOA · Mon" },
  { id: "stickers", title: "New parking stickers are ready", meta: "Front office · Nov 14" },
];
const NEW_NOTICE = { id: "cat", title: "Lost cat near Elm Street", meta: "A neighbor · Just now" };

/** The refresh the story is waiting on: the play function settles it, so nothing depends on a timer. */
let settle: { resolve: () => void; reject: (error: unknown) => void } | null = null;
let refreshes = 0;
const reset = () => {
  settle = null;
  refreshes = 0;
};
const waitForRefresh = () => waitFor(() => expect(settle).not.toBeNull());

function Notices({ height }: { height?: string }) {
  const [notices, setNotices] = useState(NOTICES);
  const refresh = () => {
    refreshes += 1;
    return new Promise<void>((resolve, reject) => {
      settle = { resolve, reject };
    }).then(() => {
      settle = null;
      setNotices((all) => (all[0]?.id === NEW_NOTICE.id ? all : [NEW_NOTICE, ...all]));
    });
  };
  return (
    <PullToRefresh onRefresh={refresh} className="mx-auto w-full max-w-md gap-2">
      <header className="flex items-center justify-between gap-controls">
        <div>
          <h2 className="text-heading font-heading">Notices</h2>
          <PullToRefreshStatus />
        </div>
        <PullToRefreshTrigger size="sm" />
      </header>
      <div
        className={height ? `${height} overflow-y-auto` : undefined}
        data-testid="scroller"
        {...(height ? { tabIndex: 0, role: "region", "aria-label": "Notices list" } : {})}
      >
        <PullToRefreshContent>
          <ul aria-label="Notices" className="divide-y rounded-xl border bg-background">
            {notices.map((notice) => (
              <li key={notice.id} className="px-4 py-3">
                <p className="text-sm">{notice.title}</p>
                <p className="text-meta text-muted-foreground">{notice.meta}</p>
              </li>
            ))}
          </ul>
        </PullToRefreshContent>
      </div>
    </PullToRefresh>
  );
}

const meta = {
  title: "Components/Pull to refresh",
  component: PullToRefresh,
  args: { onRefresh: () => {} },
  render: () => <Notices />,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="min-h-96 pt-14">{Story()}</div>],
  beforeEach: reset,
} satisfies Meta<typeof PullToRefresh>;
export default meta;
type Story = StoryObj<typeof meta>;

const content = () => document.querySelector<HTMLElement>("[data-slot=pull-to-refresh-content]")!;
const status = () => screen.getByRole("status");
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const pulled = () => Number.parseFloat(content().style.getPropertyValue("--pull-y") || "0");

/** Drags down the list by `dy` pixels, in steps, with a finger (or `pointerType`), then lets go. */
async function pull(dy: number, pointerType: "touch" | "mouse" = "touch", { release = true } = {}) {
  const el = content();
  const box = el.getBoundingClientRect();
  const x = box.left + box.width / 2;
  let y = box.top + 20;
  const fire = (type: string, buttons: number) =>
    el.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 1,
        pointerType,
        isPrimary: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons,
      }),
    );
  fire("pointerdown", 1);
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    y += dy / steps;
    fire("pointermove", 1);
    await frame();
  }
  if (release) fire("pointerup", 0);
  await frame();
}

/** At rest: the list, the Refresh button, an empty status line, and no indicator showing. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("list", { name: "Notices" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Refresh" })).toBeVisible();
    await expect(status()).toHaveTextContent("");
    await expect(pulled()).toBe(0);
    await expect(content()).not.toHaveAttribute("data-pulled");
  },
};

/** A long pull from the top refreshes: the list holds with its spinner, the status says so, then "Updated". */
export const Pulled: Story = {
  play: async ({ canvas }) => {
    await pull(260, "touch", { release: false });
    await expect(content()).toHaveAttribute("data-armed");
    await expect(content()).toHaveAttribute("data-pulling");
    // It resists: the list shows less than the finger moved.
    await expect(pulled()).toBeLessThan(260);
    content().dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 1, pointerType: "touch", isPrimary: true }),
    );
    await waitForRefresh();
    await expect(refreshes).toBe(1);
    await waitFor(() => expect(status()).toHaveTextContent("Refreshing…"));
    await expect(content()).toHaveAttribute("data-refreshing");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    await waitFor(() => expect(Math.round(pulled())).toBe(reduce ? 0 : PULL_HOLD));
    settle!.resolve();
    await waitFor(() => expect(status()).toHaveTextContent("Updated"));
    await expect(canvas.getByText(NEW_NOTICE.title)).toBeInTheDocument();
    // The list goes back once it has shown the tick.
    await waitFor(() => expect(pulled()).toBe(0), { timeout: 3000 });
    await expect(content()).not.toHaveAttribute("data-refreshing");
  },
};

/** A short pull, let go before the point of release, springs back and refreshes nothing. */
export const ShortPull: Story = {
  play: async () => {
    await pull(50);
    await waitFor(() => expect(pulled()).toBe(0));
    await expect(refreshes).toBe(0);
    await expect(status()).toHaveTextContent("");
  },
};

/** Scrolled down the list, a pull down is a scroll: nothing moves and nothing refreshes. */
export const NotAtTheTop: Story = {
  render: () => <Notices height="max-h-40" />,
  play: async ({ canvas }) => {
    const scroller = canvas.getByTestId("scroller");
    scroller.scrollTop = 40;
    await waitFor(() => expect(scroller.scrollTop).toBeGreaterThan(0));
    await pull(260);
    await expect(pulled()).toBe(0);
    await expect(refreshes).toBe(0);
  },
};

/** With a mouse nothing pulls: the Refresh button is the way. */
export const MouseDoesNotPull: Story = {
  play: async () => {
    await pull(260, "mouse");
    await expect(pulled()).toBe(0);
    await expect(refreshes).toBe(0);
  },
};

/** The keyboard's way: Tab to Refresh and press it. It waits for the refresh, and the status line says how it ended. */
export const RefreshByKeyboard: Story = {
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Refresh" });
    button.focus();
    await userEvent.keyboard("{Enter}");
    await waitForRefresh();
    await waitFor(() => expect(button).toHaveAttribute("data-pending"));
    await expect(status()).toHaveTextContent("Refreshing…");
    // Pressed again while it runs, it doesn't start another.
    await userEvent.keyboard("{Enter}");
    await expect(refreshes).toBe(1);
    // The list doesn't move for a refresh the button started.
    await expect(pulled()).toBe(0);
    settle!.resolve();
    await waitFor(() => expect(status()).toHaveTextContent("Updated"));
    await waitFor(() => expect(button).not.toHaveAttribute("data-pending"));
    await expect(document.activeElement).toBe(button);
  },
};

/** A refresh that fails says so and stays said; the spinner turns into a warning, and the next try clears it. */
export const RefreshFails: Story = {
  play: async ({ canvas }) => {
    await pull(260);
    await waitForRefresh();
    settle!.reject(new Error(""));
    await waitFor(() => expect(status()).toHaveTextContent("Couldn't refresh. Try again."));
    await expect(status()).toHaveAttribute("data-status", "failed");
    await expect(canvas.queryByText(NEW_NOTICE.title)).toBeNull();
    await waitFor(() => expect(pulled()).toBe(0), { timeout: 3000 });
    const button = canvas.getByRole("button", { name: "Refresh" });
    button.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(status()).toHaveTextContent("Refreshing…"));
    settle!.resolve();
    await waitFor(() => expect(status()).toHaveTextContent("Updated"));
  },
};

/** Under reduced motion the list never moves: the pull fills a line along its top, and the refresh is a loading line. */
export const ReducedMotion: Story = {
  play: async () => {
    // The story tests don't emulate the media query, so the play function answers it for the behavior; visual:diff
    // captures every story with reduced motion, which draws the line.
    const real = window.matchMedia;
    window.matchMedia = (query: string) =>
      query.includes("prefers-reduced-motion") ? ({ ...real.call(window, query), matches: true } as MediaQueryList) : real.call(window, query);
    try {
      await pull(260);
      await waitForRefresh();
      await waitFor(() => expect(pulled()).toBe(0));
      await expect(content()).toHaveAttribute("data-refreshing");
      settle!.resolve();
      await waitFor(() => expect(status()).toHaveTextContent("Updated"));
      await expect(pulled()).toBe(0);
    } finally {
      window.matchMedia = real;
    }
  },
};

const agent = createAgent();

/** An agent refreshes with the Refresh button and reads the status line. */
export const Agent: Story = {
  tags: ["agent"],
  play: async ({ canvas }) => {
    const labels = agent
      .snapshot()
      .filter((entry) => !entry.offPage && entry.component !== "more")
      .map((entry) => entry.label);
    await expect(labels).toContain("Refresh");
    const run = agent.act({ steps: [{ ref: "Refresh", action: "press" }] });
    await waitForRefresh();
    settle!.resolve();
    const result = await run;
    await expect(result.ok, result.error?.message).toBe(true);
    await waitFor(() => expect(status()).toHaveTextContent("Updated"));
    await expect(canvas.getByText(NEW_NOTICE.title)).toBeInTheDocument();
  },
};
