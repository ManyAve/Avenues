import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import {
  FileInput,
  FileInputTrigger,
  type FileInputController,
  type FileRejection,
} from "@ui-sdk/react/file-input";
import { CircleAlertIcon, FileUpIcon, ImageUpIcon, RotateCwIcon } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Button, buttonVariants } from "#avenue/components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "#avenue/components/field";
import { InlineMessage } from "#avenue/components/inline-message";
import { defined, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/**
 * AVE-35. One field for picking, showing, replacing and removing a photo or a document, with upload progress and
 * failure states. It replaces Management's ImageField (website.tsx at e01cc90) and the documents form's raw
 * <input type="file">, and Neighbors' upload tile can compose its parts.
 *
 * Built on ui-sdk's FileInput: the trigger opens the system picker, `accept`/`maxSize` reject files with reasons
 * (`onReject`), and the field's label names the trigger. The upload is the app's job: FileField is controlled by
 * `status`, `progress` and `error`, and reports `onFileChange`, `onRemove` and `onRetry`. It never fetches.
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

export interface FileFieldProps {
  label: ReactNode;
  kind?: FileFieldKind | undefined;
  /** The buttons' object: "photo", "logo", "file". Defaults to "photo" for an image and "file" for a document. */
  noun?: string | undefined;
  /** One muted line under the row: types and size limit. */
  hint?: ReactNode;
  file?: FileFieldFile | null | undefined;
  /** Defaults to "uploaded" with a file and "empty" without one. */
  status?: FileFieldStatus | undefined;
  /** 0-100 while uploading; leave it out when the size of the upload isn't known. */
  progress?: number | undefined;
  /** The failure, for `failed` and `unconfirmed`: what happened and what to do. A default is written from the name. */
  error?: ReactNode;
  /** Why the field can't be used right now. Disables it and shows the reason as one muted line under the row. */
  disabledReason?: ReactNode;
  /** Types the picker offers and checks, like `accept`. Defaults to PNG, JPEG and WebP for an image. */
  accept?: string | readonly string[] | undefined;
  /** The largest file accepted, in bytes. Larger files go to `onReject` with `file-too-large`. */
  maxSize?: number | undefined;
  /** On phones, open the camera instead of the files. */
  capture?: ComponentProps<typeof FileInput>["capture"];
  /** A file was chosen and passed the checks. */
  onFileChange: (file: File) => void;
  /** A chosen file failed `accept`, `maxSize` or `validate`; show why with `status="failed"` and `error`. */
  onReject?: ((rejected: FileRejection[]) => void) | undefined;
  /** Shows Remove when the field holds a file. */
  onRemove?: (() => void) | undefined;
  /** Shows Try again (failed) or Check again (unconfirmed). */
  onRetry?: (() => void) | undefined;
  controller?: FileInputController | undefined;
  className?: string | undefined;
}

const imageTypes = ["image/png", "image/jpeg", "image/webp"] as const;

function FileField({
  label,
  kind = "document",
  noun = kind === "image" ? "photo" : "file",
  hint,
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
  controller,
  className,
}: FileFieldProps) {
  const reasonId = useId();
  const uploading = status === "uploading";
  const disabled = uploading || !!disabledReason;
  const hasFile = !!file && status !== "empty";
  const Icon = kind === "image" ? ImageUpIcon : FileUpIcon;
  const percent = progress === undefined ? undefined : Math.round(Math.min(100, Math.max(0, progress)));
  // When the name is already on screen above the row, the messages don't repeat it: a long name would wrap to
  // several lines on a phone (AVE-48). Under a thumbnail, where the name isn't shown, they still name the file.
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
  const failure =
    status === "failed"
      ? (error ??
        (file ? (
          <>Couldn't upload {subject}. Check your connection and try again.</>
        ) : (
          "Couldn't upload the file. Try again."
        )))
      : undefined;
  const unconfirmed =
    status === "unconfirmed"
      ? (error ?? <>Couldn't confirm {file ? subject : "the file"} was saved. Check again before choosing it a second time.</>)
      : undefined;
  const describedBy = disabledReason ? reasonId : undefined;

  // Remove, Try again and Check again unmount the button just pressed. Once it's gone, if focus fell to the page,
  // put it on the trigger, which stays mounted and focusable in every state (AVE-49). Waiting for the unmount
  // keeps focus where it is when the press doesn't change the row, and never takes focus from somewhere the person
  // has since moved to.
  const trigger = useRef<HTMLButtonElement>(null);
  const pressed = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const button = pressed.current;
    if (!button || button.isConnected) return;
    pressed.current = null;
    const active = button.ownerDocument.activeElement;
    if (!active || active === button.ownerDocument.body) trigger.current?.focus();
  });
  // A ghost action (Remove, Try again, Check again) that wraps to start a line is pulled left by its 8px padding and 1px border,
  // so its icon or text lines up with the name, hint and notes above and below (AVE-83). CSS can't tell when an item
  // starts a line, so the row marks it, measured again whenever the row resizes. The hit area keeps its size.
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
  const press = (action: () => void) => (event: { currentTarget: HTMLElement }) => {
    pressed.current = event.currentTarget;
    action();
  };

  return (
    <Field data-slot="file-field" data-status={status} invalid={status === "failed"} className={cn("gap-2", className)}>
      <FieldLabel>{label}</FieldLabel>
      <FileInput
        // Controlled empty: the app owns the file, and an empty input lets the same file be chosen again after a failure.
        value={[]}
        onValueChange={(_value, details) => {
          const [added] = details.added;
          if (added) onFileChange(added);
        }}
        onReject={(rejected) => onReject?.(rejected)}
        {...(accept === undefined ? {} : { accept })}
        {...(maxSize === undefined ? {} : { maxSize })}
        {...(capture === undefined ? {} : { capture })}
        {...(controller === undefined ? {} : { controller })}
        announcement={({ added }) => (added[0] ? `Chose ${added[0].name}.` : null)}
        // The invalid Field tints its text; the row's buttons keep their own colours, as the trigger keeps its outline.
        render={
          <div ref={row} data-slot="file-field-row" className="flex flex-wrap items-center gap-controls text-foreground" />
        }
      >
        {kind === "image" && hasFile && file.url ? <FileThumbnail src={file.url} /> : null}
        {nameShown ? (
          <FileName name={file.name} className="max-w-full min-w-0 basis-full text-sm sm:basis-auto" />
        ) : null}
        <FileInputTrigger
          ref={trigger}
          // The trigger has no focusableWhenDisabled, and disabling it mid-upload drops focus on the page, so it stays
          // enabled, says it's unavailable with aria-disabled, and cancels its own press.
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:active:translate-y-0",
          )}
          aria-disabled={disabled || undefined}
          aria-describedby={describedBy}
          onClick={disabled ? (event) => event.preventDefault() : undefined}
        >
          <Icon aria-hidden data-icon="inline-start" />
          {uploading
            ? percent === undefined
              ? "Uploading…"
              : `Uploading ${percent}%`
            : hasFile
              ? `Replace ${noun}`
              : `Choose ${noun}`}
        </FileInputTrigger>
        {hasFile && onRemove ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            focusableWhenDisabled
            aria-label={`Remove ${file.name}`}
            aria-describedby={describedBy}
            data-agent-confirm={`Removes ${file.name}`}
            data-file-action
            className="data-line-start:-ms-[calc(--spacing(2)+1px)]"
            onClick={press(onRemove)}
          >
            Remove
          </Button>
        ) : null}
        {onRetry && (status === "failed" || status === "unconfirmed") ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={!!disabledReason}
            focusableWhenDisabled
            aria-describedby={describedBy}
            data-file-action
            className="data-line-start:-ms-[calc(--spacing(2)+1px)]"
            onClick={press(onRetry)}
          >
            <RotateCwIcon aria-hidden data-icon="inline-start" />
            {status === "failed" ? "Try again" : "Check again"}
          </Button>
        ) : null}
      </FileInput>
      {disabledReason ? (
        <p id={reasonId} data-slot="file-field-reason" className="text-meta text-muted-foreground">
          {disabledReason}
        </p>
      ) : null}
      {hint ? <FieldDescription className="text-meta">{hint}</FieldDescription> : null}
      <UploadStatus status={status} progress={percent} />
      <FieldError>
        {failure ? (
          // The icon, 4px, then the text, indented under it, like the unconfirmed row: colour never carries the
          // state alone (AVE-48). The icon box is one line tall, so it sits on the first line at either type scale.
          <span className="flex items-start gap-1">
            <span className="flex h-lh shrink-0 items-center">
              <CircleAlertIcon aria-hidden className="size-4" />
            </span>
            <span className="min-w-0">{failure}</span>
          </span>
        ) : null}
      </FieldError>
      {status === "unconfirmed" ? <InlineMessage tone="warning">{unconfirmed}</InlineMessage> : null}
    </Field>
  );
}

/** The image's thumbnail: 40px, md corner, border, muted fill, contained. Decorative; the field's label names it. */
function FileThumbnail({ src, className, render, ...props }: OwnPartProps<"img">) {
  return renderElement(
    "img",
    mergeProps(
      {
        src,
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
 * A file name that truncates in the middle, so the extension stays visible ("sunnydale-annual-meeti…-rules.pdf" reads
 * as a PDF). The head is cut to whole characters that fit and joined to its ellipsis and the tail with no gap: a
 * CSS ellipsis leaves the unused part of the last character's width as a visible gap before the tail (AVE-48).
 * Screen readers read the whole name; the cut copy is hidden from them.
 */
function FileName({ name, className, render, ...props }: OwnPartProps<"span"> & { name: string }) {
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

/**
 * Announces upload progress politely ("Uploading, 50 percent"), in quarter steps so a screen reader isn't read every
 * percent, and "Uploaded" when it lands. The region stays mounted so the next message is read.
 */
function UploadStatus({ status, progress }: { status: FileFieldStatus; progress?: number | undefined }) {
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
  return (
    <output data-slot="file-field-status" aria-live="polite" className="sr-only">
      {message}
    </output>
  );
}

export { FileField, FileName, FileThumbnail, UploadStatus };
