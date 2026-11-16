import type { LucideIcon } from "lucide-react";
import { useEffect, useId, useMemo, useState, type ReactElement, type ReactNode } from "react";
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
import { FieldGroup, FieldSet } from "#avenue/components/field";
import { InlineMessage } from "#avenue/components/inline-message";
import { cn } from "#avenue/lib/utils";

interface FormDialogBaseProps {
  /** Controlled open state. Leave it out (and pass `trigger`) to let the dialog manage itself. */
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  /** Called with false only once the dialog may really close: never while held, and after "Discard" when dirty. */
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** The button that opens it. Focus returns to it on close. */
  trigger?: ReactElement<Record<string, unknown>> | undefined;
  icon: LucideIcon;
  title: string;
  /** For screen readers: what the form is for. */
  description: string;
  /** Shown on the submit button while `pending`, e.g. "Saving…". */
  pendingLabel?: string | undefined;
  /**
   * The save is running: submit shows its pending label and is off. After `slowAfter` ms a line in the footer says
   * the save is slow and will finish (MANA-1039).
   */
  pending?: boolean | undefined;
  /**
   * While `pending`, Esc, an outside press, Cancel and ✕ can't close the dialog, so a write (money above all) can't be
   * dropped and entered twice. On by default; pass false for a save that finishes on its own if the dialog closes.
   */
  holdWhilePending?: boolean | undefined;
  /** Nothing closes the dialog, pending or not: for example, a payment whose result is unknown and must be retried. */
  locked?: boolean | undefined;
  /** The verb for "so don't … it again" in the slow line, for a save that creates something ("record", "add"). */
  again?: string | undefined;
  /** How long a save runs before the slow line shows. 8 seconds, the app's (MANA-1039). */
  slowAfter?: number | undefined;
  /** The form holds unsaved input: Esc, an outside press, Cancel or ✕ ask "Discard changes?" first. */
  dirty?: boolean | undefined;
  /** The form's error, under the fields (announced at once). Field errors go on their fields. */
  error?: ReactNode;
  /**
   * Why this person can't save this: a plain member (MAN-795) or a read-only board (MANA-953). The fields and the
   * save buttons are disabled before anyone types, with this sentence in the footer.
   */
  askAdmin?: string | undefined;
  /** md (448px) for most forms; lg (512px) for a form with a file or a two-column row. */
  width?: "md" | "lg" | undefined;
  children: ReactNode;
}

export interface FormDialogSubmitProps extends FormDialogBaseProps {
  closeOnly?: false | undefined;
  submitLabel: string;
  /** Submit is off for a reason other than a save, e.g. while a file uploads (put the progress in `submitLabel`). */
  submitDisabled?: boolean | undefined;
  /** A second way to save, shown before submit, e.g. "Save & prepare letter". Off whenever submit is. */
  alternate?: { label: string; onSubmit: () => void } | undefined;
  cancelLabel?: string | undefined;
  /** Called on Enter in a field or a press of submit, unless pending, submit is off, or `askAdmin`. */
  onSubmit: () => void;
}

export interface FormDialogCloseOnlyProps extends FormDialogBaseProps {
  /** Nothing to submit (an empty list): the footer has one Close button, and the ✕ is left out so Close is named once. */
  closeOnly: true;
  submitLabel?: undefined;
  submitDisabled?: undefined;
  alternate?: undefined;
  cancelLabel?: undefined;
  onSubmit?: undefined;
}

export type FormDialogProps = FormDialogSubmitProps | FormDialogCloseOnlyProps;

const SLOW_SAVE_MS = 8_000;

/** True once `active` has stayed true for `after` ms; false again as soon as it ends. Ported from the app's useSlow. */
function useSlow(active: boolean, after: number) {
  // One token per run, so a new save starts quiet even if the last one turned slow.
  const run = useMemo(() => (active ? {} : undefined), [active]);
  const [slowRun, setSlowRun] = useState<object>();
  useEffect(() => {
    if (!run) return;
    const timer = setTimeout(() => setSlowRun(run), after);
    return () => clearTimeout(timer);
  }, [run, after]);
  return run !== undefined && slowRun === run;
}

/** The app's slow-save sentences (MANA-1039), word for word. */
function slowLine(held: boolean, again: string | undefined) {
  if (held) {
    const base = "This is taking longer than usual. Keep this open. It will finish on its own.";
    return again ? `${base} Closing now won’t stop it, so don’t ${again} it again.` : base;
  }
  return `This is taking longer than usual. It will finish on its own, even if you close this${again ? `, so don’t ${again} it again` : ""}.`;
}

/**
 * The frame of every form dialog in ManyAve (AVE-9): icon and title, the fields, an error slot, and Cancel plus
 * submit on the footer strip. Ported from the app's DuesForm and DetailDialog (e01cc90) with the discard guard
 * (discard-guard.tsx) built in, so every form gets it rather than the two that use it today.
 *
 * Behavior, from ui-sdk's dialog: focus starts on the first field and returns to the trigger; Enter in a field
 * submits (a native form); Tab stays inside. The discard question is ui-sdk's alert dialog, nested in this one,
 * so Esc there steps back to the form. AVE-2 spacing: the 16px inset on every side (the app's 20px sides become 16).
 *
 * AVE-120 adds what the app's DuesForm does, so every board form can move onto this one: the slow-save line, the
 * hold while a write is in flight (and `locked`), read-only fields with `askAdmin`, `submitDisabled`, a second submit
 * (`alternate`) and `closeOnly`. Callout (callout.tsx) is the info or warning note those forms show above the fields.
 */
export function FormDialog(props: FormDialogProps) {
  const {
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    trigger,
    icon: Icon,
    title,
    description,
    pendingLabel,
    pending = false,
    holdWhilePending = true,
    locked = false,
    again,
    slowAfter = SLOW_SAVE_MS,
    dirty = false,
    error,
    askAdmin,
    width = "md",
    children,
  } = props;
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const [asking, setAsking] = useState(false);
  const askAdminId = useId();
  const slow = useSlow(pending, slowAfter);
  const open = openProp ?? ownOpen;
  const held = locked || (pending && holdWhilePending);
  const submitOff = pending || !!askAdmin || (!props.closeOnly && !!props.submitDisabled);
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOwnOpen(next);
    onOpenChange?.(next);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next, details) => {
        if (!next && held) return details.cancel();
        // A save in flight that isn't held finishes on its own, so closing loses nothing and needn't ask.
        if (!next && dirty && !pending) {
          details.cancel();
          setAsking(true);
          return;
        }
        setOpen(next);
      }}
    >
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className={cn("gap-0 p-0", width === "lg" ? "sm:max-w-lg" : "sm:max-w-md")} showCloseButton={!held && !props.closeOnly}
      >
        <form
          className="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!props.closeOnly && !submitOff) props.onSubmit();
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
            {/* A native fieldset disables every field inside it, ui-sdk's and plain ones, before anyone types (MANA-953).
                Always mounted, so a change to askAdmin doesn't remount the fields and drop what was typed. */}
            <FieldSet disabled={!!askAdmin} className="contents">
              {children}
            </FieldSet>
            <InlineMessage tone="error">{error}</InlineMessage>
          </FieldGroup>
          <DialogFooter className="m-0 shrink-0 px-inset py-row-y sm:flex-wrap sm:items-center">
            {askAdmin && (
              <AskAdmin id={askAdminId} footer>
                {askAdmin}
              </AskAdmin>
            )}
            {/* Always mounted, so the polite announcement is read when the line fills (as InlineMessage). */}
            <output
              data-slot="slow-save"
              className="order-last text-meta text-muted-foreground empty:sr-only sm:order-first sm:basis-full sm:text-end"
            >
              {slow ? slowLine(held, again) : null}
            </output>
            <DialogClose disabled={held} render={<Button variant="outline" size="sm" />}>
              {props.closeOnly ? "Close" : (props.cancelLabel ?? "Cancel")}
            </DialogClose>
            {!props.closeOnly && props.alternate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitOff}
                focusableWhenDisabled
                aria-describedby={askAdmin ? askAdminId : undefined}
                onClick={props.alternate.onSubmit}
              >
                {props.alternate.label}
              </Button>
            )}
            {!props.closeOnly && (
              <Button
                type="submit"
                size="sm"
                disabled={submitOff}
                focusableWhenDisabled
                aria-describedby={askAdmin ? askAdminId : undefined}
              >
                {pending && pendingLabel ? pendingLabel : props.submitLabel}
              </Button>
            )}
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
