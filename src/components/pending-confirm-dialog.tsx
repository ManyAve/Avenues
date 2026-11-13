import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#avenue/components/alert-dialog";
import { Button } from "#avenue/components/button";
import { cn } from "#avenue/lib/utils";

/** ready: asking. pending: the step is running. unknown: the reply was lost, so nobody knows whether it happened. */
export type PendingConfirmPhase = "ready" | "pending" | "unknown";

/**
 * What to offer when the outcome is unknown (UX.md, "Words"). Say "couldn't confirm", never "failed".
 * - Safe to retry (the call carries an operation ID): "We couldn't confirm that the announcement went out. It's safe
 *   to try again; it won't send twice." The recovery is Try again.
 * - Not safe to retry: "We couldn't confirm that the correction was saved. Check the ledger before trying again, so
 *   it isn't saved twice." The recovery opens the place to check (Open ledger); there is no Try again.
 */
export type PendingConfirmRecovery =
  | { safeToRetry: true; message: string }
  | { safeToRetry: false; message: string; checkLabel: string; onCheck: () => void };

export interface PendingConfirmDialogProps {
  open: boolean;
  /** Called with false when the person cancels or closes. Never called while pending. */
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** What is about to happen: the letter and address, the payment and household. */
  children?: ReactNode;
  confirmLabel: string;
  /** On the confirm button while pending, e.g. "Confirming…". */
  pendingLabel: string;
  /** The status line while pending, e.g. "Recording mailing confirmation. Please wait." */
  pendingMessage: string;
  /**
   * Where the step is. While pending the person can't leave (Esc, Tab and Close are held), so the caller must
   * always end it: move to "unknown" when the call times out or its reply is lost, never leave it pending (AVE-44).
   * The app's mailing call times out; give every call a timeout before showing this dialog.
   */
  phase: PendingConfirmPhase;
  recovery: PendingConfirmRecovery;
  /** Runs the step; also Try again when the outcome is unknown and it is safe to retry. */
  onConfirm: () => void;
  cancelLabel?: string | undefined;
}

/**
 * A confirmation for a step that sends something or moves money (AVE-9): Mark as mailed, Send notices, Record
 * payment. Built twice by hand in the app (mailing-confirmation.tsx, draft-exit.tsx, e01cc90).
 *
 * - ready: focus starts on Cancel, the safe answer.
 * - pending: focus moves to the status line and Tab can't leave it; Esc, Cancel and the buttons do nothing, so
 *   nobody walks away from a step that is half done.
 * - unknown: a new `alert` says "couldn't confirm" (announced at once; a role change on the status line isn't
 *   announced by every screen reader) and focus moves to the recovery button, which is described by that sentence so
 *   it is read again on focus (AVE-44). Close stays available in both recovery cases, so a person is never trapped
 *   (the Android review's finding, kept by the UX Engineer on AVE-44).
 *
 * Pending must end: the caller moves to "unknown" after a timeout (see `phase`).
 *
 * ui-sdk's alert dialog: role alertdialog, modal, an outside press never closes it.
 */
export function PendingConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  pendingLabel,
  pendingMessage,
  phase,
  recovery,
  onConfirm,
  cancelLabel = "Cancel",
}: PendingConfirmDialogProps) {
  const status = useRef<HTMLOutputElement>(null);
  const recover = useRef<HTMLButtonElement>(null);
  const reasonId = useId();
  const pending = phase === "pending";
  const unknown = phase === "unknown";
  useLayoutEffect(() => {
    if (pending) status.current?.focus();
    else if (unknown) recover.current?.focus();
  }, [pending, unknown]);
  return (
    <AlertDialog
      open={open}
      dismissible={!pending}
      onOpenChange={(next, details) => {
        if (!next && pending) {
          details.cancel();
          return;
        }
        onOpenChange(next);
      }}
    >
      <AlertDialogContent
        {...(pending ? { initialFocus: () => status.current } : unknown ? { initialFocus: () => recover.current } : {})}
        onKeyDown={(event) => {
          if (pending && event.key === "Tab") {
            event.preventDefault();
            status.current?.focus();
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children && <div className="grid gap-3 text-compact">{children}</div>}
        <output
          ref={status}
          tabIndex={-1}
          data-slot="pending-confirm-status"
          className={cn(
            "block rounded-sm text-meta text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !pending && "sr-only",
          )}
        >
          {pending ? pendingMessage : ""}
        </output>
        {unknown && (
          <p id={reasonId} role="alert" data-slot="pending-confirm-reason" className="text-meta text-destructive-subtle-foreground">
            {recovery.message}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogClose disabled={pending} render={<Button variant="outline" />}>
            {unknown ? "Close" : cancelLabel}
          </AlertDialogClose>
          {unknown && !recovery.safeToRetry ? (
            <Button ref={recover} aria-describedby={reasonId} onClick={recovery.onCheck}>
              {recovery.checkLabel}
            </Button>
          ) : (
            <Button
              ref={recover}
              disabled={pending}
              focusableWhenDisabled
              aria-describedby={unknown ? reasonId : undefined}
              onClick={onConfirm}
            >
              {pending ? pendingLabel : unknown ? "Try again" : confirmLabel}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
