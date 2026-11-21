import type { AlertDialogOpenChangeReason } from "@ui-sdk/react/alert-dialog";
import type { DialogOpenChangeReason } from "@ui-sdk/react/dialog";
import type { LucideIcon } from "lucide-react";
import {
  createContext,
  use,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
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
import { report, sourceOf, type ChangeDetails, type ChangeSource } from "#avenue/lib/change";
import { devError } from "#avenue/lib/dev";
import { rejectionText, useAction, usePendingAnnouncement } from "#avenue/lib/pending";
import { defined, type Loose } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/** What `onOpenChange` gets after the state: ui-sdk Dialog's details, or the Discard confirmation's. */
export type FormDialogOpenChangeDetails = ChangeDetails<DialogOpenChangeReason | AlertDialogOpenChangeReason>;

/**
 * The state and rules every form dialog keeps (AVE-147): `FormDialogRoot` takes these, and `FormDialog`, the one-tag
 * form, passes them on.
 */
export interface FormDialogRootProps {
  /** Controlled open state. Leave it out (and render a `FormDialogTrigger`) to let the dialog manage itself. */
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  /**
   * Called with false only once the dialog may really close: never while held, and after "Discard" when dirty. Gets
   * ui-sdk's details second (after Discard, those of the Discard press); `details.cancel()` keeps it open (AVE-145).
   */
  onOpenChange?: ((open: boolean, details: FormDialogOpenChangeDetails) => void) | undefined;
  /**
   * Called on Enter in a field or a press of `FormDialogSubmit`, unless pending, submit is off, or `askAdmin`. Return a
   * Promise and the dialog is pending until it settles, as ui-sdk's Button and a dialog Close part's `action` are:
   * resolved, the dialog closes (so resolve only when it saved); rejected, it stays open and the rejection's message
   * shows as the form's error, so reject with the sentence to show. The next submit clears it.
   */
  onSubmit?: (() => void | PromiseLike<unknown>) | undefined;
  /** Shown on the submit button while pending, e.g. "Saving…". */
  pendingLabel?: string | undefined;
  /**
   * What screen readers hear once a save has run for a second, as ui-sdk's `pendingAnnouncement`. `pendingLabel` by
   * default; an empty string says nothing.
   */
  pendingAnnouncement?: string | undefined;
  /**
   * A save is running that the dialog didn't start (a mutation already in flight). A Promise returned by `onSubmit` or
   * `FormDialogAlternate`'s `onClick` makes the dialog pending by itself, so most forms don't need this; when true it
   * wins, and the dialog stays pending after that Promise settles. While pending, submit shows its pending label and
   * is off. After `slowAfter` ms a line in the footer says the save is slow and will finish (MANA-1039).
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
  /**
   * The form's error, under the fields (announced at once). Field errors go on their fields. When set, it wins over a
   * rejected `onSubmit` Promise, whose message shows here otherwise.
   */
  error?: ReactNode;
  /**
   * Why this person can't save this: a plain member (MAN-795) or a read-only board (MANA-953). The fields and the
   * save buttons are disabled before anyone types, with this sentence in the footer.
   */
  askAdmin?: string | undefined;
  children?: ReactNode;
}

type FormDialogState = {
  inRoot: boolean;
  pending: boolean;
  slow: boolean;
  /** Nothing may close the dialog: locked, or pending and held. */
  held: boolean;
  /** Submit and the alternate are off: pending, `askAdmin`, or a Submit part that is `disabled`. */
  submitOff: boolean;
  pendingLabel: string | undefined;
  again: string | undefined;
  askAdmin: string | undefined;
  askAdminId: string;
  error: ReactNode;
  asking: boolean;
  setAsking: (asking: boolean) => void;
  setOpen: (open: boolean, details: FormDialogOpenChangeDetails) => void;
  /** `source`: how the submit was made, so the close after a resolved save keeps it (AVE-214). */
  submit: (source: ChangeSource) => void;
  run: (handler: () => unknown, source: ChangeSource) => void;
  setSubmitDisabled: (disabled: boolean) => void;
  setErrorPlaced: (placed: boolean) => void;
  errorPlaced: boolean;
};

const noop = () => {};

/** Outside a root a part draws itself with nothing held, so a screen still renders in production (AVE-140). */
const NO_ROOT: FormDialogState = {
  inRoot: false,
  pending: false,
  slow: false,
  held: false,
  submitOff: false,
  pendingLabel: undefined,
  again: undefined,
  askAdmin: undefined,
  askAdminId: "",
  error: null,
  asking: false,
  setAsking: noop,
  setOpen: noop,
  submit: noop,
  run: (handler) => void handler(),
  setSubmitDisabled: noop,
  setErrorPlaced: noop,
  errorPlaced: false,
};

const FormDialogContext = createContext<FormDialogState>(NO_ROOT);

/** The root's state. Outside a `FormDialogRoot` it says so in development: the part would drop the dialog's rules. */
function useFormDialog(part: string): FormDialogState {
  const state = use(FormDialogContext);
  if (!state.inRoot) {
    devError(
      `Avenue: <${part}> is outside a <FormDialogRoot>, so it can't keep the form's rules (pending, the hold, the discard question). Put it inside one, or use <FormDialog>.`,
    );
  }
  return state;
}

const SLOW_SAVE_MS = 8_000;

/** The form's error when a submit's Promise rejects with no message of its own. */
const SAVE_FAILED = "We couldn’t save this. Check your connection and try again.";

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
 * The root of a form dialog built from parts (AVE-147), as ui-sdk's rendering guide wraps its parts: it holds the
 * open state and the rules, and every part reads them, so composing the parts can't drop one.
 *
 * - Pending (`pending`, or a Promise from `onSubmit` or the alternate): submit shows `pendingLabel` and is off, and a
 *   second Enter can't submit twice.
 * - Held (`locked`, or pending with `holdWhilePending`): Esc, an outside press, Cancel and ✕ do nothing.
 * - Dirty: Esc, an outside press, Cancel and ✕ ask "Discard changes?" first.
 * - Slow: after `slowAfter` the footer says the save will finish on its own (MANA-1039).
 * - `askAdmin`: the body's fields and the save buttons are off, with the reason in the footer.
 *
 * ```tsx
 * <FormDialogRoot dirty={dirty} pendingLabel="Saving…" onSubmit={save}>
 *   <FormDialogTrigger render={<Button variant="outline" />}>Add document</FormDialogTrigger>
 *   <FormDialogContent>
 *     <FormDialogHeader icon={FileTextIcon}>
 *       <FormDialogTitle>Add document</FormDialogTitle>
 *       <FormDialogDescription>A file or written document.</FormDialogDescription>
 *     </FormDialogHeader>
 *     <FormDialogBody>…fields…</FormDialogBody>
 *     <FormDialogFooter>
 *       <FormDialogCancel />
 *       <FormDialogSubmit>Save document</FormDialogSubmit>
 *     </FormDialogFooter>
 *   </FormDialogContent>
 * </FormDialogRoot>
 * ```
 *
 * Behavior, from ui-sdk's dialog: focus starts on the first field and returns to the trigger; Enter in a field
 * submits (a native form); Tab stays inside. The discard question is ui-sdk's alert dialog, nested in this one, so
 * Esc there steps back to the form.
 */
function FormDialogRoot({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onSubmit,
  pendingLabel,
  pendingAnnouncement,
  pending: pendingProp = false,
  holdWhilePending = true,
  locked = false,
  again,
  slowAfter = SLOW_SAVE_MS,
  dirty = false,
  error,
  askAdmin,
  children,
}: FormDialogRootProps) {
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const [asking, setAsking] = useState(false);
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [errorPlaced, setErrorPlaced] = useState(false);
  const askAdminId = useId();
  const open = openProp ?? ownOpen;
  const action = useAction(open);
  // `pending` wins: it holds the dialog after a Promise settles. A Promise still running keeps it pending even when the
  // app passes pending={false}, so a second Enter can't submit twice.
  const pending = pendingProp || action.status === "running";
  const slow = useSlow(pending, slowAfter);
  usePendingAnnouncement(pending, pendingAnnouncement ?? pendingLabel);
  const held = locked || (pending && holdWhilePending);
  const submitOff = pending || !!askAdmin || submitDisabled;
  // The app hears it first, as ui-sdk's callbacks do, and can cancel it.
  const setOpen = (next: boolean, details: FormDialogOpenChangeDetails) => {
    onOpenChange?.(next, details);
    if (!details.canceled && openProp === undefined) setOwnOpen(next);
  };
  // A resolved save closes the dialog, with reason "action", as a resolved ui-sdk Close `action` does.
  const close = () => {
    report<boolean, FormDialogOpenChangeDetails["reason"]>(setOpen, false, { reason: "action" });
  };
  // The close comes after the save's await, so it runs with the submit's source: an agent's save closes as the agent's.
  const run = (handler: () => unknown, source: ChangeSource) => {
    if (!submitOff) action.run(handler, { onResolve: close, source });
  };
  const state: FormDialogState = {
    inRoot: true,
    pending,
    slow,
    held,
    submitOff,
    pendingLabel,
    again,
    askAdmin,
    askAdminId,
    error: error || (action.status === "failed" ? rejectionText(action.error, SAVE_FAILED) : null),
    asking,
    setAsking,
    setOpen,
    submit: (source) => {
      if (onSubmit) run(onSubmit, source);
    },
    run,
    setSubmitDisabled,
    setErrorPlaced,
    errorPlaced,
  };
  return (
    <FormDialogContext value={state}>
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
          setOpen(next, details);
        }}
      >
        {children}
      </Dialog>
    </FormDialogContext>
  );
}

/** The button that opens the dialog. Focus returns to it on close. */
function FormDialogTrigger(props: Loose<ComponentProps<typeof DialogTrigger>>) {
  useFormDialog("FormDialogTrigger");
  return <DialogTrigger {...defined(props)} />;
}

/**
 * The dialog and its form: Enter in a field submits through the root. Holds the "Discard changes?" question, and
 * leaves the ✕ out while the dialog is held. `width`: md (448px) for most forms; lg (512px) for a form with a file or
 * a two-column row.
 */
function FormDialogContent({
  width = "md",
  showCloseButton = true,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof DialogContent>, "children"> & {
  width?: "md" | "lg" | undefined;
  children?: ReactNode;
}) {
  const { held, submit, asking, setAsking, setOpen } = useFormDialog("FormDialogContent");
  return (
    <DialogContent
      className={cn("gap-0 p-0", width === "lg" ? "sm:max-w-lg" : "sm:max-w-md", className)}
      showCloseButton={!held && showCloseButton}
      {...defined(props)}
    >
      <form
        className="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit(sourceOf(event.nativeEvent));
        }}
      >
        {children}
      </form>
      <AlertDialog
        open={asking}
        onOpenChange={(next, details) => {
          if (next) return;
          // An app that cancels the close after Discard keeps the question open too.
          if (details.returnValue === "discard") setOpen(false, details);
          if (!details.canceled) setAsking(false);
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
  );
}

/** The header line: the form's icon, then its title (and its description, for screen readers). */
function FormDialogHeader({
  icon: Icon,
  className,
  children,
  render,
  ...props
}: ComponentProps<typeof DialogHeader> & { icon?: LucideIcon | undefined }) {
  useFormDialog("FormDialogHeader");
  return (
    // pe-12 (48px), not the 16px inset (AVE-61): the close button is 24px, 16px from the corner, so a long title stops
    // 8px (gap-group) before it instead of running under it.
    <DialogHeader
      className={cn("shrink-0 flex-row items-center gap-group border-b p-inset pe-12", className)}
      render={render}
      {...defined(props)}
    >
      {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
      {children}
    </DialogHeader>
  );
}

function FormDialogTitle(props: Loose<ComponentProps<typeof DialogTitle>>) {
  return <DialogTitle {...defined(props)} />;
}

/** What the form is for. For screen readers only by default: the header is one line. */
function FormDialogDescription({ className, ...props }: Loose<ComponentProps<typeof DialogDescription>>) {
  return <DialogDescription className={cn("sr-only", className)} {...defined(props)} />;
}

/**
 * The fields, scrolling between a fixed header and footer. With `askAdmin` every field inside is off before anyone
 * types. The form's error shows at its end, unless a `FormDialogError` is placed elsewhere.
 */
function FormDialogBody({ className, children, ...props }: Loose<ComponentProps<typeof FieldGroup>>) {
  const { askAdmin, errorPlaced } = useFormDialog("FormDialogBody");
  return (
    <FieldGroup className={cn("min-h-0 gap-4 overflow-y-auto p-inset text-compact", className)} {...defined(props)}>
      {/* A native fieldset disables every field inside it, ui-sdk's and plain ones, before anyone types (MANA-953).
          Always mounted, so a change to askAdmin doesn't remount the fields and drop what was typed. */}
      <FieldSet disabled={!!askAdmin} className="contents">
        {children}
      </FieldSet>
      {!errorPlaced && <FormErrorLine />}
    </FieldGroup>
  );
}

function FormErrorLine(props: Omit<ComponentProps<typeof InlineMessage>, "tone" | "children">) {
  const { error } = use(FormDialogContext);
  return (
    <InlineMessage tone="error" {...props}>
      {error}
    </InlineMessage>
  );
}

/**
 * The form's error (the root's `error`, or a rejected save's message), announced at once. `FormDialogBody` shows it at
 * its end by itself; place this part only to show it somewhere else.
 */
function FormDialogError(props: Omit<ComponentProps<typeof InlineMessage>, "tone" | "children">) {
  const { setErrorPlaced } = useFormDialog("FormDialogError");
  useLayoutEffect(() => {
    setErrorPlaced(true);
    return () => setErrorPlaced(false);
  }, [setErrorPlaced]);
  return <FormErrorLine {...props} />;
}

/**
 * The footer strip: the buttons, with the `askAdmin` reason and the slow-save line set above them on a wide screen
 * and below them on a phone. Put `FormDialogCancel` first.
 */
function FormDialogFooter({ className, children, ...props }: Omit<ComponentProps<typeof DialogFooter>, "showCloseButton">) {
  const { askAdmin, askAdminId, slow, held, again } = useFormDialog("FormDialogFooter");
  return (
    <DialogFooter className={cn("m-0 shrink-0 px-inset py-row-y sm:flex-wrap sm:items-center", className)} {...defined(props)}>
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
      {children}
    </DialogFooter>
  );
}

/** Cancel ("Cancel" unless given other words). Off while the dialog is held; asks first when the form is dirty. */
function FormDialogCancel({ children = "Cancel", ...props }: Loose<ComponentProps<typeof DialogClose>>) {
  const { held } = useFormDialog("FormDialogCancel");
  return (
    <DialogClose disabled={held} render={<Button variant="outline" size="sm" />} {...defined(props)}>
      {children}
    </DialogClose>
  );
}

type SaveButtonProps = Omit<ComponentProps<typeof Button>, "type" | "onClick">;

/**
 * The form's submit button: it runs the root's `onSubmit`, as Enter in a field does. Shows the root's `pendingLabel`
 * and is off while pending or with `askAdmin`. `disabled` turns it off for another reason, e.g. while a file uploads
 * (put the progress in its label); Enter in a field then does nothing either.
 */
function FormDialogSubmit({ disabled = false, children, ...props }: SaveButtonProps) {
  const { pending, pendingLabel, submitOff, askAdmin, askAdminId, setSubmitDisabled } = useFormDialog("FormDialogSubmit");
  useLayoutEffect(() => {
    setSubmitDisabled(!!disabled);
    return () => setSubmitDisabled(false);
  }, [disabled, setSubmitDisabled]);
  return (
    <Button
      size="sm"
      focusableWhenDisabled
      aria-describedby={askAdmin ? askAdminId : undefined}
      {...defined(props)}
      type="submit"
      disabled={submitOff || !!disabled}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

/**
 * A second way to save, before submit, e.g. "Save & prepare letter". Off whenever submit is. Its `onClick` takes a
 * Promise as the root's `onSubmit` does: pending while it runs, closed when it resolves, its message as the error when
 * it rejects.
 */
function FormDialogAlternate({
  onClick,
  ...props
}: SaveButtonProps & { onClick: () => void | PromiseLike<unknown> }) {
  const { submitOff, askAdmin, askAdminId, run } = useFormDialog("FormDialogAlternate");
  return (
    <Button
      variant="outline"
      size="sm"
      focusableWhenDisabled
      aria-describedby={askAdmin ? askAdminId : undefined}
      {...defined(props)}
      type="button"
      disabled={submitOff}
      onClick={(_event, { source }) => run(onClick, source)}
    />
  );
}

interface FormDialogBaseProps extends Omit<FormDialogRootProps, "onSubmit" | "children"> {
  /** The button that opens it. Focus returns to it on close. */
  trigger?: ReactElement<Record<string, unknown>> | undefined;
  icon: LucideIcon;
  title: string;
  /** For screen readers: what the form is for. */
  description: string;
  /** md (448px) for most forms; lg (512px) for a form with a file or a two-column row. */
  width?: "md" | "lg" | undefined;
  children: ReactNode;
}

export interface FormDialogSubmitProps extends FormDialogBaseProps {
  closeOnly?: false | undefined;
  submitLabel: string;
  /** Submit is off for a reason other than a save, e.g. while a file uploads (put the progress in `submitLabel`). */
  submitDisabled?: boolean | undefined;
  /** A second way to save, shown before submit, e.g. "Save & prepare letter". Off whenever submit is. Its `onSubmit` takes a Promise as the main one does. */
  alternate?: { label: string; onSubmit: () => void | PromiseLike<unknown> } | undefined;
  cancelLabel?: string | undefined;
  /**
   * Called on Enter in a field or a press of submit, unless pending, submit is off, or `askAdmin`. Return a Promise
   * and the dialog is pending until it settles, as ui-sdk's Button and a dialog Close part's `action` are: resolved,
   * the dialog closes (so resolve only when it saved); rejected, it stays open and the rejection's message shows as the
   * form's error, so reject with the sentence to show. The next submit clears it.
   */
  onSubmit: () => void | PromiseLike<unknown>;
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

/**
 * The frame of every form dialog in ManyAve (AVE-9) in one tag: icon and title, the fields, an error slot, and Cancel
 * plus submit on the footer strip, with the discard guard, the slow-save line, the hold while a write is in flight
 * (and `locked`), read-only fields with `askAdmin`, `submitDisabled`, a second submit (`alternate`) and `closeOnly`
 * (AVE-120). Ported from the app's DuesForm and DetailDialog (e01cc90).
 *
 * Built from `FormDialogRoot` and its parts (AVE-147), as ui-sdk's rendering guide wraps its parts in one component:
 * use the parts for a form this shape doesn't fit, and the rules come with them. `onSubmit` may return a Promise,
 * which drives pending by itself (AVE-150); `pending` stays for a save started somewhere else.
 */
export function FormDialog(props: FormDialogProps) {
  const {
    trigger,
    icon,
    title,
    description,
    width,
    children,
    closeOnly,
    submitLabel,
    submitDisabled,
    alternate,
    cancelLabel,
    onSubmit,
    ...root
  } = props;
  return (
    <FormDialogRoot {...root} onSubmit={onSubmit}>
      {trigger && <FormDialogTrigger render={trigger} />}
      <FormDialogContent width={width} showCloseButton={!closeOnly}>
        <FormDialogHeader icon={icon}>
          <FormDialogTitle>{title}</FormDialogTitle>
          <FormDialogDescription>{description}</FormDialogDescription>
        </FormDialogHeader>
        <FormDialogBody>{children}</FormDialogBody>
        <FormDialogFooter>
          <FormDialogCancel>{closeOnly ? "Close" : (cancelLabel ?? "Cancel")}</FormDialogCancel>
          {!closeOnly && alternate && <FormDialogAlternate onClick={alternate.onSubmit}>{alternate.label}</FormDialogAlternate>}
          {!closeOnly && <FormDialogSubmit disabled={submitDisabled}>{submitLabel}</FormDialogSubmit>}
        </FormDialogFooter>
      </FormDialogContent>
    </FormDialogRoot>
  );
}

export {
  FormDialogAlternate,
  FormDialogBody,
  FormDialogCancel,
  FormDialogContent,
  FormDialogDescription,
  FormDialogError,
  FormDialogFooter,
  FormDialogHeader,
  FormDialogRoot,
  FormDialogSubmit,
  FormDialogTitle,
  FormDialogTrigger,
};
