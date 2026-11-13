import type { LucideIcon } from "lucide-react";
import { useId, useState, type ReactElement, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#avenue/components/alert-dialog";
import { AskAdmin } from "#avenue/components/ask-admin";
import { Button } from "#avenue/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#avenue/components/dialog";
import { FieldGroup } from "#avenue/components/field";
import { InlineMessage } from "#avenue/components/inline-message";
import { cn } from "#avenue/lib/utils";

export interface FormDialogProps {
  /** Controlled open state. Leave it out (and pass `trigger`) to let the dialog manage itself. */
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  /** Called with false only once the dialog may really close: never while pending, and after "Discard" when dirty. */
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** The button that opens it. Focus returns to it on close. */
  trigger?: ReactElement<Record<string, unknown>> | undefined;
  icon: LucideIcon;
  title: string;
  /** For screen readers: what the form is for. */
  description: string;
  submitLabel: string;
  /** Shown on the submit button while `pending`, e.g. "Saving…". */
  pendingLabel?: string | undefined;
  /** The save is running: submit shows its pending label, and Esc, Cancel and ✕ do nothing until it ends. */
  pending?: boolean | undefined;
  cancelLabel?: string | undefined;
  /** The form holds unsaved input: Esc, an outside press, Cancel or ✕ ask "Discard changes?" first. */
  dirty?: boolean | undefined;
  /** The form's error, under the fields (announced at once). Field errors go on their fields. */
  error?: ReactNode;
  /** A plain member can't save this (MAN-795): the sentence shown in the footer, and submit is disabled. */
  askAdmin?: string | undefined;
  /** md (448px) for most forms; lg (512px) for a form with a file or a two-column row. */
  width?: "md" | "lg" | undefined;
  /** Called on Enter in a field or a press of submit, unless pending or `askAdmin`. */
  onSubmit: () => void;
  children: ReactNode;
}

/**
 * The frame of every form dialog in ManyAve (AVE-9): icon and title, the fields, an error slot, and Cancel plus
 * submit on the footer strip. Ported from the app's DuesForm and DetailDialog (e01cc90) with the discard guard
 * (discard-guard.tsx) built in, so every form gets it rather than the two that use it today.
 *
 * Behavior, from ui-sdk's dialog: focus starts on the first field and returns to the trigger; Enter in a field
 * submits (a native form); Tab stays inside. The discard question is ui-sdk's alert dialog, nested in this one,
 * so Esc there steps back to the form. AVE-2 spacing: the 16px inset on every side (the app's 20px sides become 16).
 */
export function FormDialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  trigger,
  icon: Icon,
  title,
  description,
  submitLabel,
  pendingLabel,
  pending = false,
  cancelLabel = "Cancel",
  dirty = false,
  error,
  askAdmin,
  width = "md",
  onSubmit,
  children,
}: FormDialogProps) {
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const [asking, setAsking] = useState(false);
  const askAdminId = useId();
  const open = openProp ?? ownOpen;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOwnOpen(next);
    onOpenChange?.(next);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next, details) => {
        if (!next && (pending || dirty)) {
          details.cancel();
          if (!pending) setAsking(true);
          return;
        }
        setOpen(next);
      }}
    >
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className={cn("gap-0 p-0", width === "lg" ? "sm:max-w-lg" : "sm:max-w-md")} showCloseButton={!pending}>
        <form
          className="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!pending && !askAdmin) onSubmit();
          }}
        >
          {/* pe-12 (48px), not the 16px inset (AVE-61): the close button is 24px, 16px from the corner, so a long
              title stops 8px (gap-group) before it instead of running under it. The app's sectioned dialogs pad
              20px on both sides, and their long titles meet the close button. */}
          <DialogHeader className="shrink-0 flex-row items-center gap-group border-b p-inset pe-12">
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="sr-only">{description}</DialogDescription>
          </DialogHeader>
          <FieldGroup className="min-h-0 gap-4 overflow-y-auto p-inset text-compact">
            {children}
            <InlineMessage tone="error">{error}</InlineMessage>
          </FieldGroup>
          <DialogFooter className="m-0 shrink-0 px-inset py-row-y sm:flex-wrap sm:items-center">
            {askAdmin && (
              <AskAdmin id={askAdminId} footer>
                {askAdmin}
              </AskAdmin>
            )}
            <DialogClose disabled={pending} render={<Button variant="outline" size="sm" />}>
              {cancelLabel}
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={pending || !!askAdmin}
              focusableWhenDisabled
              aria-describedby={askAdmin ? askAdminId : undefined}
            >
              {pending && pendingLabel ? pendingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
        <AlertDialog
          open={asking}
          onOpenChange={(next, details) => {
            if (next) return;
            setAsking(false);
            if (details.returnValue === "discard") setOpen(false);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard changes?</AlertDialogTitle>
              <AlertDialogDescription>What you entered is not saved. Discard it, or keep editing.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="outline" />}>Keep editing</AlertDialogClose>
              <AlertDialogClose
                value="discard"
                data-agent-confirm="Discards what was entered in this form"
                render={<Button variant="destructive" />}
              >
                Discard
              </AlertDialogClose>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
