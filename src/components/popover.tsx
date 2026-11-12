import * as PopoverPrimitive from "@ui-sdk/react/popover";
import type { ComponentProps } from "react";
import { cn } from "#avenue/lib/utils";

/**
 * Ported from the app's app/ui/components/ui/popover.tsx (e01cc90). lg corner (10px) as in the app. Padding moves
 * from 10px to the 16px container inset and the gap between blocks from 10px to 12px (AVE-2 section 1).
 * ui-sdk renders it in place, in the browser's top layer (no portal), moves focus into it on open, returns focus to
 * the trigger on close, and closes on Esc, an outside press or focus leaving.
 */
function Popover(props: ComponentProps<typeof PopoverPrimitive.Popover>) {
  return <PopoverPrimitive.Popover {...props} />;
}

function PopoverTrigger(props: ComponentProps<typeof PopoverPrimitive.PopoverTrigger>) {
  return <PopoverPrimitive.PopoverTrigger data-slot="popover-trigger" {...props} />;
}

/**
 * Shared by Popover, Hover card, Select and Combobox: how a popup enters and leaves. ui-sdk marks the first frame
 * with data-starting-style and the exit with data-ending-style, and keeps the popup mounted until the exit ends.
 */
const popupMotion =
  "origin-(--transform-origin) transition-[opacity,scale,translate] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-[side=bottom]:data-starting-style:-translate-y-2 data-[side=left]:data-starting-style:translate-x-2 data-[side=right]:data-starting-style:-translate-x-2 data-[side=top]:data-starting-style:translate-y-2 motion-reduce:transition-none";

function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  ...props
}: ComponentProps<typeof PopoverPrimitive.PopoverContent>) {
  return (
    <PopoverPrimitive.PopoverContent
      data-slot="popover-content"
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      className={cn(
        "flex w-72 flex-col gap-3 rounded-lg bg-popover p-inset text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden",
        popupMotion,
        className,
      )}
      {...props}
    />
  );
}

function PopoverHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="popover-header" className={cn("flex flex-col gap-1 text-sm", className)} {...props} />;
}

function PopoverTitle({ className, ...props }: ComponentProps<typeof PopoverPrimitive.PopoverTitle>) {
  return (
    <PopoverPrimitive.PopoverTitle
      data-slot="popover-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  );
}

function PopoverDescription({ className, ...props }: ComponentProps<typeof PopoverPrimitive.PopoverDescription>) {
  return (
    <PopoverPrimitive.PopoverDescription
      data-slot="popover-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger, popupMotion };
