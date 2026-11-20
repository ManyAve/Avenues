import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import * as PopoverPrimitive from "@ui-sdk/react/popover";
import type { ComponentProps } from "react";
import { popupMaxWidth, popupMotion } from "#avenue/lib/popup";
import { cn } from "#avenue/lib/utils";
import { defined, type Loose, type OwnPartProps } from "#avenue/lib/props";

/**
 * Ported from the app's app/ui/components/ui/popover.tsx (e01cc90). lg corner (10px) as in the app. Padding moves
 * from 10px to the 16px container inset and the gap between blocks from 10px to 12px (AVE-2 section 1).
 * ui-sdk renders it in place, in the browser's top layer (no portal), moves focus into it on open, returns focus to
 * the trigger on close, and closes on Esc, an outside press or focus leaving.
 */
function Popover(props: Loose<ComponentProps<typeof PopoverPrimitive.Popover>>) {
  return <PopoverPrimitive.Popover {...defined(props)} />;
}

function PopoverTrigger(props: Loose<ComponentProps<typeof PopoverPrimitive.PopoverTrigger>>) {
  return <PopoverPrimitive.PopoverTrigger data-slot="popover-trigger" {...defined(props)} />;
}


function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  ...props
}: Loose<ComponentProps<typeof PopoverPrimitive.PopoverContent>>) {
  return (
    <PopoverPrimitive.PopoverContent
      data-slot="popover-content"
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      className={cn(
        "flex w-72 flex-col gap-3 rounded-lg bg-popover p-inset text-sm text-popover-foreground shadow-popover ring-1 ring-border outline-hidden",
        popupMaxWidth,
        popupMotion,
        className,
      )}
      {...defined(props)}
    />
  );
}

function PopoverHeader({ className, render, ...props }: OwnPartProps<"div">) {
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "popover-header",
        className: cn("flex flex-col gap-1 text-sm", className),
      },
      defined(props),
    ),
    render,
  );
}

function PopoverTitle({ className, ...props }: Loose<ComponentProps<typeof PopoverPrimitive.PopoverTitle>>) {
  return (
    <PopoverPrimitive.PopoverTitle
      data-slot="popover-title"
      className={cn("text-sm font-medium", className)}
      {...defined(props)}
    />
  );
}

function PopoverDescription({ className, ...props }: Loose<ComponentProps<typeof PopoverPrimitive.PopoverDescription>>) {
  return (
    <PopoverPrimitive.PopoverDescription
      data-slot="popover-description"
      className={cn("text-muted-foreground", className)}
      {...defined(props)}
    />
  );
}

export { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger };
