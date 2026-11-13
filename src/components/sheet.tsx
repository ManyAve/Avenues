import * as DrawerPrimitive from "@ui-sdk/react/drawer";
import { XIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "#avenue/components/button";
import { modalCloseButton, modalDescription, modalSurface, modalTitle } from "#avenue/lib/popup";
import { cn } from "#avenue/lib/utils";

/**
 * A modal sheet from an edge of the screen (AVE-32): a form or filters on a phone, or a side panel on a wide screen.
 * ui-sdk's drawer supplies the behavior: the page behind is inert, focus moves in on open and returns to the trigger on
 * close, Esc and a press on the backdrop close it, and a bottom sheet can be dragged down to close. Dragging is an
 * extra: the visible Close button and Esc always work.
 *
 * `side` goes on the root (`bottom` by default; `left`, `right`, `top`, or the logical `start` and `end`). The surface,
 * title and description are Dialog's, so the same form looks the same as a dialog or a sheet.
 *
 * Unsaved changes: cancel the close in `onOpenChange` while the form is dirty and ask "Discard changes?" in the sheet
 * (the Unsaved changes story). That covers the Close button too, which `dismissible={false}` alone does not.
 *
 * For a list of options on a phone, don't build a sheet: Select and Combobox take ui-sdk's `presentation="sheet"`.
 */
function Sheet({ side = "bottom", ...props }: ComponentProps<typeof DrawerPrimitive.Drawer>) {
  return <DrawerPrimitive.Drawer side={side} {...props} />;
}

function SheetTrigger(props: ComponentProps<typeof DrawerPrimitive.DrawerTrigger>) {
  return <DrawerPrimitive.DrawerTrigger {...props} />;
}

function SheetClose(props: ComponentProps<typeof DrawerPrimitive.DrawerClose>) {
  return <DrawerPrimitive.DrawerClose {...props} />;
}

/** Dialog's dim. The drawer drives its opacity, so it has no transition of its own. */
function SheetOverlay({ className, ...props }: ComponentProps<typeof DrawerPrimitive.DrawerBackdrop>) {
  return (
    <DrawerPrimitive.DrawerBackdrop
      className={cn("fixed inset-0 isolate z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs", className)}
      {...props}
    />
  );
}

/**
 * The sheet. A bottom sheet rounds only its top corners (xl, 14px) and shows a drag handle; a side sheet is full height
 * and rounds only its inner edge. The drawer owns `translate`, so nothing here animates it; with reduced motion the
 * drawer fades instead of sliding.
 */
function SheetContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: ComponentProps<typeof DrawerPrimitive.DrawerContent> & { showCloseButton?: boolean | undefined }) {
  return (
    <>
      <SheetOverlay />
      <DrawerPrimitive.DrawerContent
        className={cn(
          modalSurface,
          "group/sheet relative flex flex-col gap-4",
          // The ::after covers the gap a drag past the edge would open.
          "after:absolute after:bg-popover",
          "data-[side=bottom]:mx-auto data-[side=bottom]:max-h-[85dvh] data-[side=bottom]:w-full data-[side=bottom]:max-w-lg data-[side=bottom]:rounded-t-xl data-[side=bottom]:pb-[max(var(--spacing-inset),env(safe-area-inset-bottom))] data-[side=bottom]:after:inset-x-0 data-[side=bottom]:after:top-full data-[side=bottom]:after:h-24",
          "data-[side=top]:mx-auto data-[side=top]:max-h-[85dvh] data-[side=top]:w-full data-[side=top]:max-w-lg data-[side=top]:rounded-b-xl data-[side=top]:after:inset-x-0 data-[side=top]:after:bottom-full data-[side=top]:after:h-24",
          "data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:rounded-r-xl data-[side=left]:after:inset-y-0 data-[side=left]:after:right-full data-[side=left]:after:w-24 sm:data-[side=left]:max-w-sm",
          "data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:rounded-l-xl data-[side=right]:after:inset-y-0 data-[side=right]:after:left-full data-[side=right]:after:w-24 sm:data-[side=right]:max-w-sm",
          className,
        )}
        {...props}
      >
        {/* Decorative: the drawer drags from anywhere on the sheet, and the Close button and Esc always close it. */}
        <div
          data-slot="sheet-handle"
          aria-hidden
          className="-mt-2 mx-auto hidden h-1 w-9 shrink-0 rounded-xs bg-muted-foreground group-data-[side=bottom]/sheet:block"
        />
        {children as ReactNode}
        {showCloseButton && (
          <DrawerPrimitive.DrawerClose
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className={cn(modalCloseButton, "group-data-[side=bottom]/sheet:top-7")}
              />
            }
          >
            <XIcon aria-hidden />
            <span className="sr-only">Close</span>
          </DrawerPrimitive.DrawerClose>
        )}
      </DrawerPrimitive.DrawerContent>
    </>
  );
}

/** Title and description. Leaves room on the right for the close button. */
function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex shrink-0 flex-col gap-2 pe-8", className)} {...props} />;
}

/**
 * The part that scrolls when the content is taller than the sheet. A downward drag scrolls it first, and moves the
 * sheet once it is at the top. It reaches the sheet's edges, so focus rings aren't clipped.
 */
function SheetBody({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("-mx-inset -my-1 min-h-0 flex-1 overflow-y-auto px-inset py-1", className)}
      {...props}
    />
  );
}

/** Actions, on Dialog's muted strip, at the bottom of the sheet. Put Cancel first, as in Dialog. */
function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "-mx-inset -mb-inset mt-auto flex shrink-0 flex-col-reverse gap-controls border-t bg-muted/50 p-inset sm:flex-row sm:justify-end",
        "group-data-[side=bottom]/sheet:-mb-[max(var(--spacing-inset),env(safe-area-inset-bottom))] group-data-[side=bottom]/sheet:pb-[max(var(--spacing-inset),env(safe-area-inset-bottom))]",
        "group-data-[side=left]/sheet:rounded-br-xl group-data-[side=right]/sheet:rounded-bl-xl group-data-[side=top]/sheet:rounded-b-xl",
        className,
      )}
      {...props}
    />
  );
}

/** Named by this title. It wraps; it never truncates. */
function SheetTitle({ className, ...props }: ComponentProps<typeof DrawerPrimitive.DrawerTitle>) {
  return <DrawerPrimitive.DrawerTitle className={cn(modalTitle, "text-pretty", className)} {...props} />;
}

function SheetDescription({ className, ...props }: ComponentProps<typeof DrawerPrimitive.DrawerDescription>) {
  return <DrawerPrimitive.DrawerDescription className={cn(modalDescription, className)} {...props} />;
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetTitle,
  SheetTrigger,
};
