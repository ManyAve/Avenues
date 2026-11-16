import * as HoverCardPrimitive from "@ui-sdk/react/hover-card";
import type { ComponentProps } from "react";
import { popupMaxWidth, popupMotion } from "#avenue/lib/popup";
import { cn } from "#avenue/lib/utils";

/**
 * Ported from the app's app/ui/components/ui/hover-card.tsx (e01cc90): a preview of where a link goes, shown while a
 * pointer rests on it or keyboard focus stays on it (the app uses 500ms on register cells). lg corner as in the app;
 * padding 10px to the 16px inset. The trigger is a link: give it an href.
 *
 * Touch and screen-reader users may never see the preview, so everything in it must also be on the page the link
 * opens (the register's cells open a dialog with the same content). The stories show that pairing.
 */
function HoverCard(props: ComponentProps<typeof HoverCardPrimitive.HoverCard>) {
  return <HoverCardPrimitive.HoverCard {...props} />;
}

function HoverCardTrigger(props: ComponentProps<typeof HoverCardPrimitive.HoverCardTrigger>) {
  return <HoverCardPrimitive.HoverCardTrigger data-slot="hover-card-trigger" {...props} />;
}

function HoverCardContent({
  className,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 4,
  ...props
}: ComponentProps<typeof HoverCardPrimitive.HoverCardContent>) {
  return (
    <HoverCardPrimitive.HoverCardContent
      data-slot="hover-card-content"
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      className={cn(
        "w-64 rounded-lg bg-popover p-inset text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden",
        popupMaxWidth,
        popupMotion,
        className,
      )}
      {...props}
    />
  );
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
