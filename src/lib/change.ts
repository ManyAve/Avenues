import { dispatch, type ChangeDetails } from "@ui-sdk/core";

export type { ChangeDetails };

/**
 * The `details` a ui-sdk callback takes: the second parameter of a part's `on<Key>Change`, like
 * `DetailsOf<ComponentProps<typeof Select>["onValueChange"]>`. Avenue's callbacks take these, so an app reads the
 * same reason, event, source (an agent's change says `"agent"`) and `cancel()` it would from ui-sdk (AVE-145).
 */
export type DetailsOf<F> = NonNullable<F> extends (value: never, details: infer D) => unknown ? D : never;

/**
 * Reports a change Avenue makes itself (a native select, a button of its own) the way ui-sdk reports its own. It
 * calls `callback(value, details)` with details built by ui-sdk's `dispatch`: the reason, the DOM event, how the
 * person caused it, and `cancel()`. Returns whether the change went through, false when the callback canceled it, so
 * an uncontrolled component skips writing its own state, as ui-sdk's do.
 */
export function report<V, R extends string>(
  callback: ((value: V, details: ChangeDetails<R>) => void) | undefined,
  value: V,
  given: { reason: R; event?: Event | undefined },
): boolean {
  if (!callback) return true;
  const { reason, event } = given;
  return !dispatch({ options: () => ({ onChange: callback }) }, "onChange", value, event ? { reason, event } : { reason });
}
