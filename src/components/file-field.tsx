import {
  FileInput,
  FileInputTrigger,
  type FileInputController,
  type FileRejection,
} from "@ui-sdk/react/file-input";
import { FileUpIcon, ImageUpIcon, RotateCwIcon } from "lucide-react";
import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Button, buttonVariants } from "#avenue/components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "#avenue/components/field";
import { InlineMessage } from "#avenue/components/inline-message";
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
  const failure =
    status === "failed"
      ? (error ?? (file ? `Couldn't upload ${file.name}. Check your connection and try again.` : "Couldn't upload the file. Try again."))
      : undefined;
  const unconfirmed =
    status === "unconfirmed"
      ? (error ??
        `Couldn't confirm ${file?.name ?? "the file"} was saved. Check again before choosing it a second time.`)
      : undefined;
  const describedBy = disabledReason ? reasonId : undefined;

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
        render={<div data-slot="file-field-row" className="flex flex-wrap items-center gap-2" />}
      >
        {kind === "image" && hasFile && file.url ? <FileThumbnail src={file.url} /> : null}
        {hasFile && (kind === "document" || !file.url) ? (
          <FileName name={file.name} className="max-w-full min-w-0 basis-full text-sm sm:basis-auto" />
        ) : null}
        <FileInputTrigger
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
            onClick={onRemove}
          >
            Remove
          </Button>
        ) : null}
        {onRetry && (status === "failed" || status === "unconfirmed") ? (
          <Button variant="ghost" size="sm" disabled={!!disabledReason} focusableWhenDisabled onClick={onRetry}>
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
      <FieldError>{failure}</FieldError>
      {status === "unconfirmed" ? <InlineMessage tone="warning">{unconfirmed}</InlineMessage> : null}
    </Field>
  );
}

/** The image's thumbnail: 40px, md corner, border, muted fill, contained. Decorative; the field's label names it. */
function FileThumbnail({ src, className, ...props }: ComponentProps<"img">) {
  return (
    <img
      src={src}
      alt=""
      data-slot="file-thumbnail"
      className={cn("size-10 shrink-0 rounded-md border bg-muted object-contain", className)}
      {...props}
    />
  );
}

/**
 * A file name that truncates in the middle, so the extension stays visible ("sunnydale-annual-…-rules.pdf" reads as
 * a PDF). Screen readers still read the whole name.
 */
function FileName({ name, className, ...props }: ComponentProps<"span"> & { name: string }) {
  const dot = name.lastIndexOf(".");
  const tailLength = Math.min(name.length - (dot > 0 ? dot : name.length) + 6, name.length);
  const head = name.slice(0, name.length - tailLength);
  const tail = name.slice(name.length - tailLength);
  return (
    <span data-slot="file-name" title={name} className={cn("flex min-w-0 whitespace-nowrap", className)} {...props}>
      <span className="truncate">{head}</span>
      <span className="shrink-0">{tail}</span>
    </span>
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
