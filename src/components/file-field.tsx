import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import {
  createFileInputController,
  FileInput,
  FileInputDropzone,
  FileInputTrigger,
  type FileInputController,
  type FileInputValueChangeDetails,
  type FileRejection,
} from "@ui-sdk/react/file-input";
import { CircleAlertIcon, FileUpIcon, ImageUpIcon, RotateCwIcon } from "lucide-react";
import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Button, buttonVariants } from "#avenue/components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "#avenue/components/field";
import { InlineMessage, type InlineMessageProps } from "#avenue/components/inline-message";
import { devError } from "#avenue/lib/dev";
import { defined, type Loose, type NodeChildren, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * AVE-35. One field for picking, showing, replacing and removing a photo or a document, with upload progress and
 * failure states. It replaces Management's ImageField (website.tsx at e01cc90) and the documents form's raw
 * <input type="file">, and Neighbors' upload tile can compose its parts.
 *
 * Built on ui-sdk's FileInput: the trigger opens the system picker, the drop zone takes a dropped or pasted file,
 * `accept`/`maxSize` reject files with reasons (`onReject`), and the field's label names the trigger. The upload is the
 * app's job: the field is controlled by `status`, `progress` and `error`, and reports `onFileChange`, `onRemove` and
 * `onRetry`. It never fetches.
 *
 * AVE-148: composed the way ui-sdk composes FileInput. `FileFieldRoot` holds the file and its status, progress and
 * error, and the rules that follow from them (which button shows, what the messages say, where focus goes); its parts
 * read them. FileFieldDropzone draws ui-sdk's FileInput around the row. `FileField` is the one-tag form, built from the parts:
 *
 *   FileFieldRoot
 *   ├── FileFieldLabel
 *   ├── FileFieldDropzone
 *   │   ├── FileFieldPreview
 *   │   ├── FileFieldName
 *   │   ├── FileFieldTrigger
 *   │   ├── FileFieldRemove
 *   │   └── FileFieldRetry
 *   ├── FileFieldReason
 *   ├── FileFieldDescription
 *   ├── FileFieldStatus
 *   ├── FileFieldError
 *   └── FileFieldWarning
 */

export type FileFieldKind = "image" | "document";

/**
 * - empty: nothing chosen.
 * - chosen: a file is picked but not sent yet (a form that uploads on save).
 * - uploading: sending; `progress` (0-100) shows in the button when known.
 * - uploaded: the file is saved.
 * - failed: the upload failed; `error` says what happened and what to do, and Try again calls `onRetry`.
 * - unconfirmed: the upload may have landed but the server never confirmed it; Check again calls `onRetry`.
 */
export type FileFieldStatus = "empty" | "chosen" | "uploading" | "uploaded" | "failed" | "unconfirmed";

/** What the field shows for the current file. A `File` fits. */
export interface FileFieldFile {
  name: string;
  /** A thumbnail, for an image. Null while the image host isn't configured: the field shows the name instead. */
  url?: string | null | undefined;
}

/**
 * The root's props. Any other prop of the Field (a ref, an id, aria-* or data-*) lands on the field's root; its status
 * and invalid state stay Avenue's (AVE-138). The root's data-slot is ui-sdk's, `field`.
 */
export interface FileFieldRootProps
  extends Omit<ComponentProps<typeof Field>, "children" | "invalid" | "onReject" | "className" | "orientation"> {
  kind?: FileFieldKind | undefined;
  /** The buttons' object: "photo", "logo", "file". Defaults to "photo" for an image and "file" for a document. */
  noun?: string | undefined;
  file?: FileFieldFile | null | undefined;
  /** Defaults to "uploaded" with a file and "empty" without one. */
  status?: FileFieldStatus | undefined;
  /** 0-100 while uploading; leave it out when the size of the upload isn't known. */
  progress?: number | undefined;
  /** The failure, for `failed` and `unconfirmed`: what happened and what to do. A default is written from the name. */
  error?: ReactNode;
  /** Why the field can't be used right now. Disables it; FileFieldReason shows it as one muted line. */
  disabledReason?: ReactNode;
  /** Types the picker offers and checks, like `accept`. Defaults to PNG, JPEG and WebP for an image. */
  accept?: string | readonly string[] | undefined;
  /** The largest file accepted, in bytes. Larger files go to `onReject` with `file-too-large`. */
  maxSize?: number | undefined;
  /** On phones, open the camera instead of the files. */
  capture?: ComponentProps<typeof FileInput>["capture"];
  /**
   * A file was chosen, dropped or pasted and passed the checks. ui-sdk's details come second: `details.reason` says
   * how it arrived (`picker`, `drop`, `paste`).
   */
  onFileChange: (file: File, details: FileInputValueChangeDetails) => void;
  /** A chosen file failed `accept`, `maxSize` or `validate`; show why with `status="failed"` and `error`. */
  onReject?: ((rejected: FileRejection[]) => void) | undefined;
  /** Shows Remove when the field holds a file. */
  onRemove?: (() => void) | undefined;
  /** Shows Try again (failed) or Check again (unconfirmed). */
  onRetry?: (() => void) | undefined;
  /** ui-sdk's file input controller, to open the picker or move focus to the trigger from elsewhere. */
  controller?: FileInputController | undefined;
  className?: string | undefined;
  children?: ReactNode;
}

/** What the root shares with its parts. */
type FileFieldState = {
  /** ui-sdk FileInput's props, for FileFieldDropzone. */
  input: ComponentProps<typeof FileInput>;
  controller: FileInputController;
  kind: FileFieldKind;
  noun: string;
  file: FileFieldFile | null;
  status: FileFieldStatus;
  /** 0-100, rounded, or undefined when the size isn't known. */
  percent: number | undefined;
  /** Uploading, or a disabled reason: the buttons say they're unavailable but stay focusable. */
  disabled: boolean;
  /** Only a disabled reason: Try again stays usable while it uploads. */
  blocked: boolean;
  hasFile: boolean;
  /** The name is on screen in the row, so the messages say "this file" (AVE-48). */
  nameShown: boolean;
  /** The file, as the messages name it (AVE-82). */
  subject: ReactNode;
  error: ReactNode;
  disabledReason: ReactNode;
  /** The reason line's id, for the buttons' aria-describedby, when there is a reason. */
  describedBy: string | undefined;
  reasonId: string;
  onRemove: (() => void) | undefined;
  onRetry: (() => void) | undefined;
  /** Runs a button's action and remembers the button, so focus can move to the trigger if it unmounts (AVE-49). */
  press: (action: () => void) => (event: { currentTarget: HTMLElement }) => void;
};

const FileFieldContext = createContext<FileFieldState | null>(null);

/** The root's state for a part. Outside a root, development logs it once and the part draws nothing. */
function useFileField(part: string): FileFieldState | null {
  const state = useContext(FileFieldContext);
  if (!state) devError(`${part} must be inside a FileFieldRoot.`);
  return state;
}

const imageTypes = ["image/png", "image/jpeg", "image/webp"] as const;

/**
 * Holds the file, its status, progress and error, and the field's rules, and shares them with its parts. It draws
 * Avenue's Field (the label, description and error wiring); FileFieldDropzone draws ui-sdk's FileInput.
 */
function FileFieldRoot({
  kind = "document",
  noun = kind === "image" ? "photo" : "file",
  file,
  status = file ? "uploaded" : "empty",
  progress,
  error,
  disabledReason,
  accept = kind === "image" ? imageTypes : undefined,
  maxSize,
  capture,
  onFileChange,
  onReject,
  onRemove,
  onRetry,
  controller: appController,
  className,
  children,
  ...props
}: FileFieldRootProps) {
  const reasonId = useId();
  const [ownController] = useState(createFileInputController);
  const controller = appController ?? ownController;
  const uploading = status === "uploading";
  const blocked = !!disabledReason;
  const disabled = uploading || blocked;
  const hasFile = !!file && status !== "empty";
  const percent = progress === undefined ? undefined : Math.round(Math.min(100, Math.max(0, progress)));
  // When the name is already on screen in the row, the messages don't repeat it: a long name would wrap to several
  // lines on a phone (AVE-48). Under a thumbnail, where the name isn't shown, they still name the file.
  const nameShown = hasFile && (kind === "document" || !file.url);
  // An alert is read on its own, away from the row, so screen readers still hear the name: "this file" is hidden
  // from them and the name is read in its place (AVE-82). With two file fields on a form, the alert says which failed.
  const subject: ReactNode = !file ? null : nameShown ? (
    <>
      <span aria-hidden>this file</span>
      <span className="sr-only">{file.name}</span>
    </>
  ) : (
    file.name
  );

  // Remove, Try again and Check again unmount the button just pressed. Once it's gone, if focus fell to the page,
  // put it on the trigger, which stays mounted and focusable in every state (AVE-49). Waiting for the unmount keeps
  // focus where it is when the press doesn't change the row, and never takes focus from somewhere the person has
  // since moved to. ui-sdk's controller finds the trigger, wherever the app put it among the parts.
  const pressed = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const button = pressed.current;
    if (!button || button.isConnected) return;
    pressed.current = null;
    const active = button.ownerDocument.activeElement;
    if (!active || active === button.ownerDocument.body) controller.focus();
  });

  // A new object each render: `subject` is new JSX each time, so memoising it would never hit.
  // ui-sdk's file input, which FileFieldDropzone draws around the row: it holds the hidden input the trigger opens.
  const input: ComponentProps<typeof FileInput> = {
    // Controlled empty: the app owns the file, and an empty input lets the same file be chosen again after a failure.
    value: [],
    onValueChange: (_value, details) => {
      // The trigger stays enabled while unavailable (see FileFieldTrigger), so a drop or paste is turned away here.
      if (disabled) {
        details.cancel();
        return;
      }
      const [added] = details.added;
      if (added) onFileChange(added, details);
    },
    onReject: (rejected) => {
      if (!disabled) onReject?.(rejected);
    },
    ...(accept === undefined ? {} : { accept }),
    ...(maxSize === undefined ? {} : { maxSize }),
    ...(capture === undefined ? {} : { capture }),
    controller,
    announcement: ({ added }) => (added[0] ? `Chose ${added[0].name}.` : null),
  };
  const state: FileFieldState = {
    input,
    controller,
    kind,
    noun,
    file: file ?? null,
    status,
    percent,
    disabled,
    blocked,
    hasFile,
    nameShown,
    subject,
    error,
    disabledReason,
    describedBy: blocked ? reasonId : undefined,
    reasonId,
    onRemove,
    onRetry,
    press: (action) => (event) => {
      pressed.current = event.currentTarget;
      action();
    },
  };

  return (
    <Field {...props} data-status={status} invalid={status === "failed"} className={cn("gap-2", className)}>
      <FileFieldContext.Provider value={state}>{children}</FileFieldContext.Provider>
    </Field>
  );
}

/** The field's label. It names the trigger, and pressing it opens the picker. */
function FileFieldLabel(props: Loose<ComponentProps<typeof FieldLabel>>) {
  return <FieldLabel {...props} />;
}

/**
 * The row: ui-sdk's drop zone, inside ui-sdk's file input, holding the preview, the name and the buttons. A file dropped on it, or pasted while
 * focus is inside it, goes through the same checks as one from the picker. It isn't a control: the trigger inside it
 * is the one tab stop. While a file is dragged over it, a dashed outline shows whether it would be taken.
 */
function FileFieldDropzone({ className, ...props }: NodeChildren<Loose<ComponentProps<typeof FileInputDropzone>>>) {
  // A ghost action (Remove, Try again, Check again) that wraps to start a line is pulled left by its 8px padding and
  // 1px border, so its icon or text lines up with the name, hint and notes above and below (AVE-83). CSS can't tell when
  // an item starts a line, so the row marks it, measured again whenever the row resizes. The hit area keeps its size.
  const row = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    const mark = () => {
      const actions = [...el.querySelectorAll<HTMLElement>("[data-file-action]")];
      for (const action of actions) action.removeAttribute("data-line-start");
      const start = el.getBoundingClientRect().left;
      for (const action of actions) {
        if (Math.abs(action.getBoundingClientRect().left - start) < 1) action.setAttribute("data-line-start", "");
      }
    };
    mark();
    const observer = new ResizeObserver(mark);
    observer.observe(el);
    return () => observer.disconnect();
  });
  const state = useFileField("FileFieldDropzone");
  const zone = (
    <FileInputDropzone
      {...defined(props)}
      ref={row}
      data-file-field-row=""
      data-unavailable={state?.disabled || undefined}
      className={cn(
        // The invalid Field tints its text; the row's buttons keep their own colours, as the trigger keeps its outline.
        "flex flex-wrap items-center gap-controls rounded-md text-foreground outline-offset-4",
        "not-data-unavailable:data-drag-accept:outline-2 not-data-unavailable:data-drag-accept:outline-ring not-data-unavailable:data-drag-accept:outline-dashed",
        "not-data-unavailable:data-drag-reject:outline-2 not-data-unavailable:data-drag-reject:outline-destructive not-data-unavailable:data-drag-reject:outline-dashed",
        className,
      )}
    />
  );
  if (!state) return zone;
  // The file input holds no space of its own: a contents box around the row and its hidden input, so the Field's
  // children (and the description's nth-last spacing) stay as they were.
  return (
    <FileInput {...state.input} render={<div className="contents" />}>
      {zone}
    </FileInput>
  );
}

/** The image's thumbnail: 40px, md corner, border, muted fill, contained. Decorative; the field's label names it. */
function FileFieldPreview({ src, className, render, ...props }: OwnPartProps<"img">) {
  const state = useContext(FileFieldContext);
  // Inside a root it shows the image's thumbnail, once there is one; given a src, it shows that.
  const shown = src ?? (state?.kind === "image" && state.hasFile ? state.file?.url : undefined);
  if (!shown) {
    if (!state && src === undefined) devError("FileFieldPreview must be inside a FileFieldRoot, or be given a src.");
    return null;
  }
  return renderElement(
    "img",
    mergeProps(
      {
        src: shown,
        alt: "",
        "data-slot": "file-thumbnail",
        className: cn("size-10 shrink-0 rounded-md border bg-muted object-contain", className),
      },
      defined(props),
    ),
    render,
  );
}

/**
 * The file's name, truncated in the middle so the extension stays visible. Inside a root it shows the file's name
 * when the row has no thumbnail; given a `name`, it shows that.
 */
/** FileFieldName's props: a span's, and `render`, which it hands to the middle-cut name it draws. */
type FileFieldNameProps = Omit<OwnPartProps<"span">, "children"> & { name?: string | undefined };

function FileFieldName({ name, className, render, ...props }: FileFieldNameProps) {
  const state = useContext(FileFieldContext);
  if (name !== undefined) return <MiddleCutName name={name} className={className} render={render} {...props} />;
  if (!state) {
    devError("FileFieldName must be inside a FileFieldRoot, or be given a name.");
    return null;
  }
  if (!state.nameShown || !state.file) return null;
  return (
    <MiddleCutName
      name={state.file.name}
      className={cn("max-w-full min-w-0 basis-full text-sm sm:basis-auto", className)}
      render={render}
      {...props}
    />
  );
}

/**
 * Opens the picker: "Choose photo", "Replace photo", or "Uploading 42%" while it sends. The field's label and its text
 * name it. Unavailable while uploading or with a disabled reason, but still focusable, so focus isn't dropped mid-upload
 * and keyboard users hear why.
 */
function FileFieldTrigger({
  className,
  children,
  onClick,
  ...props
}: NodeChildren<Loose<ComponentProps<typeof FileInputTrigger>>>) {
  const state = useFileField("FileFieldTrigger");
  const Icon = state?.kind === "image" ? ImageUpIcon : FileUpIcon;
  const disabled = !!state?.disabled;
  return (
    <FileInputTrigger
      {...defined(props)}
      // Through the root's controller, so the trigger works wherever it sits among the parts, in the row or not.
      {...(state ? { controller: state.controller } : {})}
      // ui-sdk's trigger has no focusableWhenDisabled (still so in beta.13), and disabling it mid-upload drops focus on
      // the page, so it stays enabled, says it's unavailable with aria-disabled, and cancels its own press.
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:active:translate-y-0",
        className,
      )}
      aria-disabled={disabled || undefined}
      aria-describedby={cn(state?.describedBy, props["aria-describedby"]) || undefined}
      onClick={(event) => {
        if (disabled) event.preventDefault();
        else onClick?.(event);
      }}
    >
      {children ??
        (state ? (
          <>
            <Icon aria-hidden data-icon="inline-start" />
            {state.status === "uploading"
              ? state.percent === undefined
                ? "Uploading…"
                : `Uploading ${state.percent}%`
              : state.hasFile
                ? `Replace ${state.noun}`
                : `Choose ${state.noun}`}
          </>
        ) : null)}
    </FileInputTrigger>
  );
}

type ActionProps = Omit<Loose<ComponentProps<typeof Button>>, "disabledReason">;

/**
 * Removes the file: shows while the field holds one and the root has `onRemove`. Named for the file, and asks an
 * agent to confirm. When it unmounts, focus moves to the trigger (AVE-49).
 */
function FileFieldRemove({ className, children, onClick, ...props }: ActionProps) {
  const state = useFileField("FileFieldRemove");
  if (!state?.hasFile || !state.file || !state.onRemove) return null;
  const { file, onRemove } = state;
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`Remove ${file.name}`}
      data-agent-confirm={`Removes ${file.name}`}
      {...props}
      disabled={state.disabled}
      focusableWhenDisabled
      aria-describedby={cn(state.describedBy, props["aria-describedby"]) || undefined}
      data-file-action
      className={cn("data-line-start:-ms-[calc(--spacing(2)+1px)]", className)}
      onClick={(...args) => {
        onClick?.(...args);
        state.press(onRemove)(args[0]);
      }}
    >
      {children ?? "Remove"}
    </Button>
  );
}

/**
 * Try again (failed) or Check again (unconfirmed): shows in those states when the root has `onRetry`. When it
 * unmounts, focus moves to the trigger (AVE-49).
 */
function FileFieldRetry({ className, children, onClick, ...props }: ActionProps) {
  const state = useFileField("FileFieldRetry");
  if (!state?.onRetry || (state.status !== "failed" && state.status !== "unconfirmed")) return null;
  const { onRetry } = state;
  return (
    <Button
      variant="ghost"
      size="sm"
      {...props}
      disabled={state.blocked}
      focusableWhenDisabled
      aria-describedby={cn(state.describedBy, props["aria-describedby"]) || undefined}
      data-file-action
      className={cn("data-line-start:-ms-[calc(--spacing(2)+1px)]", className)}
      onClick={(...args) => {
        onClick?.(...args);
        state.press(onRetry)(args[0]);
      }}
    >
      {children ?? (
        <>
          <RotateCwIcon aria-hidden data-icon="inline-start" />
          {state.status === "failed" ? "Try again" : "Check again"}
        </>
      )}
    </Button>
  );
}

/** Why the field can't be used: the root's `disabledReason`, as one muted line. The buttons are described by it. */
function FileFieldReason({ className, children, render, ...props }: OwnPartProps<"p">) {
  const state = useFileField("FileFieldReason");
  if (!state?.disabledReason) return null;
  return renderElement(
    "p",
    mergeProps(
      {
        id: state.reasonId,
        "data-slot": "file-field-reason",
        className: cn("text-meta text-muted-foreground", className),
        children: children ?? state.disabledReason,
      },
      // The buttons point at this id, so it stays the root's.
      defined({ ...props, id: undefined }),
    ),
    render,
  );
}

/** One muted line under the row: types and size limit. Describes the trigger. */
function FileFieldDescription({ className, ...props }: Loose<ComponentProps<typeof FieldDescription>>) {
  return <FieldDescription {...props} className={cn("text-meta", className)} />;
}

/**
 * Announces upload progress politely ("Uploading, 50 percent"), in quarter steps so a screen reader isn't read every
 * percent, and "Uploaded" when it lands. The region stays mounted so the next message is read. Inside a root it reads
 * the root's status; given `status` (and `progress`), it announces those.
 */
function FileFieldStatus({
  status: own,
  progress: ownProgress,
  className,
  render,
  ...props
}: Omit<OwnPartProps<"output">, "children"> & {
  status?: FileFieldStatus | undefined;
  progress?: number | undefined;
}) {
  const root = useContext(FileFieldContext);
  if (!root && own === undefined) devError("FileFieldStatus must be inside a FileFieldRoot, or be given a status.");
  const status = own ?? root?.status ?? "empty";
  const progress = own === undefined ? root?.percent : ownProgress;
  const [current, setCurrent] = useState(status);
  const [previous, setPrevious] = useState<FileFieldStatus>();
  if (current !== status) {
    setPrevious(current);
    setCurrent(status);
  }
  const message =
    status === "uploading"
      ? progress === undefined
        ? "Uploading"
        : `Uploading, ${Math.floor(progress / 25) * 25} percent`
      : status === "uploaded" && previous === "uploading"
        ? "Uploaded"
        : "";
  return renderElement(
    "output",
    mergeProps(
      {
        "data-slot": "file-field-status",
        "aria-live": "polite",
        className: cn("sr-only", className),
        children: message,
      },
      defined(props),
    ),
    render,
  );
}

/**
 * The failure, as the field's error (an alert, and the trigger is invalid): the root's `error`, or a default that names
 * the file to screen readers even where the screen says "this file" (AVE-82). Always mounted, empty until it fails.
 */
function FileFieldError({ children, ...props }: NodeChildren<Loose<ComponentProps<typeof FieldError>>>) {
  const state = useFileField("FileFieldError");
  const failure =
    state?.status === "failed"
      ? (children ??
        state.error ??
        (state.file ? (
          <>Couldn't upload {state.subject}. Check your connection and try again.</>
        ) : (
          "Couldn't upload the file. Try again."
        )))
      : undefined;
  return (
    <FieldError {...props}>
      {failure ? (
        // The icon, 4px, then the text, indented under it, like the unconfirmed row: colour never carries the state
        // alone (AVE-48). The icon box is one line tall, so it sits on the first line at either type scale.
        <span className="flex items-start gap-1">
          <span className="flex h-lh shrink-0 items-center">
            <CircleAlertIcon aria-hidden className="size-4" />
          </span>
          <span className="min-w-0">{failure}</span>
        </span>
      ) : null}
    </FieldError>
  );
}

/**
 * The upload may have landed but the server never confirmed it: a warning note, shown only while `unconfirmed`. The
 * root's `error`, or a default that names the file to screen readers (AVE-82).
 */
function FileFieldWarning({ children, ...props }: Omit<InlineMessageProps, "tone" | "children"> & { children?: ReactNode }) {
  const state = useFileField("FileFieldWarning");
  if (state?.status !== "unconfirmed") return null;
  return (
    <InlineMessage {...props} tone="warning">
      {children ??
        state.error ?? (
          <>Couldn't confirm {state.file ? state.subject : "the file"} was saved. Check again before choosing it a second time.</>
        )}
    </InlineMessage>
  );
}

/** The one-tag form: today's props, built from the parts. */
export interface FileFieldProps extends Omit<FileFieldRootProps, "children"> {
  label: ReactNode;
  /** One muted line under the row: types and size limit. */
  hint?: ReactNode;
}

function FileField({ label, hint, ...props }: FileFieldProps) {
  return (
    <FileFieldRoot {...props}>
      <FileFieldLabel>{label}</FileFieldLabel>
      <FileFieldDropzone>
        <FileFieldPreview />
        <FileFieldName />
        <FileFieldTrigger />
        <FileFieldRemove />
        <FileFieldRetry />
      </FileFieldDropzone>
      <FileFieldReason />
      {hint ? <FileFieldDescription>{hint}</FileFieldDescription> : null}
      <FileFieldStatus />
      <FileFieldError />
      <FileFieldWarning />
    </FileFieldRoot>
  );
}

/**
 * A file name that truncates in the middle, so the extension stays visible ("sunnydale-annual-meeti…-rules.pdf" reads
 * as a PDF). The head is cut to whole characters that fit and joined to its ellipsis and the tail with no gap: a
 * CSS ellipsis leaves the unused part of the last character's width as a visible gap before the tail (AVE-48).
 * Screen readers read the whole name; the cut copy is hidden from them.
 */
function MiddleCutName({ name, className, render, ...props }: Omit<OwnPartProps<"span">, "children"> & { name: string }) {
  const dot = name.lastIndexOf(".");
  const tailLength = Math.min(name.length - (dot > 0 ? dot : name.length) + 6, name.length);
  const head = name.slice(0, name.length - tailLength);
  const tail = name.slice(name.length - tailLength);
  const headRef = useRef<HTMLSpanElement>(null);
  // How many characters of the head fit; null shows it all.
  const [fit, setFit] = useState<number | null>(null);
  useLayoutEffect(() => {
    const headEl = headRef.current;
    const box = headEl?.parentElement?.parentElement;
    const row = box?.parentElement;
    if (!headEl || !box || !row) return;
    const measure = () => {
      const context = document.createElement("canvas").getContext("2d");
      if (!context) return;
      const style = getComputedStyle(headEl);
      // Built from the longhands: Chromium leaves the `font` shorthand empty when it can't serialise it.
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      context.letterSpacing = style.letterSpacing;
      const width = (text: string) => context.measureText(text).width;
      const rowStyle = getComputedStyle(row);
      const room =
        row.clientWidth - Number.parseFloat(rowStyle.paddingLeft) - Number.parseFloat(rowStyle.paddingRight) - width(tail);
      if (width(head) <= room) {
        setFit(null);
        return;
      }
      let low = 0;
      let high = head.length;
      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        if (width(`${head.slice(0, mid)}…`) <= room) low = mid;
        else high = mid - 1;
      }
      setFit(low);
    };
    measure();
    // Measure again once the web font has loaded: until then the canvas measures the fallback font.
    let live = true;
    void document.fonts?.ready.then(() => live && measure());
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => {
      live = false;
      observer.disconnect();
    };
  }, [head, tail]);
  return renderElement(
    "span",
    mergeProps(
      {
        "data-slot": "file-name",
        title: name,
        className: cn("flex min-w-0 whitespace-nowrap", className),
        children: (
          <>
            <span className="sr-only">{name}</span>
            <span aria-hidden className="flex min-w-0">
              {/* truncate stays as the fallback before the first measure. */}
              <span ref={headRef} className="truncate">
                {fit === null ? head : `${head.slice(0, fit)}…`}
              </span>
              <span className="shrink-0">{tail}</span>
            </span>
          </>
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** @deprecated Use FileFieldName (AVE-148). Given a `name`, it draws the same middle-cut name. */
const FileName = FileFieldName;
/** @deprecated Use FileFieldPreview (AVE-148). Given a `src`, it draws the same thumbnail. */
const FileThumbnail = FileFieldPreview;
/** @deprecated Use FileFieldStatus (AVE-148). Given a `status`, it announces it the same way. */
const UploadStatus = FileFieldStatus;

export {
  FileField,
  FileFieldDescription,
  FileFieldDropzone,
  FileFieldError,
  FileFieldLabel,
  FileFieldName,
  FileFieldPreview,
  FileFieldReason,
  FileFieldRemove,
  FileFieldRetry,
  FileFieldRoot,
  FileFieldStatus,
  FileFieldTrigger,
  FileFieldWarning,
  FileName,
  FileThumbnail,
  UploadStatus,
};
