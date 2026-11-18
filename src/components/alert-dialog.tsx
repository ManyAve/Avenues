import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import * as AlertDialogPrimitive from "@ui-sdk/react/alert-dialog";
import type { ComponentProps } from "react";
import { modalDescription, modalSurface, modalTitle } from "#avenue/lib/popup";
import { cn } from "#avenue/lib/utils";
import { defined, type Loose, type NodeChildren, type OwnPartProps } from "#avenue/lib/props";

/**
 * A question that must be answered before anything else happens ("Discard changes?", "Remove household?").
 * ui-sdk's alert dialog: role alertdialog, always modal, an outside press never closes it, Esc closes it and
 * returns focus. Looks like Avenue's Dialog (xl corner, 16px inset, muted footer strip) without a close button,
 * because each answer is a button in the footer. Put the safe answer first: it is then where focus starts.
 */
function AlertDialog(props: Loose<ComponentProps<typeof AlertDialogPrimitive.AlertDialog>>) {
  return <AlertDialogPrimitive.AlertDialog {...defined(props)} />;
}

function AlertDialogTrigger(props: Loose<ComponentProps<typeof AlertDialogPrimitive.AlertDialogTrigger>>) {
  return <AlertDialogPrimitive.AlertDialogTrigger {...defined(props)} />;
}

function AlertDialogClose(props: Loose<ComponentProps<typeof AlertDialogPrimitive.AlertDialogClose>>) {
  return <AlertDialogPrimitive.AlertDialogClose {...defined(props)} />;
}

function AlertDialogContent({
  className,
  children,
  ...props
}: NodeChildren<Loose<ComponentProps<typeof AlertDialogPrimitive.AlertDialogContent>>>) {
  return (
    <>
      <AlertDialogPrimitive.AlertDialogBackdrop className="fixed inset-0 isolate z-50 bg-black/10 transition-opacity duration-100 supports-backdrop-filter:backdrop-blur-xs data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none" />
      <AlertDialogPrimitive.AlertDialogContent
        className={cn(
          modalSurface,
          "fixed top-1/2 right-auto bottom-auto left-1/2 z-50 m-0 grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl transition-[opacity,scale] duration-100 backdrop:bg-transparent sm:max-w-sm data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 motion-reduce:transition-none",
          className,
        )}
        {...defined(props)}
      >
        {children}
      </AlertDialogPrimitive.AlertDialogContent>
    </>
  );
}

function AlertDialogHeader({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "alert-dialog-header",
        className: cn("flex flex-col gap-2", className),
      },
      defined(props),
    ),
    render,
  );
}

/** The answers, on the same muted strip as Dialog's footer. Safe answer first. */
function AlertDialogFooter({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "alert-dialog-footer",
        className: cn(
          "-mx-inset -mb-inset flex flex-col-reverse gap-controls rounded-b-xl border-t bg-muted/50 p-inset sm:flex-row sm:justify-end",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

function AlertDialogTitle({ className, ...props }: Loose<ComponentProps<typeof AlertDialogPrimitive.AlertDialogTitle>>) {
  return <AlertDialogPrimitive.AlertDialogTitle className={cn(modalTitle, className)} {...defined(props)} />;
}

function AlertDialogDescription({
  className,
  ...props
}: Loose<ComponentProps<typeof AlertDialogPrimitive.AlertDialogDescription>>) {
  return (
    <AlertDialogPrimitive.AlertDialogDescription
      className={cn(modalDescription, className)}
      {...defined(props)}
    />
  );
}

/**
 * ui-sdk's `createConfirm<Payload>()`: `await confirm(payload)` opens the alert dialog given `confirm.controller` and
 * resolves true when it closes with `"confirm"`, false on any other close. `createAlertDialogController()` for direct
 * control. PendingConfirmDialogRoot takes either as its `controller` (AVE-147).
 */
export { createAlertDialogController, createConfirm } from "@ui-sdk/react/alert-dialog";

export {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
};
