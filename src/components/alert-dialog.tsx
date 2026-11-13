import * as AlertDialogPrimitive from "@ui-sdk/react/alert-dialog";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "#avenue/lib/utils";

/**
 * A question that must be answered before anything else happens ("Discard changes?", "Remove household?").
 * ui-sdk's alert dialog: role alertdialog, always modal, an outside press never closes it, Esc closes it and
 * returns focus. Looks like Avenue's Dialog (xl corner, 16px inset, muted footer strip) without a close button,
 * because each answer is a button in the footer. Put the safe answer first: it is then where focus starts.
 */
function AlertDialog(props: ComponentProps<typeof AlertDialogPrimitive.AlertDialog>) {
  return <AlertDialogPrimitive.AlertDialog {...props} />;
}

function AlertDialogTrigger(props: ComponentProps<typeof AlertDialogPrimitive.AlertDialogTrigger>) {
  return <AlertDialogPrimitive.AlertDialogTrigger {...props} />;
}

function AlertDialogClose(props: ComponentProps<typeof AlertDialogPrimitive.AlertDialogClose>) {
  return <AlertDialogPrimitive.AlertDialogClose {...props} />;
}

function AlertDialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.AlertDialogContent>) {
  return (
    <>
      <AlertDialogPrimitive.AlertDialogBackdrop className="fixed inset-0 isolate z-50 bg-black/10 transition-opacity duration-100 supports-backdrop-filter:backdrop-blur-xs data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none" />
      <AlertDialogPrimitive.AlertDialogContent
        className={cn(
          "fixed top-1/2 right-auto bottom-auto left-1/2 z-50 m-0 grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl bg-popover p-inset text-sm text-popover-foreground ring-1 ring-foreground/10 transition-[opacity,scale] duration-100 outline-none backdrop:bg-transparent sm:max-w-sm data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 motion-reduce:transition-none",
          className,
        )}
        {...props}
      >
        {children as ReactNode}
      </AlertDialogPrimitive.AlertDialogContent>
    </>
  );
}

function AlertDialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-dialog-header" className={cn("flex flex-col gap-2", className)} {...props} />;
}

/** The answers, on the same muted strip as Dialog's footer. Safe answer first. */
function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-inset sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.AlertDialogTitle>) {
  return <AlertDialogPrimitive.AlertDialogTitle className={cn("text-base leading-6 font-medium", className)} {...props} />;
}

function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.AlertDialogDescription>) {
  return (
    <AlertDialogPrimitive.AlertDialogDescription
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

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
