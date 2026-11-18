import type { AlertDialogController, AlertDialogOpenChangeReason } from "@ui-sdk/react/alert-dialog";
import {
  createContext,
  use,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  createAlertDialogController,
} from "#avenue/components/alert-dialog";
import { TriangleAlertIcon } from "lucide-react";
import { Button } from "#avenue/components/button";
import type { ChangeDetails } from "#avenue/lib/change";
import { devError } from "#avenue/lib/dev";
import { useAction } from "#avenue/lib/pending";
import { defined, type Loose } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

export { createConfirm } from "#avenue/components/alert-dialog";

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

/** What `onOpenChange` gets second: ui-sdk's alert dialog details. */
export type PendingConfirmOpenChangeDetails = ChangeDetails<AlertDialogOpenChangeReason>;

/** The state and rules of a pending confirmation (AVE-147): `PendingConfirmDialogRoot` takes these. */
export interface PendingConfirmDialogRootProps<Payload = unknown> {
  /** Controlled open state. Leave it out to open it from a `PendingConfirmDialogTrigger` or a `controller`. */
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  /** Called with false when the person cancels or closes, with ui-sdk's details. Never called while pending. */
  onOpenChange?: ((open: boolean, details: PendingConfirmOpenChangeDetails) => void) | undefined;
  /**
   * `confirm.controller` from `createConfirm<Payload>()`, ui-sdk's way to ask from an event handler:
   * `if (await confirm({ household })) …` opens the dialog with that payload and resolves true once the step has
   * happened (`onConfirm` resolved), false when the person cancels or closes. Or a `createAlertDialogController()`.
   */
  controller?: AlertDialogController<Payload, string> | undefined;
  /**
   * Where the step is, when the app tracks it itself; "ready" by default. A Promise returned by `onConfirm` moves the
   * dialog through pending and unknown by itself, so most callers leave this out. "pending" or "unknown" wins over the
   * Promise. While pending the person can't leave (Esc, Tab and Close are held), so the caller must always end it:
   * move to "unknown" (or reject) when the call times out or its reply is lost, never leave it pending (AVE-44).
   */
  phase?: PendingConfirmPhase | undefined;
  recovery: PendingConfirmRecovery;
  /**
   * Runs the step, with the question's payload; also Try again when the outcome is unknown and it is safe to retry.
   * Return a Promise and the dialog is pending until it settles (AVE-150), as a ui-sdk Close part's `action` is:
   * resolved, the dialog closes with reason "action" (so resolve only when the step happened); rejected, the outcome is
   * unknown and `recovery` shows. Give the call a timeout that rejects, because a Promise that never settles holds the
   * person here.
   */
  onConfirm: (payload: Payload | undefined) => void | PromiseLike<unknown>;
  /** The status line while pending, e.g. "Recording mailing confirmation. Please wait." */
  pendingMessage: string;
  children?: ReactNode;
}

type PendingConfirmState = {
  inRoot: boolean;
  phase: PendingConfirmPhase;
  payload: unknown;
  recovery: PendingConfirmRecovery;
  pendingMessage: string;
  reasonId: string;
  status: RefObject<HTMLOutputElement | null>;
  recover: RefObject<HTMLButtonElement | null>;
  confirm: () => void;
};

const NO_ROOT: PendingConfirmState = {
  inRoot: false,
  phase: "ready",
  payload: undefined,
  recovery: { safeToRetry: true, message: "" },
  pendingMessage: "",
  reasonId: "",
  status: { current: null },
  recover: { current: null },
  confirm: () => {},
};

const PendingConfirmContext = createContext<PendingConfirmState>(NO_ROOT);

function usePendingConfirm(part: string): PendingConfirmState {
  const state = use(PendingConfirmContext);
  if (!state.inRoot) {
    devError(
      `Avenue: <${part}> is outside a <PendingConfirmDialogRoot>, so it can't hold the dialog while the step runs or offer recovery. Put it inside one, or use <PendingConfirmDialog>.`,
    );
  }
  return state;
}

/**
 * The root of a confirmation for a step that sends something or moves money (AVE-9, AVE-147), built on Avenue's alert
 * dialog parts. It holds the phases, and every part reads them, so composing the parts can't drop one:
 *
 * - ready: focus starts on Cancel, the safe answer.
 * - pending: focus moves to the status line and Tab can't leave it; Esc, Cancel and the buttons do nothing, so
 *   nobody walks away from a step that is half done.
 * - unknown: a new `alert` says "couldn't confirm" as a warning, not an error (AVE-46: the step may well have happened,
 *   and red would push people to retry). Focus moves to the recovery button, which is described by that sentence
 *   (AVE-44). Close stays available in both recovery cases, so a person is never trapped.
 *
 * ```tsx
 * const [confirm] = useState(() => createConfirm<{ household: string }>());
 * // in a handler: if (await confirm({ household })) toast("Payment recorded");
 * <PendingConfirmDialogRoot controller={confirm.controller} onConfirm={record} recovery={…} pendingMessage="…">
 *   <PendingConfirmDialogContent<{ household: string }>>
 *     {({ payload }) => (
 *       <>
 *         <PendingConfirmDialogHeader>
 *           <PendingConfirmDialogTitle>Record payment?</PendingConfirmDialogTitle>
 *           <PendingConfirmDialogDescription>For {payload?.household}.</PendingConfirmDialogDescription>
 *         </PendingConfirmDialogHeader>
 *         <PendingConfirmDialogFooter>
 *           <PendingConfirmDialogCancel />
 *           <PendingConfirmDialogConfirm pendingLabel="Recording…">Record payment</PendingConfirmDialogConfirm>
 *         </PendingConfirmDialogFooter>
 *       </>
 *     )}
 *   </PendingConfirmDialogContent>
 * </PendingConfirmDialogRoot>
 * ```
 *
 * ui-sdk's alert dialog: role alertdialog, modal, an outside press never closes it.
 */
function PendingConfirmDialogRoot<Payload = unknown>({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  controller: controllerProp,
  phase: phaseProp = "ready",
  recovery,
  onConfirm,
  pendingMessage,
  children,
}: PendingConfirmDialogRootProps<Payload>) {
  const status = useRef<HTMLOutputElement>(null);
  const recover = useRef<HTMLButtonElement>(null);
  const reasonId = useId();
  // Closing after the step goes through a controller, so `confirm()` hears "confirm" and the app hears "action".
  const [ownController] = useState(() => createAlertDialogController<Payload, string>());
  const controller = controllerProp ?? ownController;
  const [shownOpen, setShownOpen] = useState(defaultOpen);
  const [payload, setPayload] = useState<Payload | undefined>(undefined);
  const open = openProp ?? shownOpen;
  const action = useAction(open);
  const settled = useRef(false);
  // The app's phase wins; otherwise the Promise onConfirm returned says where the step is. A rejection means the
  // outcome is unknown, not that it failed: the call may have happened before its reply was lost (UX.md, "Words").
  const phase: PendingConfirmPhase =
    phaseProp !== "ready"
      ? phaseProp
      : action.status === "running"
        ? "pending"
        : action.status === "failed"
          ? "unknown"
          : "ready";
  const pending = phase === "pending";
  const unknown = phase === "unknown";
  useLayoutEffect(() => {
    if (pending) status.current?.focus();
    else if (unknown) recover.current?.focus();
  }, [pending, unknown]);
  const state: PendingConfirmState = {
    inRoot: true,
    phase,
    payload,
    recovery,
    pendingMessage,
    reasonId,
    status,
    recover,
    confirm: () => {
      if (pending) return;
      // Resolved, the step is done: close rather than return to "ready" and ask again for a step that happened.
      action.run(() => onConfirm(payload), {
        onResolve: () => {
          settled.current = true;
          controller.close({ reason: "action", returnValue: "confirm" });
          settled.current = false;
        },
      });
    },
  };
  return (
    <PendingConfirmContext value={state}>
      <AlertDialog
        {...(openProp === undefined ? { defaultOpen } : { open: openProp })}
        controller={controller}
        dismissible={!pending}
        onPayloadChange={(next) => setPayload(next as Payload | undefined)}
        onOpenChange={(next, details) => {
          if (!next && pending && !settled.current) {
            details.cancel();
            return;
          }
          if (next) setPayload(controller.getPayload());
          onOpenChange?.(next, details);
          if (!details.canceled) setShownOpen(next);
        }}
      >
        {children}
      </AlertDialog>
    </PendingConfirmContext>
  );
}

/** The button that opens the confirmation. `payload` is the question's data, as on ui-sdk's trigger. */
function PendingConfirmDialogTrigger(props: Loose<ComponentProps<typeof AlertDialogTrigger>>) {
  usePendingConfirm("PendingConfirmDialogTrigger");
  return <AlertDialogTrigger {...defined(props)} />;
}

/**
 * The dialog. Its children may be a function of `{ payload }`, the question's data from a trigger or `confirm()`. Any
 * other prop (a ref, an id, aria-* or data-*) lands on the dialog itself; it is described by its description, so it
 * takes no aria-describedby. Its focus and Tab handling while pending stay Avenue's, and an onKeyDown of the app's runs
 * before them and can't release Tab (AVE-138).
 */
function PendingConfirmDialogContent<Payload = unknown>({
  onKeyDown,
  children,
  ...props
}: Omit<ComponentProps<typeof AlertDialogContent>, "children" | "initialFocus" | "aria-describedby"> & {
  children?: ReactNode | ((state: { payload: Payload | undefined }) => ReactNode);
}) {
  const { phase, status, recover, payload } = usePendingConfirm("PendingConfirmDialogContent");
  const pending = phase === "pending";
  return (
    <AlertDialogContent
      {...props}
      onKeyDown={(event) => {
        // The app's handler first; Tab stays held while pending whatever it does.
        onKeyDown?.(event);
        if (pending && event.key === "Tab") {
          event.preventDefault();
          status.current?.focus();
        }
      }}
      {...(pending
        ? { initialFocus: () => status.current }
        : phase === "unknown"
          ? { initialFocus: () => recover.current }
          : {})}
    >
      {typeof children === "function" ? children({ payload: payload as Payload | undefined }) : children}
    </AlertDialogContent>
  );
}

const PendingConfirmDialogHeader = AlertDialogHeader;
const PendingConfirmDialogTitle = AlertDialogTitle;
const PendingConfirmDialogDescription = AlertDialogDescription;

/**
 * The answers on the footer strip, with the status line (the focus target while pending) and the couldn't-confirm
 * sentence set above it. Put `PendingConfirmDialogCancel` first.
 */
function PendingConfirmDialogFooter({ children, ...props }: ComponentProps<typeof AlertDialogFooter>) {
  const { phase, status, pendingMessage, reasonId, recovery } = usePendingConfirm("PendingConfirmDialogFooter");
  const pending = phase === "pending";
  return (
    <>
      <output
        ref={status}
        tabIndex={-1}
        data-slot="pending-confirm-status"
        className={cn(
          // A status, not a control: focus lands here to stay in the dialog while both buttons are disabled, but
          // it gets no ring, which would read as a field to type in and clip the descenders (AVE-81).
          "block text-compact text-muted-foreground outline-none",
          !pending && "sr-only",
        )}
      >
        {pending ? pendingMessage : ""}
      </output>
      {phase === "unknown" && (
        <p
          id={reasonId}
          role="alert"
          data-slot="pending-confirm-reason"
          className="flex items-start gap-1 text-compact text-warning-subtle-foreground"
        >
          {/* One line tall, so the icon sits on the first line at either type scale. */}
          <span className="flex h-lh shrink-0 items-center">
            <TriangleAlertIcon aria-hidden className="size-4" />
          </span>
          <span>{recovery.message}</span>
        </p>
      )}
      <AlertDialogFooter {...props}>{children}</AlertDialogFooter>
    </>
  );
}

/** Cancel ("Cancel" unless given other words); "Close" once the outcome is unknown. Off while pending. */
function PendingConfirmDialogCancel({ children = "Cancel", ...props }: Loose<ComponentProps<typeof AlertDialogClose>>) {
  const { phase } = usePendingConfirm("PendingConfirmDialogCancel");
  return (
    <AlertDialogClose disabled={phase === "pending"} render={<Button variant="outline" />} {...defined(props)}>
      {phase === "unknown" ? "Close" : children}
    </AlertDialogClose>
  );
}

/**
 * The step's button: it runs the root's `onConfirm`. Shows `pendingLabel` and is off while pending. Once the outcome
 * is unknown it is Try again when the step is safe to retry, and otherwise the recovery's check button.
 */
function PendingConfirmDialogConfirm({
  pendingLabel,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick" | "type"> & {
  /** On the button while pending, e.g. "Confirming…". */
  pendingLabel: string;
}) {
  const { phase, recovery, reasonId, recover, confirm } = usePendingConfirm("PendingConfirmDialogConfirm");
  const pending = phase === "pending";
  const unknown = phase === "unknown";
  if (unknown && !recovery.safeToRetry) {
    return (
      <Button {...defined(props)} ref={recover} type="button" aria-describedby={reasonId} onClick={recovery.onCheck}>
        {recovery.checkLabel}
      </Button>
    );
  }
  return (
    <Button
      {...defined(props)}
      ref={recover}
      type="button"
      disabled={pending}
      focusableWhenDisabled
      aria-describedby={unknown ? reasonId : undefined}
      onClick={confirm}
    >
      {pending ? pendingLabel : unknown ? "Try again" : children}
    </Button>
  );
}

/**
 * Any other prop of the dialog's content (a ref, an id, aria-* or data-*) lands on the dialog itself (AVE-138).
 */
export interface PendingConfirmDialogProps
  extends Omit<ComponentProps<typeof AlertDialogContent>, "children" | "title" | "initialFocus" | "aria-describedby"> {
  open: boolean;
  /**
   * Called with false when the person cancels or closes, with ui-sdk's details. Never called while pending.
   *
   * Controlled, on purpose (AVE-145): the caller closes it when the step succeeds and drives `phase`. For a trigger,
   * `defaultOpen` or `createConfirm()`, build it from `PendingConfirmDialogRoot` and its parts (AVE-147).
   */
  onOpenChange: (open: boolean, details: PendingConfirmOpenChangeDetails) => void;
  title: string;
  description: ReactNode;
  /** What is about to happen: the letter and address, the payment and household. */
  children?: ReactNode;
  confirmLabel: string;
  /** On the confirm button while pending, e.g. "Confirming…". */
  pendingLabel: string;
  /** The status line while pending, e.g. "Recording mailing confirmation. Please wait." */
  pendingMessage: string;
  /** See `PendingConfirmDialogRoot`'s `phase`. The app's mailing call times out; give every call a timeout. */
  phase?: PendingConfirmPhase | undefined;
  recovery: PendingConfirmRecovery;
  /** See `PendingConfirmDialogRoot`'s `onConfirm`. */
  onConfirm: () => void | PromiseLike<unknown>;
  cancelLabel?: string | undefined;
}

/**
 * A confirmation for a step that sends something or moves money (AVE-9), in one tag: Mark as mailed, Send notices,
 * Record payment. Built twice by hand in the app (mailing-confirmation.tsx, draft-exit.tsx, e01cc90). Built from
 * `PendingConfirmDialogRoot` and its parts (AVE-147), which hold the phases; see there.
 *
 * The status line, which takes focus, is what a screen reader hears while pending, so the dialog sets no separate
 * `pendingAnnouncement`.
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
  ...props
}: PendingConfirmDialogProps) {
  return (
    <PendingConfirmDialogRoot
      open={open}
      onOpenChange={onOpenChange}
      phase={phase}
      recovery={recovery}
      onConfirm={() => onConfirm()}
      pendingMessage={pendingMessage}
    >
      <PendingConfirmDialogContent {...props}>
        <PendingConfirmDialogHeader>
          <PendingConfirmDialogTitle>{title}</PendingConfirmDialogTitle>
          <PendingConfirmDialogDescription>{description}</PendingConfirmDialogDescription>
        </PendingConfirmDialogHeader>
        {children && <div className="grid gap-3 text-compact">{children}</div>}
        <PendingConfirmDialogFooter>
          <PendingConfirmDialogCancel>{cancelLabel}</PendingConfirmDialogCancel>
          <PendingConfirmDialogConfirm pendingLabel={pendingLabel}>{confirmLabel}</PendingConfirmDialogConfirm>
        </PendingConfirmDialogFooter>
      </PendingConfirmDialogContent>
    </PendingConfirmDialogRoot>
  );
}

export {
  PendingConfirmDialogCancel,
  PendingConfirmDialogConfirm,
  PendingConfirmDialogContent,
  PendingConfirmDialogDescription,
  PendingConfirmDialogFooter,
  PendingConfirmDialogHeader,
  PendingConfirmDialogRoot,
  PendingConfirmDialogTitle,
  PendingConfirmDialogTrigger,
};
