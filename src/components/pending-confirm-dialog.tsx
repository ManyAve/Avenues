import { useLayoutEffect, useRef, type ReactNode } from "react";
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
 * - unknown: the status line says "couldn't confirm" (announced at once) and focus moves to the recovery button.
 *   Close stays available in both recovery cases, so a person is never trapped (the Android review's finding).
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
  const status = useRef<HTMLParagraphElement>(null);
  const recover = useRef<HTMLButtonElement>(null);
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
        <p
          ref={status}
          role={unknown ? "alert" : "status"}
          tabIndex={-1}
          data-slot="pending-confirm-status"
          className={cn(
            "rounded-sm text-meta outline-none focus-visible:ring-2 focus-visible:ring-ring",
            unknown ? "text-destructive-subtle-foreground" : "text-muted-foreground",
            phase === "ready" && "sr-only",
          )}
        >
          {pending ? pendingMessage : unknown ? recovery.message : ""}
        </p>
        <AlertDialogFooter>
          <AlertDialogClose disabled={pending} render={<Button variant="outline" />}>
            {unknown ? "Close" : cancelLabel}
          </AlertDialogClose>
          {unknown && !recovery.safeToRetry ? (
            <Button ref={recover} onClick={recovery.onCheck}>
              {recovery.checkLabel}
            </Button>
          ) : (
            <Button ref={recover} disabled={pending} focusableWhenDisabled onClick={onConfirm}>
              {pending ? pendingLabel : unknown ? "Try again" : confirmLabel}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
