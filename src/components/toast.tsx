import {
  createToaster,
  Toast as ToastPart,
  ToastAction,
  ToastClose,
  ToastRegion,
  ToastTitle,
  type Toaster,
} from "@ui-sdk/react/toast";
import { CheckIcon, CircleAlertIcon, XIcon } from "lucide-react";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { buttonVariants } from "#avenue/components/button";
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
 */

type ToastOptions = {
  /** A button or link after the text: "Undo", or a link with `href`. */
  action?: { label: string; onAction?: () => unknown; href?: string } | undefined;
  /** `error`: a failure. It stays until the user dismisses it and is announced at once. */
  variant?: "success" | "error" | undefined;
};

type ShowToast = (text: string, options?: ToastOptions) => void;

const SUCCESS_MS = 4200;
/** A success with an action: long enough to reach the action by F6, a switch or voice (AVE-41). */
const ACTION_MS = 10_000;

function showWith(toaster: Toaster<ReactNode>): ShowToast {
  const showingError = () => toaster.toasts().some((item) => item.type === "error");
  // The latest success that arrived while an error showed; it shows once the error is gone.
  let waiting: (() => void) | undefined;
  let replacingError = false;
  toaster.subscribe(() => {
    if (!waiting || replacingError || showingError()) return;
    const next = waiting;
    waiting = undefined;
    next();
  });
  return (text, { action, variant = "success" } = {}) => {
    const options = action ? { action } : {};
    if (variant === "error") {
      // A success waiting behind the old error keeps waiting behind the new one.
      replacingError = true;
      toaster.dismiss();
      toaster.error(text, { ...options, duration: Infinity });
      replacingError = false;
      return;
    }
    const show = () => {
      toaster.dismiss();
      toaster.success(text, { ...options, duration: action ? ACTION_MS : SUCCESS_MS });
    };
    if (showingError()) waiting = show;
    else show();
  };
}

const ToastContext = createContext<ShowToast>(() => {});

/** `const toast = useToast(); toast("Household added")`. Outside a ToastProvider it does nothing. */
function useToast() {
  return use(ToastContext);
}

/** The region where toasts show, for a `toaster` you created yourself. Place it once. */
function Toaster({ toaster }: { toaster: Toaster<ReactNode> }) {
  return (
    // ui-sdk centres a region with translate: -50% outside any layer, so only an important utility undoes it.
    // 24px above the bottom edge plus the home-indicator safe area; while a bottom Sheet is open, 8px above its
    // footer instead (CSS anchor positioning on the footer's anchor-name), so it never covers the sheet's actions
    // (AVE-40). The region is in the top layer after the sheet, so it can anchor to it.
    // The name is the landmark's while a toast shows. Empty, the region is no landmark and, with Avenue's ui-sdk patch,
    // not in the agent snapshot either (AVE-43, Toast/EmptyRegion).
    <ToastRegion
      toaster={toaster}
      aria-label="Notifications"
      side="bottom"
      align="center"
      maxVisible={1}
      className="pointer-events-none fixed inset-x-0 bottom-[calc(anchor(--avenue-sheet-footer_top,calc(--spacing(4)+env(safe-area-inset-bottom)))+--spacing(2))] z-[70] m-0 flex w-auto max-w-none translate-none! justify-center bg-transparent px-4"
    >
      {(item) => (
        <ToastPart
          data-slot="toast"
          className={cn(
            "pointer-events-auto mx-auto flex w-fit max-w-full items-center gap-2 rounded-lg border bg-popover px-4 py-2 text-meta text-popover-foreground shadow-popover transition-[opacity,translate] duration-200 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0 motion-reduce:transition-none",
            "data-[type=error]:border-destructive/50 data-[type=error]:pr-2",
          )}
        >
          {item.type === "error" ? (
            <CircleAlertIcon className="size-4 shrink-0 text-destructive-subtle-foreground" aria-hidden />
          ) : (
            <CheckIcon className="size-4 shrink-0 text-success-subtle-foreground" aria-hidden />
          )}
          <ToastTitle />
          {item.action && (
            <ToastAction className="relative cursor-pointer rounded-xs font-medium text-foreground underline underline-offset-3 outline-none hit-area [--hit-area-x:--spacing(2)] [--hit-area-y:--spacing(2)] focus-visible:ring-3 focus-visible:ring-ring/50" />
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
    </ToastRegion>
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
      <Toaster toaster={toaster} />
    </ToastContext>
  );
}

export { ToastProvider, Toaster, useToast, showWith, ACTION_MS, SUCCESS_MS, type ShowToast, type ToastOptions };
