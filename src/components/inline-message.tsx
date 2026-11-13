import { CircleAlertIcon, InfoIcon, LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "#avenue/lib/utils";

export type InlineMessageTone = "error" | "warning" | "info" | "pending";

const tones = {
  error: { role: "alert", Icon: CircleAlertIcon, text: "text-destructive-subtle-foreground", spin: false },
  warning: { role: "status", Icon: TriangleAlertIcon, text: "text-warning-subtle-foreground", spin: false },
  info: { role: "status", Icon: InfoIcon, text: "text-muted-foreground", spin: false },
  pending: { role: "status", Icon: LoaderCircleIcon, text: "text-muted-foreground", spin: true },
} as const;

export interface InlineMessageProps {
  /**
   * error is announced at once (role="alert"): something failed and needs attention. warning, info and pending are
   * announced politely (role="status") when the reader is free.
   */
  tone?: InlineMessageTone | undefined;
  /**
   * The message. Empty (null, false, "") keeps the region mounted and in the accessibility tree, visually hidden
   * (sr-only, not display:none), so the next message's polite announcement is still read.
   */
  children?: ReactNode;
  /** Hides the leading icon, for a message under a field where the field's own invalid ring already signals it. */
  hideIcon?: boolean | undefined;
  id?: string | undefined;
  className?: string | undefined;
}

/**
 * A one-line message beside the thing it is about: a form error, "Saving…", a warning under a field. It replaces the
 * app's hand-built role="alert" paragraphs.
 *
 * Screen readers announce a live region when its content changes, so the region element stays mounted (even when
 * empty) and only its text changes. A re-render with the same text changes nothing in the DOM and is not announced
 * again; a new message is announced once. Keep the same InlineMessage mounted and change its children, rather than
 * mounting a new one per message. Changing tone changes the role, which some readers treat as a new region.
 *
 * The text is the body's size, `text-compact` (16px web, 14px desktop), the app's error text and the size AVE-46 gave
 * the confirm dialog's warning (AVE-72): a message about a failure shouldn't be the smallest text on the screen. The
 * icon stays, unlike the app's, so colour never carries the state alone (WCAG 1.4.1, as AVE-48).
 */
export function InlineMessage({ tone = "error", children, hideIcon, id, className }: InlineMessageProps) {
  const { role, Icon, text, spin } = tones[tone];
  const empty = children === null || children === undefined || children === false || children === "";
  return (
    <div
      id={id}
      role={role}
      aria-atomic="true"
      data-slot="inline-message"
      data-tone={tone}
      data-empty={empty || undefined}
      className={cn("flex items-start gap-1 text-compact data-empty:sr-only", text, className)}
    >
      {!empty && (
        <>
          {!hideIcon && (
            // One line tall, so the icon sits on the first line at either type scale.
            <span className="flex h-lh shrink-0 items-center">
              <Icon aria-hidden className={cn("size-4", spin && "animate-spin motion-reduce:animate-none")} />
            </span>
          )}
          <span className="min-w-0">{children}</span>
        </>
      )}
    </div>
  );
}
