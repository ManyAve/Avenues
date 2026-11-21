import { createSwipeActions, definePrimitive, live, type SwipeDraft, type SwipeOpen, type SwipeSide } from "@ui-sdk/core";

/**
 * The swipe list's behavior (AVE-199): rows that slide aside on a phone to show actions behind them, one row open at a
 * time. ui-sdk's `createSwipeActions` does the swipe: it waits for movement across the row so a vertical scroll still
 * scrolls, keeps the actions open past half their width, runs a full swipe through `onFullSwipe`, makes the hidden
 * actions inert, and closes the open row on a press elsewhere.
 *
 * Only a finger swipes (the UX Engineer's verdict on AVE-199): a mouse or pen press on a row is an ordinary press, and
 * the row's menu carries the same actions for a mouse, a keyboard, a screen reader and an agent. The rows take no keys
 * of their own, so the menu button is the keyboard's way in and nothing here changes a role or a key.
 */

export type { SwipeSide };

export type SwipeListOptions = {
  /** Runs a side's first action when a swipe goes past most of the row, and returns whether it did. */
  onFullSwipe?: ((row: string, side: SwipeSide, details: { event: Event }) => boolean) | undefined;
};

type State = { open: SwipeOpen | null; swiping: SwipeDraft | null };

export const swipeList = definePrimitive({
  name: "swipe-list",
  options: { onFullSwipe: "callback" },
  state: (_options: SwipeListOptions): State => ({ open: null, swiping: null }),
  live: ["swiping"],
  api: (context) => {
    const swipe = createSwipeActions(context, {
      key: "open",
      draft: "swiping",
      onFullSwipe: (row, side, details) => context.options().onFullSwipe?.(row, side, details) ?? false,
    });
    return {
      swipe,
      /** Closes the open row, as a press elsewhere does. */
      close: () => swipe.close(),
    };
  },
  slots: (slot) => ({
    root: slot({}),
    row: slot<{ value: string }>({
      props: { value: "string" },
      on: {
        pointerdown: (event, { el, api, key }) => {
          if (event.pointerType === "touch" && el) api.swipe.pointerdown(event, key, el);
        },
      },
      bind: (el, { api, key }) => api.swipe.bindRow(el, key),
    }),
    content: slot<{ value: string }>({
      props: { value: "string" },
      live: live((state, { api, key }) => api.swipe.contentAttrs(state, key)),
    }),
    actions: slot<{ id: string; row: string; side: SwipeSide }>({
      props: { id: "id", row: "string", side: "string" },
      attrs: (state, { api, props }) => api.swipe.actionsAttrs(state, props.row, props.side),
      bind: (el, { api, props }) => api.swipe.bindActions(el, props.row, props.side),
    }),
  }),
  // The list matters to an agent only while a row is open, when it can close it. Every action is in each row's menu,
  // which is how an agent runs one; opening a row by swipe is a phone gesture with nothing for an agent to add.
  agent: { actions: ["close"], shown: (state: State) => state.open !== null },
});
