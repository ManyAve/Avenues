import { announce, type ChangeSource } from "@ui-sdk/core";
import { withSource } from "@ui-sdk/react/observe";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Work in progress as a returned Promise (AVE-150), the way ui-sdk's Button and a dialog Close part's `action` take it:
 * a handler that returns a Promise keeps its component pending until it settles, and a rejection is its error. Avenue's
 * form dialog and pending confirm submit through a form or hold focus on their own status line, so they can't hand the
 * Promise to ui-sdk's Button (button.md, "Forms": "keep your own pending flag"); they run it through `useAction`.
 */

/** A Promise or anything with a `then`, as ui-sdk treats a handler's return. */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof value === "object" && value !== null && typeof (value as { then?: unknown }).then === "function";
}

/** ui-sdk's wait before a pending action is announced (button.md, "Pending"). */
export const PENDING_ANNOUNCEMENT_MS = 1_000;

/**
 * Says `message` to screen readers once `active` has lasted a second, through ui-sdk's shared live region, as
 * `pendingAnnouncement` does on ui-sdk's Button and dialogs. An empty message says nothing.
 */
export function usePendingAnnouncement(active: boolean, message: string | undefined) {
  useEffect(() => {
    if (!active || !message) return;
    const timer = setTimeout(() => announce(message), PENDING_ANNOUNCEMENT_MS);
    return () => clearTimeout(timer);
  }, [active, message]);
}

export type ActionStatus = "idle" | "running" | "failed";

type ActionState = { status: ActionStatus; error?: unknown };

/**
 * Runs a handler and tracks the Promise it returns: `running` until it settles, then back to `idle` (calling
 * `onResolve`) or `failed` with the rejection in `error`. A handler that returns anything else leaves it `idle`, so an
 * app that drives `pending` itself sees no change. Only the latest run counts.
 *
 * `source`: how the press or submit that started the run was made (a Button's `details.source`, or `sourceOf` the
 * submit event). `onResolve` runs after the await, once the press is over, so it runs inside `withSource(source, …)`:
 * the changes it makes (a dialog closing) stay the agent's, or the person's, for `observe` and `createHistory`'s
 * `undoSource` (AVE-214). Without it they would read "programmatic".
 *
 * `open`: a failure is forgotten when it turns false, so a dialog opens clean again, as ui-sdk clears a Close part's
 * error when its dialog opens.
 */
export function useAction(open: boolean) {
  const [state, setState] = useState<ActionState>({ status: "idle" });
  const current = useRef<object | undefined>(undefined);
  // React's "adjust state when a prop changes" pattern: during render, not in an effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open && state.status === "failed") setState({ status: "idle" });
  }
  const run = useCallback(
    (handler: () => unknown, { onResolve, source }: { onResolve?: () => void; source?: ChangeSource | undefined } = {}) => {
    const result = handler();
    if (!isThenable(result)) return;
    const token = {};
    current.current = token;
    setState({ status: "running" });
    result.then(
      () => {
        if (current.current !== token) return;
        setState({ status: "idle" });
        if (onResolve) withSource(source, onResolve);
      },
      (error: unknown) => {
        if (current.current === token) setState({ status: "failed", error });
      },
    );
    },
    [],
  );
  return { status: state.status, error: state.error, run };
}

/**
 * The sentence to show for a rejection: its message when it rejected with a string or an Error that has one (ui-sdk's
 * own demo shows `error.message`), otherwise `fallback`. Reject with the sentence a person should read.
 */
export function rejectionText(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim() !== "") return error;
  if (error instanceof Error && error.message.trim() !== "") return error.message;
  return fallback;
}
