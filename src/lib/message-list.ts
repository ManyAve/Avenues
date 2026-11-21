import { createStickToBottom, definePrimitive } from "@ui-sdk/core";

/**
 * The message list's behavior (AVE-132): a chat thread that follows new messages while the reader is at the end and
 * keeps their place once they scroll up. ui-sdk's `createStickToBottom` does the following and the anchoring.
 *
 * - Follows while within 48px of the end, or when the newest message is the reader's own, wherever they were.
 * - Scrolled up, it counts the messages from others that arrive below; the jump part shows while there are any.
 * - Earlier messages, asked for through `loadEarlier`, land above without moving the view.
 */

export type MessageListOptions = {
  /** How many messages the list holds now. */
  count: number;
  /** The newest message's key. A new key with a higher count is an arrival; a higher count alone is earlier history. */
  newest?: string | undefined;
  /** Whether the newest message is the reader's own, which scrolls to it. */
  newestMine?: boolean | undefined;
  /** Whether there are earlier messages to load. */
  hasEarlier?: boolean | undefined;
  /** Whether earlier messages are loading now. */
  loadingEarlier?: boolean | undefined;
  onLoadEarlier?: (() => void) | undefined;
};

/** `earlier`: whether there are earlier messages to load, kept in state so the agent key's `shown` can read it. */
type State = { atBottom: boolean; unseen: number; earlier: boolean };

/** How close to the end still counts as at the end: half a bubble, so a part-hidden last line still follows. */
export const FOLLOW_THRESHOLD = 48;

export const messageList = definePrimitive({
  name: "message-list",
  options: {
    count: "number",
    newest: "string",
    newestMine: "boolean",
    hasEarlier: "boolean",
    loadingEarlier: "boolean",
    onLoadEarlier: "callback",
  },
  state: (options: MessageListOptions): State => ({ atBottom: true, unseen: 0, earlier: Boolean(options.hasEarlier) }),
  api: (context) => {
    const stick = createStickToBottom({ threshold: FOLLOW_THRESHOLD });
    let log: HTMLElement | null = null;
    let { count, newest } = context.options();
    stick.subscribe(() => {
      const { atBottom } = stick.get();
      const state = context.store.get();
      const unseen = atBottom ? 0 : state.unseen;
      if (state.atBottom !== atBottom || state.unseen !== unseen) context.store.set({ atBottom, unseen });
    });
    // Runs before the stick measures the new rows, so `atBottom` is still where the reader was.
    context.onOptions((options) => {
      const earlier = Boolean(options.hasEarlier);
      if (context.store.get().earlier !== earlier) context.store.set({ earlier });
      const grew = options.count - count;
      if (options.newest !== newest && grew > 0) {
        if (options.newestMine) {
          stick.scrollToBottom({ behavior: "instant" });
          context.store.set({ atBottom: true, unseen: 0 });
        } else if (log && !stick.get().atBottom) {
          context.store.set({ atBottom: false, unseen: context.store.get().unseen + grew });
        }
      }
      count = options.count;
      newest = options.newest;
    });
    return {
      connect(el: HTMLElement) {
        log = el;
        const disconnect = stick.connect(el);
        // A log mounts once its first page has loaded: it opens at the newest message.
        stick.scrollToBottom({ behavior: "instant" });
        return () => {
          disconnect();
          if (log === el) log = null;
        };
      },
      /** Scrolls to the newest message and follows again; focus stays in the log, since the jump button leaves. */
      jumpToLatest() {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        stick.scrollToBottom({ behavior: reduce ? "instant" : "smooth" });
        context.store.set({ atBottom: context.store.get().atBottom, unseen: 0 });
        log?.focus({ preventScroll: true });
      },
      /** Asks the app for earlier messages, when there are some and none are loading. */
      loadEarlier() {
        const { hasEarlier, loadingEarlier, onLoadEarlier } = context.options();
        if (!hasEarlier || loadingEarlier || !onLoadEarlier) return;
        stick.prepend();
        onLoadEarlier();
      },
    };
  },
  slots: (slot) => ({
    root: slot({}),
    log: slot({
      role: "log",
      // additions only: a relative time that ticks over, or a bubble that turns from sending to sent, isn't news.
      attrs: () => ({ "aria-relevant": "additions", tabindex: "0" }),
      state: (state) => ({ atBottom: state.atBottom }),
      bind: (el, part) => part.api.connect(el),
    }),
    jump: slot({
      present: (state) => state.unseen > 0,
      state: (state) => ({ unseen: state.unseen }),
    }),
  }),
  // The log is in an agent's snapshot only while one of its actions does something: scrolled up from the newest
  // message (jumpToLatest), or with earlier messages to load (loadEarlier). At the end of a whole thread neither does,
  // so it stays out of the agent's way (AVE-214, ui-sdk's "Show It When It Matters").
  agent: { actions: ["jumpToLatest", "loadEarlier"], shown: (state: State) => !state.atBottom || state.earlier },
});
