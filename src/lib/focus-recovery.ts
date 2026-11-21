import { createFocusRecovery, type FocusRecovery } from "@ui-sdk/core";
import { useLayoutEffect, useRef, useState, type RefCallback, type RefObject } from "react";

type Entry<Props> = { props: Props; ref: RefCallback<HTMLElement>; bound: number };
type Fallback<Props> = (lost: { key: string; props: Props }) => HTMLElement | null | undefined;

/** One recovery for the hook's items: it looks the lost item up by key and asks the latest fallback. */
function recoveryFor<Props>(entries: Map<string, Entry<Props>>, latest: RefObject<Fallback<Props>>) {
  return createFocusRecovery({
    fallback: ({ key }) => {
      const entry = entries.get(key);
      return entry ? latest.current({ key, props: entry.props }) : undefined;
    },
  });
}

/**
 * ui-sdk's `createFocusRecovery` for a list of React elements that aren't parts of a ui-sdk primitive (AVE-196):
 * when an element leaves the page with focus inside it, or focus falls to the page from it, `fallback` names where
 * focus goes instead, once React is done removing. ui-sdk binds parts from a slot's `bind`; here each item gets a ref
 * from `recover(key, props)`, called as it renders.
 *
 * `fallback` gets the item's key and the props of its last render, so it can find the neighbour by the item's old
 * place. It reads the page as it is after the removal. Returning nothing lets focus go.
 */
export function useFocusRecovery<Props>(fallback: Fallback<Props>): (key: string, props: Props) => RefCallback<HTMLElement> {
  // The latest fallback, read when focus is lost, after the render that removed the item.
  const latest = useRef(fallback);
  useLayoutEffect(() => {
    latest.current = fallback;
  });
  const [entries] = useState(() => new Map<string, Entry<Props>>());
  // Made at the first bind, in React's commit, where reading `latest` is allowed.
  const recovery = useRef<FocusRecovery>(null);
  return (key, props) => {
    const known = entries.get(key);
    if (known) {
      // The props of the latest render, read when the item is gone.
      known.props = props;
      return known.ref;
    }
    const entry: Entry<Props> = {
      props,
      bound: 0,
      // One ref per key, so React doesn't unbind and bind it again on every render.
      ref: (el) => {
        if (!el) return;
        entry.bound++;
        recovery.current ??= recoveryFor(entries, latest);
        const unbind = recovery.current.bind(el, { key, props: undefined });
        return () => {
          unbind();
          entry.bound--;
          // Forget the item after the recovery has read it (a microtask later), unless it came back.
          setTimeout(() => {
            if (entry.bound === 0 && entries.get(key) === entry) entries.delete(key);
          });
        };
      },
    };
    entries.set(key, entry);
    return entry.ref;
  };
}
