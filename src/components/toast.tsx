import {
  createToaster,
  Toast as ToastPart,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastRegion as ToastRegionPrimitive,
  ToastTitle,
  type ToastActionDetails,
  type Toaster as ToasterStore,
  type ToastType as ToastTypeName,
} from "@ui-sdk/react/toast";
import { CheckIcon, CircleAlertIcon, SendIcon, XIcon } from "lucide-react";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { buttonVariants } from "#avenue/components/button";
import { devError } from "#avenue/lib/dev";
import { useFocusRecovery } from "#avenue/lib/focus-recovery";
import { cn } from "#avenue/lib/utils";

/**
 * ManyAve's Toast, ported from the app's app/ui/components/Toast.tsx (e01cc90) onto ui-sdk's toaster. Its rules
 * are unchanged and tested in the Toast stories:
 *
 * - one toast at a time, at the bottom centre; a new one replaces the current one, except an error (below);
 * - a success hides after 4.2s, and stays while focus is in it (a keyboard user's Undo); ui-sdk also holds it
 *   while the pointer is over it;
 * - a success with an action (Undo) stays at least 10s, so a screen reader, switch or voice user can reach it
 *   (WCAG 2.2.1, AVE-41). Every toast action must also exist somewhere that doesn't time out, such as the row's
 *   menu or an Undo in the register: the toast is a shortcut, never the only way;
 * - an error stays until dismissed and is announced at once; a success is announced politely. A later success
 *   never hides an error: it waits behind it and shows once the error is dismissed (only the latest one waits).
 *   A new error replaces the current error.
 *
 * ui-sdk announces each toast once through its own live regions, so the visible region is not live and nothing
 * is read twice. F6 moves focus to the toast and back. AVE-2: the 10px top and bottom padding becomes 8.
 *
 * On a phone (AVE-40): the toast keeps a 16px gutter each side and wraps a long message rather than cutting it; it
 * sits above the home indicator and above an open bottom Sheet's footer.
 *
 * A page with something pinned to the bottom edge, such as a status bar, lifts the toast above it with
 * `--avenue-toast-bottom` (the gap under the toast, minus 8px; 16px plus the safe area by default), so a toast never
 * covers it (AVE-118).
 *
 * Undo instead of asking first (AVE-198, `docs/undo-or-confirm.md`): `toast.undo({ title, onUndo, elsewhere })` is the
 * toast for something done at once that can be taken back. Several in a row with the same `id` stay one toast that
 * counts them ("3 notices archived"), and its Undo takes back all of them, newest first. `elsewhere` says where to undo
 * once the toast has gone, so the toast is never the only way back.
 */

/** The ui-sdk toast types Avenue draws. */
type ToastType = Extract<ToastTypeName, "success" | "error" | "info">;

type ToastOptions = {
  /** A button or link after the text: "Undo", or a link with `href`. */
  /**
   * `onAction` gets ui-sdk's event and `{ source }`: a Promise it returns keeps the action pending, and what it changes
   * after an await goes in `withSource(source, …)` (`@ui-sdk/react/observe`), so an agent's Undo stays the agent's.
   */
  action?:
    | { label: string; onAction?: (event: Event | undefined, details: ToastActionDetails) => unknown; href?: string }
    | undefined;
  /**
   * What the toast is about, as ui-sdk's toast `type` names it (AVE-151). `success`, the default: done, timed.
   * `error`: a failure. It stays until the user dismisses it and is announced at once.
   * `info`: something started that hasn't finished, such as an announcement sending: a send icon instead of the
   * success check, otherwise timed and announced like a success (AVE-118). ui-sdk's `warning`, `loading` and `default`
   * have no Avenue look yet, so they aren't taken.
   */
  type?: ToastType | undefined;
  /**
   * Move focus to the action as the toast shows. Only for when the control the person just used is gone, such as a
   * removed section's Undo, so focus lands on the way back instead of falling to the page (AVE-118). Otherwise
   * leave focus where it is; F6 reaches the toast. Give `returnFocus` with it.
   */
  focus?: boolean | undefined;
  /**
   * Where focus goes when the toast closes with focus in it and the control focus came from is gone (AVE-196): after
   * Undo, the control that came back; after Escape or a timeout, the nearest one that is left. It is read once the
   * toast has closed and the page has rendered. A toast that takes focus (`focus`) needs it, or focus falls to the page;
   * in development that says so. Without `focus`, focus goes back where it was before F6, as ui-sdk does.
   */
  returnFocus?: (() => HTMLElement | null | undefined) | undefined;
};

/** What `toast.undo()` takes (AVE-198). */
type UndoToastOptions = {
  /**
   * What was done. A function gets how many are in the run, for the counted toast:
   * `(count) => (count === 1 ? "Notice archived" : `${count} notices archived`)`.
   */
  title: string | ((count: number) => string);
  /**
   * Takes this one action back. It gets ui-sdk's event and `{ source }`, as a toast action's `onAction` does: a Promise
   * it returns keeps Undo pending (a rejection keeps the toast, and pressing Undo again retries only what is left),
   * and what it changes after an await goes in `withSource(details.source, …)`.
   */
  onUndo: (event: Event | undefined, details: ToastActionDetails) => unknown;
  /**
   * Where to undo once the toast has gone, shown under the title: "You can also restore it from Archived." The toast is
   * a shortcut, never the only way back (AVE-41). A function gets the count, as `title` does ("…restore them…").
   */
  elsewhere: string | ((count: number) => string);
  /**
   * Names a run. Another `toast.undo()` with the same id while this toast shows (or waits behind an error) joins it:
   * one toast, counted, its timer started again, and one Undo for all of them. Without an id each one replaces the last.
   */
  id?: string | undefined;
  /** The button's text, "Undo" by default. */
  label?: string | undefined;
  /** As `ToastOptions.focus`: move focus to Undo, only when the control the person used is gone. */
  focus?: boolean | undefined;
  /** As `ToastOptions.returnFocus`: where focus goes once the toast has closed, such as the control Undo brought back. */
  returnFocus?: (() => HTMLElement | null | undefined) | undefined;
};

type ShowToast = ((text: string, options?: ToastOptions) => void) & {
  /** Says something was done and offers Undo, counting a run of the same `id` (AVE-198). */
  undo: (options: UndoToastOptions) => void;
};

/** A run of undoable actions shown as one toast. */
type UndoRun = {
  id: string | undefined;
  undos: UndoToastOptions["onUndo"][];
  count: number;
  /** The ui-sdk toast's id once it shows; undefined while it waits behind an error. */
  toastId: string | undefined;
};

type Shown = {
  title: string;
  action?: ToastOptions["action"];
  description?: string | undefined;
  focus: boolean;
  returnFocus?: ToastOptions["returnFocus"];
  onDismiss?: (() => void) | undefined;
};

/** What a toast carries in ui-sdk's `data` for the region: whether it takes focus, and where focus goes after. */
type FocusData = { focusAction?: true; returnFocus?: () => HTMLElement | null | undefined };

const SUCCESS_MS = 4200;
/** A success with an action: long enough to reach the action by F6, a switch or voice (AVE-41). */
const ACTION_MS = 10_000;

function showWith(toaster: ToasterStore<ReactNode>): ShowToast {
  const showingError = () => toaster.toasts().some((item) => item.type === "error");
  // The latest success that arrived while an error showed; it shows once the error is gone.
  let waiting: (() => void) | undefined;
  let replacingError = false;
  // The undo run on screen or waiting behind an error. Any other toast ends it.
  let run: UndoRun | undefined;
  toaster.subscribe(() => {
    if (!waiting || replacingError || showingError()) return;
    const next = waiting;
    waiting = undefined;
    next();
  });

  const optionsOf = ({ action, description, focus, returnFocus, onDismiss }: Omit<Shown, "title">) => {
    const data: FocusData = { ...(action && focus ? { focusAction: true } : {}), ...(returnFocus ? { returnFocus } : {}) };
    return {
      ...(action ? { action } : {}),
      ...(data.focusAction || data.returnFocus ? { data } : {}),
      ...(description === undefined ? {} : { description }),
      ...(onDismiss ? { onDismiss } : {}),
    };
  };

  /** Shows a success or info toast now, or behind an error. `shown` is read when it shows, so a waiting run counts on. */
  const present = (type: "success" | "info", shown: () => Shown, onShow?: (id: string) => void) => {
    const showNow = () => {
      toaster.dismiss();
      const { title, ...rest } = shown();
      // An info toast (something under way) is announced politely and timed like a success (not `loading`, which
      // stays until it's updated).
      const show = type === "info" ? toaster.info : toaster.success;
      const id = show(title, { ...optionsOf(rest), duration: rest.action ? ACTION_MS : SUCCESS_MS });
      onShow?.(id);
    };
    if (showingError()) waiting = showNow;
    else showNow();
  };

  // Typed in full, not only through ShowToast: an app's TypeScript reads this source and didn't carry the
  // contextual type into the destructured default (MANA-1118, TS7031 in Management).
  const show = (text: string, { action, type = "success", focus = false, returnFocus }: ToastOptions = {}) => {
    if (type === "error") {
      // A success waiting behind the old error keeps waiting behind the new one.
      replacingError = true;
      toaster.dismiss();
      toaster.error(text, { ...optionsOf({ action, focus, returnFocus }), duration: Infinity });
      replacingError = false;
      return;
    }
    run = undefined;
    present(type, () => ({ title: text, action, focus, returnFocus }));
  };

  const undo = ({ title, onUndo, elsewhere, id, label = "Undo", focus = false, returnFocus }: UndoToastOptions) => {
    const titleOf = (count: number) => (typeof title === "function" ? title(count) : title);
    const elsewhereOf = (count: number) => (typeof elsewhere === "function" ? elsewhere(count) : elsewhere);
    if (id !== undefined && run?.id === id) {
      run.undos.push(onUndo);
      run.count += 1;
      // Waiting behind an error: it shows with the new count. Showing: the same toast says the new count, is announced
      // again and starts its timer over (ui-sdk restarts it on every update).
      if (run.toastId === undefined) return;
      if (toaster.update(run.toastId, { title: titleOf(run.count), description: elsewhereOf(run.count) })) return;
    }
    const mine: UndoRun = { id, undos: [onUndo], count: 1, toastId: undefined };
    run = mine;
    // Newest first, each once: a step that fails keeps the toast, and pressing Undo again retries only what is left.
    const takeBack = (event: Event | undefined, details: ToastActionDetails): unknown => {
      const next = mine.undos.at(-1);
      if (!next) return undefined;
      const result = next(event, details);
      const done = () => {
        mine.undos.pop();
        return takeBack(event, details);
      };
      return result instanceof Promise ? result.then(done) : done();
    };
    present(
      "success",
      () => ({
        title: titleOf(mine.count),
        description: elsewhereOf(mine.count),
        action: { label, onAction: takeBack },
        focus,
        returnFocus,
        onDismiss: () => {
          if (run === mine) run = undefined;
        },
      }),
      (toastId) => {
        mine.toastId = toastId;
      },
    );
  };

  return Object.assign(show, { undo });
}

function focusOnMount(element: HTMLElement | null) {
  element?.focus();
}

function focusDataOf(data: unknown): FocusData {
  return typeof data === "object" && data !== null ? (data as FocusData) : {};
}

/**
 * Focus that leaves with a toast, or falls to the page from it as it closes, goes to its `returnFocus` (AVE-196). ui-sdk
 * already returns focus to where it was before F6; this is for when that place is gone, as it is for a toast that took
 * focus because the control the person used was removed.
 */
function useToastFocusRecovery() {
  return useFocusRecovery<FocusData>(({ props }) => {
    const target = props.returnFocus?.();
    if (target) return target;
    if (props.focusAction)
      devError(
        "Avenue: a toast that took focus (`focus: true`) closed with focus in it and no `returnFocus` saying where it goes, so focus fell to the page.",
      );
    return undefined;
  });
}

/** The toast with no ToastProvider above it: it shows nothing, and in development says so (AVE-140). */
const lost = () =>
  devError(
    "Avenue: a toast was shown with no <ToastProvider> above it, so nobody saw it. Wrap the app in one <ToastProvider>.",
  );
const noProvider: ShowToast = Object.assign(lost, { undo: lost });

const ToastContext = createContext<ShowToast>(noProvider);

/**
 * `const toast = useToast(); toast("Household added")`, or for something that can be taken back,
 * `toast.undo({ id: "archive-notice", title, onUndo, elsewhere })` (AVE-198).
 *
 * Outside a ToastProvider the toast shows nothing. In development the first one logs a `console.error` naming
 * ToastProvider (once per page, and it throws in the story tests, which run ui-sdk strict); a production build stays
 * silent, so a missing provider never breaks a screen (AVE-140). Calling `useToast()` alone never warns: only a toast
 * that is lost does.
 */
function useToast() {
  return use(ToastContext);
}

/** The region where toasts show, for a `toaster` you created yourself. Place it once. */
function ToastRegion({ toaster }: { toaster: ToasterStore<ReactNode> }) {
  const recover = useToastFocusRecovery();
  return (
    // ui-sdk centres a region with translate: -50% outside any layer, so only an important utility undoes it.
    // 24px above the bottom edge plus the home-indicator safe area, or 8px above --avenue-toast-bottom where a page sets
    // it (a status bar, AVE-118); while a bottom Sheet is open, 8px above its
    // footer instead (CSS anchor positioning on the footer's anchor-name), so it never covers the sheet's actions
    // (AVE-40). The region is in the top layer after the sheet, so it can anchor to it. The footer is also the region's
    // position-anchor: the sheet sits in a scrolled viewport, and Chromium 159 (Playwright 1.66) only follows an
    // anchor's scroll for the default anchor, so without it the toast falls below the screen (AVE-169).
    // The name is the landmark's while a toast shows. Empty, the region is no landmark and, with Avenue's ui-sdk patch,
    // not in the agent snapshot either (AVE-43, Toast/EmptyRegion).
    <ToastRegionPrimitive
      toaster={toaster}
      aria-label="Notifications"
      side="bottom"
      align="center"
      maxVisible={1}
      className="pointer-events-none fixed inset-x-0 [position-anchor:--avenue-sheet-footer] bottom-[calc(anchor(--avenue-sheet-footer_top,var(--avenue-toast-bottom,calc(--spacing(4)+env(safe-area-inset-bottom))))+--spacing(2))] z-toast m-0 flex w-auto max-w-none translate-none! justify-center bg-transparent px-4"
    >
      {(item) => (
        <ToastPart
          ref={recover(item.id, focusDataOf(item.data))}
          data-slot="toast"
          className={cn(
            "pointer-events-auto mx-auto flex w-fit max-w-full items-center gap-2 rounded-lg border border-border-floating bg-popover px-4 py-2 text-meta text-popover-foreground shadow-popover transition-[opacity,translate] duration-slow data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0 motion-reduce:transition-none",
            // A swipe moves the toast with the finger, mouse or pen (AVE-192). ui-sdk sets data-swiping and
            // --toast-swipe-x/y while it's dragged; letting go short of dismissing removes both, and the toast eases back.
            // The region sits at the bottom centre, so ui-sdk dismisses only a swipe down (an up or sideways drag only
            // stretches a little); a dismissing swipe sets data-swipe-direction and the toast carries on down as it fades.
            // select-none: a mouse drag that starts on the text swipes instead of selecting it, as ui-sdk's docs advise.
            // Under reduced motion it still follows the drag, which is the person's own movement, and leaves at once.
            "select-none data-swiping:translate-x-(--toast-swipe-x) data-swiping:translate-y-(--toast-swipe-y) data-swiping:transition-none",
            "data-[swipe-direction=down]:translate-x-(--toast-swipe-x) data-[swipe-direction=down]:translate-y-[calc(var(--toast-swipe-y)+100%)]",
            "data-[type=error]:border-destructive/50 data-[type=error]:pr-2",
          )}
        >
          {item.type === "error" ? (
            <CircleAlertIcon className="size-4 shrink-0 text-destructive-subtle-foreground" aria-hidden />
          ) : item.type === "info" ? (
            <SendIcon className="size-4 shrink-0 text-info-subtle-foreground" aria-hidden />
          ) : (
            <CheckIcon className="size-4 shrink-0 text-success-subtle-foreground" aria-hidden />
          )}
          {item.description ? (
            // Only an undo toast has a description: where to undo once it's gone (AVE-198). Without one the toast
            // renders as before, title alone.
            <div className="grid min-w-0 gap-0.5">
              <ToastTitle />
              <ToastDescription className="text-muted-foreground" />
            </div>
          ) : (
            <ToastTitle />
          )}
          {item.action && (
            <ToastAction
              // `focus: true` only: the control the person used is gone, so focus would fall to the page (AVE-118).
              ref={focusDataOf(item.data).focusAction ? focusOnMount : undefined}
              className="relative cursor-pointer rounded-xs font-medium text-foreground underline underline-offset-3 outline-none hit-area [--hit-area-x:--spacing(2)] [--hit-area-y:--spacing(2)] focus-visible:ring-3 focus-visible:ring-ring/50" />
          )}
          {item.type === "error" && (
            <ToastClose
              aria-label="Dismiss"
              // On a phone, 16px from an action, so their 44px tap areas don't overlap (AVE-40).
              className={cn(buttonVariants({ variant: "ghost", size: "icon-xs" }), item.action && "pointer-coarse:ms-2")}
            >
              <XIcon aria-hidden />
            </ToastClose>
          )}
        </ToastPart>
      )}
    </ToastRegionPrimitive>
  );
}

/** Gives its children `useToast()` and shows their toasts. Wrap the app in one. */
function ToastProvider({ children }: { children: ReactNode }) {
  const [toaster] = useState(() => createToaster<ReactNode>());
  const [show] = useState(() => showWith(toaster));
  useEffect(() => () => toaster.dismiss(), [toaster]);
  return (
    <ToastContext value={show}>
      {children}
      <ToastRegion toaster={toaster} />
    </ToastContext>
  );
}

export {
  ToastProvider,
  ToastRegion,
  useToast,
  showWith,
  ACTION_MS,
  SUCCESS_MS,
  type ShowToast,
  type ToastOptions,
  type ToastType,
  type UndoToastOptions,
};
