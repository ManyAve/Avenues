import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import * as DialogPrimitive from "@ui-sdk/react/dialog";
import { XIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "#avenue/components/button";
import { modalCloseButton, modalDescription, modalSurface, modalTitle } from "#avenue/lib/popup";
import { cn } from "#avenue/lib/utils";
import { defined, type Loose, type NodeChildren, type OwnPartProps } from "#avenue/lib/props";

/**
 * Ported from the app's app/ui/components/ui/dialog.tsx (e01cc90). xl corner (14px) and 16px inset as in the app.
 *
 * ui-sdk's modal dialog: the page behind is inert and focus is trapped. On open, focus goes to the first focusable
 * element in the content, so put the first field first, or, in a confirmation, the safe button (Cancel) before the
 * risky one. Pass `initialFocus` to DialogContent to choose another. On close, focus returns to the trigger. Esc closes unless the dialog passes
 * `closeOnEscape={false}` (for a step that must finish, like a payment being sent).
 *
 * The close button moves from 8px to 16px from the corner and shrinks from 28 to 24px, so it sits outside the
 * 14px corner's curve (AVE-2 section 4) and centres on the title's line; its hit area stays 40px with a mouse
 * and is 44px on phones (the shared `hit-area`). It has no neighbour, so it stays 24px on phones where other xs controls
 * become 28px.
 */
function Dialog({
  closeOnEscape = true,
  onOpenChange,
  ...props
}: Loose<ComponentProps<typeof DialogPrimitive.Dialog>> & { closeOnEscape?: boolean | undefined }) {
  return (
    <DialogPrimitive.Dialog
      onOpenChange={(open, details) => {
        if (!open && !closeOnEscape && details.reason === "escape-key") {
          details.cancel();
          return;
        }
        onOpenChange?.(open, details);
      }}
      {...defined(props)}
    />
  );
}

function DialogTrigger(props: Loose<ComponentProps<typeof DialogPrimitive.DialogTrigger>>) {
  return <DialogPrimitive.DialogTrigger data-slot="dialog-trigger" {...defined(props)} />;
}

function DialogClose(props: Loose<ComponentProps<typeof DialogPrimitive.DialogClose>>) {
  return <DialogPrimitive.DialogClose data-slot="dialog-close" {...defined(props)} />;
}

function DialogOverlay({ className, ...props }: Loose<ComponentProps<typeof DialogPrimitive.DialogBackdrop>>) {
  return (
    <DialogPrimitive.DialogBackdrop
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 transition-opacity duration-100 supports-backdrop-filter:backdrop-blur-xs data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none",
        className,
      )}
      {...defined(props)}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: NodeChildren<Loose<ComponentProps<typeof DialogPrimitive.DialogContent>>> & { showCloseButton?: boolean | undefined }) {
  return (
    <>
      <DialogOverlay />
      <DialogPrimitive.DialogContent
        data-slot="dialog-content"
        className={cn(
          modalSurface,
          "fixed top-1/2 right-auto bottom-auto left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl m-0 transition-[opacity,scale] duration-100 backdrop:bg-transparent sm:max-w-sm data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 motion-reduce:transition-none",
          className,
        )}
        {...defined(props)}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.DialogClose
            data-slot="dialog-close"
            render={
              <Button variant="ghost" size="icon-xs" className={modalCloseButton} />
            }
          >
            <XIcon aria-hidden />
            <span className="sr-only">Close</span>
          </DialogPrimitive.DialogClose>
        )}
      </DialogPrimitive.DialogContent>
    </>
  );
}

/** Title and description. Leaves room on the right for the close button. */
function DialogHeader({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "dialog-header",
        className: cn("flex flex-col gap-2 pe-8", className),
      },
      defined(props),
    ),
    render,
  );
}

/** Actions, on a muted strip. Put Cancel first: it is then the safe default focus and sits on the left. */
function DialogFooter({
  className,
  showCloseButton = false,
  children,
  render,
  ...props
}: OwnPartProps<"div"> & { showCloseButton?: boolean | undefined }) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "dialog-footer",
        className: cn(
          "-mx-inset -mb-inset flex flex-col-reverse gap-controls rounded-b-xl border-t bg-muted/50 p-inset sm:flex-row sm:justify-end",
          className,
        ),
        children: (
          <>
            {showCloseButton && <DialogPrimitive.DialogClose render={<Button variant="outline" />}>Close</DialogPrimitive.DialogClose>}
            {children}
          </>
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** Line height is the close button's 24px, so the title and the button share a centre line. */
function DialogTitle({ className, ...props }: Loose<ComponentProps<typeof DialogPrimitive.DialogTitle>>) {
  return (
    <DialogPrimitive.DialogTitle
      data-slot="dialog-title"
      className={cn(modalTitle, className)}
      {...defined(props)}
    />
  );
}

function DialogDescription({ className, ...props }: Loose<ComponentProps<typeof DialogPrimitive.DialogDescription>>) {
  return (
    <DialogPrimitive.DialogDescription
      data-slot="dialog-description"
      className={cn(modalDescription, className)}
      {...defined(props)}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
};
