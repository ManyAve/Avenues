import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { withSource } from "@ui-sdk/react/observe";
import { createInputController } from "@ui-sdk/react/textarea";
import { Check, CornerUpLeft, Pencil, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Button } from "#avenue/components/button";
import { Textarea } from "#avenue/components/textarea";
import { sourceOf, type ChangeSource } from "#avenue/lib/change";
import { isThenable, usePendingAnnouncement } from "#avenue/lib/pending";
import { defined, type Loose, type NodeChildren, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * The reply box under a chat (AVE-134): a field that grows as you type, Enter sends, Shift+Enter adds a line, and a
 * Send button. Parts: `Composer` (the form), `ComposerContext` (the "Replying to" or "Editing" banner), `ComposerField`
 * and `ComposerSend`. The look is Management's chat window footer (app/ui/components/chat.tsx at 284d1488).
 *
 * Behaviour, from the AVE-125 funnel:
 * - The field is Avenue's Textarea, ui-sdk's, with `autoResize` and `submitShortcut="enter"`, which skips Enter while
 *   an input method composes. Name it "Message <recipient>".
 * - After a send, by Enter or by the button, focus is back in the field. Both apps dropped it to the page, because the
 *   pressed Send disabled itself under the pointer.
 * - `onSend` gets the trimmed text. A plain return clears the field at once (Management's optimistic send keeps a
 *   failed message in its bubble). A promise keeps the text, read-only, until it resolves, and clears it only then; a
 *   rejected one leaves the text to try again (Neighbors' rule, so a refused message isn't lost). Showing why it was
 *   refused is the app's.
 * - Send is disabled while the field is empty or a send is pending, stays focusable, and says why to a screen reader.
 *   The reason isn't drawn: an empty chat field explains itself, and a line under a 32px icon button would move the row.
 * - With a `ComposerContext` showing, Escape in the field cancels it; without one, Escape is left alone, so it still
 *   reaches the dock or dialog around the composer. Cancelling an edit also empties the field, as Management does.
 *
 * Changes from the app (AVE-2): the field's corner is rounded-xl (14px). The app asks for the 2xl corner, a step the shared
 * theme retired, so its field draws square corners; at one line (32px) 14px reads as the pill both apps meant. The
 * field is 32px at one line, Send's height, and field and Send sit gap-controls apart. On a phone both are 44px tall,
 * and the field's text is 16px so iOS doesn't zoom on focus (AVE-29).
 * The banner is `bg-accent` in dark (the app's `bg-muted`), because dark muted is the chat window's own colour and the
 * banner vanished into it, as the skeleton's did (AVE-128).
 */

type ContextKind = "reply" | "edit";

type ComposerContextEntry = { kind: ContextKind; cancelButton: RefObject<HTMLButtonElement | null> };

type ComposerState = {
  controller: ReturnType<typeof createInputController>;
  draft: string | undefined;
  setDraft: (text: string) => void;
  setShown: (shown: { text: string; controlled: boolean }) => void;
  filled: boolean;
  clear: () => void;
  sending: boolean;
  disabled: boolean;
  reasonId: string | undefined;
  /** `source`: how the send was made, so emptying the field after the app's Promise keeps it (AVE-214). */
  send: (source: ChangeSource) => void;
  context: ComposerContextEntry | undefined;
  setContext: (context: ComposerContextEntry | undefined) => void;
};

const ComposerStateContext = createContext<ComposerState | null>(null);

function useComposer(part: string): ComposerState {
  const state = useContext(ComposerStateContext);
  if (!state) throw new Error(`${part} must be inside a Composer.`);
  return state;
}

type ComposerProps = Omit<OwnPartProps<"form">, "onSubmit"> & {
  /** Sends the trimmed text. Return a promise to keep the text until it resolves; a rejected one keeps it to retry. */
  onSend: (text: string) => void | PromiseLike<unknown>;
  /**
   * What screen readers hear once a send's promise has run for a second, as ui-sdk's `pendingAnnouncement`. "Sending"
   * by default; an empty string says nothing.
   */
  pendingAnnouncement?: string | undefined;
  /** Turns the whole composer off (the field and Send). Say why with `disabledReason`. */
  disabled?: boolean | undefined;
  /** Why the composer is off, shown as one muted line under it and read with the field. Implies `disabled`. */
  disabledReason?: ReactNode | undefined;
};

function Composer({ onSend, pendingAnnouncement = "Sending", disabled, disabledReason, className, children, render, ...props }: NodeChildren<ComposerProps>) {
  const reasonId = useId();
  const [controller] = useState(createInputController);
  // The field is controlled here unless the app controls it. Clearing through React state, not the controller, keeps
  // the value React and testing tools track in step with the field.
  const [draft, setDraft] = useState<string>();
  const [shown, setShown] = useState({ text: "", controlled: false });
  const filled = shown.text.trim() !== "";
  const clear = useCallback(() => {
    if (shown.controlled) controller.clear();
    else setDraft("");
  }, [shown.controlled, controller]);
  const [sending, setSending] = useState(false);
  usePendingAnnouncement(sending, pendingAnnouncement);
  const [context, setContext] = useState<ComposerState["context"]>();
  const off = Boolean(disabled || disabledReason);

  const send = useCallback((source: ChangeSource) => {
    const text = controller.getValue().trim();
    if (!text || sending || off) return;
    const result = onSend(text);
    const done = () => {
      setSending(false);
      controller.focus();
    };
    if (isThenable(result)) {
      setSending(true);
      controller.focus();
      // After the await, once the press is over: emptying the field runs with the send's source, so an agent's
      // send empties it as the agent's (AVE-214).
      result.then(
        () =>
          withSource(source, () => {
            clear();
            done();
          }),
        done,
      );
      return;
    }
    clear();
    controller.focus();
  }, [controller, off, sending, onSend, clear]);

  const state = useMemo<ComposerState>(
    () => ({
      controller,
      draft,
      setDraft,
      setShown,
      filled,
      clear,
      sending,
      disabled: off,
      reasonId: disabledReason ? reasonId : undefined,
      send,
      context,
      setContext,
    }),
    [controller, draft, filled, clear, sending, off, disabledReason, reasonId, send, context],
  );

  return (
    <ComposerStateContext value={state}>
      {renderElement(
        "form",
        mergeProps(
          {
            "data-slot": "composer",
            "data-sending": sending ? "" : undefined,
            "data-disabled": off ? "" : undefined,
            noValidate: true,
            className: cn("grid grid-cols-[minmax(0,1fr)_auto] items-end gap-controls", className),
            onSubmit: (event: { preventDefault: () => void; nativeEvent: Event }) => {
              event.preventDefault();
              send(sourceOf(event.nativeEvent));
            },
            children: (
              <>
                {children}
                {disabledReason ? (
                  <p id={reasonId} data-slot="composer-reason" className="col-span-full text-meta text-muted-foreground">
                    {disabledReason}
                  </p>
                ) : null}
              </>
            ),
          },
          defined(props),
        ),
        render,
      )}
    </ComposerStateContext>
  );
}

/**
 * The banner above the field while replying to a message or editing one: an icon, the app's words ("Replying to
 * <b>Ana Ruiz</b>: …", "Editing message"), cut to one line, and a Cancel button. Escape in the field cancels it too.
 */
function ComposerContext({
  kind = "reply",
  onCancel,
  cancelLabel,
  className,
  children,
  render,
  ...props
}: NodeChildren<
  OwnPartProps<"div"> & {
    kind?: ContextKind | undefined;
    /** Ends the reply or edit. The composer empties the field itself when an edit is cancelled. */
    onCancel: () => void;
    /** The Cancel button's name; "Cancel reply" or "Cancel edit" by default. */
    cancelLabel?: string | undefined;
  }
>) {
  const { controller, clear, setContext } = useComposer("ComposerContext");
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setContext({ kind, cancelButton });
    return () => setContext(undefined);
  }, [kind, setContext]);
  const Icon = kind === "edit" ? Pencil : CornerUpLeft;
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "composer-context",
        "data-kind": kind,
        className: cn(
          "col-span-full flex min-w-0 items-center gap-2 rounded-lg bg-muted px-2 py-1 text-meta text-foreground dark:bg-accent",
          className,
        ),
        children: (
          <>
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span data-slot="composer-context-text" className="min-w-0 flex-1 truncate">
              {children}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={cancelLabel ?? (kind === "edit" ? "Cancel edit" : "Cancel reply")}
              ref={cancelButton}
              onClick={() => {
                if (kind === "edit") clear();
                onCancel();
                controller.focus();
              }}
            >
              <X />
            </Button>
          </>
        ),
      },
      defined(props),
    ),
    render,
  );
}

/**
 * The message field: Avenue's Textarea in its chat look. Name it with `aria-label` ("Message Ana Ruiz"). It takes
 * Textarea's props: `value` and `onValueChange` to control the text (an edit puts the message's text in), `maxLength`,
 * `placeholder`.
 */
function ComposerField({
  className,
  onValueChange,
  onKeyDown,
  value,
  defaultValue,
  ...props
}: Omit<Loose<ComponentProps<typeof Textarea>>, "controller" | "autoResize" | "submitShortcut" | "onSubmit">) {
  const { controller, draft, setDraft, setShown, sending, disabled, reasonId, context } = useComposer("ComposerField");
  const text = value ?? draft ?? defaultValue ?? "";
  const controlled = value !== undefined;
  useEffect(() => setShown({ text, controlled }), [text, controlled, setShown]);
  return (
    <Textarea
      rows={1}
      autoResize
      submitShortcut="enter"
      controller={controller}
      readOnly={sending || undefined}
      disabled={disabled || undefined}
      aria-busy={sending || undefined}
      aria-describedby={reasonId}
      value={text}
      onValueChange={(next, details) => {
        if (value === undefined) setDraft(next);
        onValueChange?.(next, details);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== "Escape" || !context) return;
        event.preventDefault();
        event.stopPropagation();
        context.cancelButton.current?.click();
      }}
      className={cn(
        // One line is 32px with a mouse and 44px on a phone; the padding centres a line of the field's own text in it.
        "[--composer-line:--spacing(8)] pointer-coarse:[--composer-line:--spacing(11)]",
        "max-h-28 min-h-(--composer-line) resize-none rounded-xl bg-muted/40 px-3 py-[calc((var(--composer-line)-2px-1lh)/2)] dark:bg-muted/40",
        className,
      )}
      {...defined(props)}
    />
  );
}

const SendGlyph = () => (
  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
    <path d="M3.4 20.4 21 12 3.4 3.6l-.01 6.5L15 12 3.39 13.9z" />
  </svg>
);

/**
 * The Send button: an icon button on primary, "Send", or "Save edit" with a check while an edit banner shows. It is
 * disabled while the field is empty or a send is pending, and stays focusable with the reason read out.
 */
function ComposerSend({
  label,
  className,
  ...props
}: Omit<Loose<ComponentProps<typeof Button>>, "children" | "type" | "disabledReason" | "size" | "variant"> & {
  /** The button's name; "Send", or "Save edit" while editing, by default. */
  label?: string | undefined;
}) {
  const { filled, sending, disabled, context } = useComposer("ComposerSend");
  const reasonId = useId();
  const editing = context?.kind === "edit";
  const reason = disabled ? undefined : sending ? "Sending…" : !filled ? "Type a message first." : undefined;
  return (
    <>
      <Button
        type="submit"
        size="icon-md"
        aria-label={label ?? (editing ? "Save edit" : "Send")}
        disabled={Boolean(disabled || reason)}
        focusableWhenDisabled={!disabled}
        aria-describedby={reason ? reasonId : undefined}
        className={cn("pointer-coarse:size-11", className)}
        {...defined(props)}
      >
        {editing ? <Check /> : <SendGlyph />}
      </Button>
      {reason ? (
        <span id={reasonId} hidden>
          {reason}
        </span>
      ) : null}
    </>
  );
}

export { Composer, ComposerContext, ComposerField, ComposerSend };
