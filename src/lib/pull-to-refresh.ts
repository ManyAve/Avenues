import { bindDrag, css, definePrimitive, dragThreshold, live } from "@ui-sdk/core";
import { rubberBand, solveSpring } from "@ui-sdk/core/gesture";

/**
 * The pull to refresh behavior (AVE-200): a list a finger pulls down from its top to reload, for apps installed on a
 * phone's home screen, where the browser's own pull to refresh is gone. ui-sdk core supplies the physics: `bindDrag`
 * follows the finger, `rubberBand` makes the pull resist the farther it goes, and `solveSpring` settles the list back.
 *
 * The UX Engineer's verdict on AVE-200, in the behavior:
 *
 * - Only a finger pulls (`pointerType === "touch"`): with a mouse or pen nothing moves. The pull starts only when
 *   everything between the finger and the page is scrolled to its top, and only when the finger moves down first, so
 *   it never fights a scroll: a finger that moves up scrolls as always.
 * - Under reduced motion the list never moves and nothing springs: the pull only fills a plain line (`--pull-progress`),
 *   and the refresh shows as a loading line. The component draws that; this keeps `pulled` at the pull's depth but
 *   skips the spring and the hold.
 *
 * The pull has no keys or roles of its own: the Refresh button (`PullToRefreshTrigger`, a ui-sdk Button) is the way for
 * a keyboard, a screen reader, a mouse and an agent.
 */

/** How far, in px, the list shows pulled before a release refreshes. */
export const PULL_THRESHOLD = 64;
/** Where the list rests, in px, while a refresh it started runs, so its spinner shows. */
export const PULL_HOLD = 48;
/** How long, in ms, the list stays held showing the outcome before it springs back. */
export const PULL_OUTCOME_MS = 600;

export type PullToRefreshOptions = {
  /**
   * A pull went past the threshold and was let go. Returns whether a refresh now runs; the list then holds, showing its
   * spinner, until `finish()`.
   */
  onPull?: ((details: { event: Event }) => boolean) | undefined;
  /** Whether a refresh runs now, however it started. */
  refreshing?: boolean | undefined;
  /** No pull while true. */
  disabled?: boolean | undefined;
};

type State = {
  /** How far the list shows pulled, in px. */
  pulled: number;
  /** Whether a finger is pulling now. */
  dragging: boolean;
  refreshing: boolean;
  disabled: boolean;
};

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Whether every element from `target` up, and the page, is scrolled to its top. */
function atTop(target: EventTarget | null): boolean {
  for (let el = target instanceof Element ? target : null; el && el !== document.documentElement; el = el.parentElement) {
    if (el.scrollTop > 0) return false;
  }
  return (document.scrollingElement?.scrollTop ?? 0) <= 0;
}

export const pullToRefresh = definePrimitive({
  name: "pull-to-refresh",
  options: { onPull: "callback", refreshing: "boolean", disabled: "boolean" },
  state: (options: PullToRefreshOptions): State => ({
    pulled: 0,
    dragging: false,
    refreshing: options.refreshing ?? false,
    disabled: options.disabled ?? false,
  }),
  sync: (options) => ({ refreshing: options.refreshing ?? false, disabled: options.disabled ?? false }),
  live: ["pulled", "dragging"],
  api: (context) => {
    const { store } = context;
    let frame = 0;
    let outcome: ReturnType<typeof setTimeout> | undefined;
    let stop: (() => void) | undefined;
    /** Set while a press that could become a pull is down: where it started. */
    let press: { y: number } | null = null;
    /** Whether this pull's release asked for the refresh, so the list holds while it runs. */
    let holding = false;

    const halt = () => {
      cancelAnimationFrame(frame);
      clearTimeout(outcome);
    };

    /** Springs `pulled` to `to`, or jumps there under reduced motion. */
    const settle = (to: number) => {
      halt();
      const from = store.get().pulled;
      if (reducedMotion() || from === to) {
        store.set({ pulled: to });
        return;
      }
      const spring = solveSpring(0.35, 1, from - to, 0);
      const start = performance.now();
      const step = (now: number) => {
        const t = now - start;
        const position = to + spring.position(t);
        if (Math.abs(position - to) < 0.5 && Math.abs(spring.velocity(t)) < 0.01) {
          store.set({ pulled: to });
          return;
        }
        store.set({ pulled: position });
        frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };

    context.onDestroy(() => {
      halt();
      stop?.();
    });

    return {
      /** The refresh a pull started has settled: the list shows its outcome for a moment, then goes back. */
      finish() {
        if (!holding) return;
        holding = false;
        clearTimeout(outcome);
        outcome = setTimeout(() => settle(0), PULL_OUTCOME_MS);
      },
      pointerdown(event: PointerEvent, el: HTMLElement) {
        const state = store.get();
        if (event.pointerType !== "touch" || !event.isPrimary || state.disabled || state.refreshing) return;
        if (!atTop(event.target)) return;
        stop?.();
        halt();
        const y = event.clientY;
        const x = event.clientX;
        press = { y };
        stop = bindDrag(el, event, {
          threshold: dragThreshold,
          // A pull only when the finger moves down first, and mostly down; anything else is a scroll.
          onStart: (move) => {
            const dy = move.clientY - y;
            const ok = dy > 0 && dy > Math.abs(move.clientX - x);
            if (!ok) press = null;
            else store.set({ dragging: true });
            return ok;
          },
          onMove: ({ y: now }) => {
            const depth = Math.max(0, now - y);
            store.set({ pulled: rubberBand(depth, Math.min(el.clientHeight || innerHeight, innerHeight)) });
          },
          onEnd: (end, canceled) => {
            press = null;
            stop = undefined;
            store.set({ dragging: false });
            const past = !canceled && store.get().pulled >= PULL_THRESHOLD;
            if (!past) {
              settle(0);
              return;
            }
            // The app's refresh may be done already (it returned no Promise): then the list just settles back.
            holding = (context.options().onPull?.({ event: end }) ?? false) && !reducedMotion();
            settle(holding ? PULL_HOLD : 0);
          },
        });
      },
      /**
       * Keeps the page from scrolling (and a browser tab's own pull to refresh from running) while a finger pulls the
       * list. ui-sdk's `bindDrag` follows pointer events; a touch the browser starts to scroll is a canceled pointer, so
       * the first move down from the top has to be kept from the browser here.
       */
      touchmove(event: TouchEvent) {
        if (!press || !event.cancelable) return;
        const touch = event.touches[0];
        if (store.get().dragging || (touch && touch.clientY > press.y)) event.preventDefault();
      },
    };
  },
  slots: (slot) => ({
    root: slot({}),
    content: slot({
      attrs: (state) => ({
        "data-refreshing": state.refreshing ? "" : undefined,
        "data-disabled": state.disabled ? "" : undefined,
      }),
      live: live((state) => ({
        style: css({
          "--pull-y": `${state.pulled}px`,
          "--pull-progress": String(Math.min(1, state.pulled / PULL_THRESHOLD)),
        }),
        "data-pulling": state.dragging ? "" : undefined,
        "data-pulled": state.pulled > 0 ? "" : undefined,
        "data-armed": state.pulled >= PULL_THRESHOLD ? "" : undefined,
      })),
      on: {
        pointerdown: (event, { el, api }) => {
          if (el) api.pointerdown(event as PointerEvent, el);
        },
      },
      // Not passive: a pull has to be able to keep the page from scrolling.
      bind: (el, { api }) => {
        const touchmove = (event: TouchEvent) => api.touchmove(event);
        el.addEventListener("touchmove", touchmove, { passive: false });
        return () => el.removeEventListener("touchmove", touchmove);
      },
    }),
  }),
  // The pull is a phone gesture with nothing for an agent to add: an agent refreshes with the Refresh button
  // (`PullToRefreshTrigger`, a ui-sdk Button it presses), so the pull stays out of its snapshot; Pull to refresh /
  // Agent is its agent test.
  agent: { actions: [], shown: () => false },
});
