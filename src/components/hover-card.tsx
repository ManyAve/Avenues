import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card";
import { popupMotion } from "#avenue/components/popover";
import { cn } from "#avenue/lib/utils";

/**
 * Ported from the app's app/ui/components/ui/hover-card.tsx (e01cc90): a preview that opens while a pointer rests on
 * the trigger (the app uses 500ms on register cells). lg corner as in the app; padding 10px to the 16px inset.
 *
 * Hover only: Base UI keeps the preview out of the keyboard, touch and screen-reader paths. Whatever it shows must
 * also be reachable another way, usually by activating the trigger (the register's cells open a dialog with the
 * same content). The stories show that pairing.
 */
function HoverCard(props: PreviewCardPrimitive.Root.Props) {
  return <PreviewCardPrimitive.Root data-slot="hover-card" {...props} />;
}

function HoverCardTrigger(props: PreviewCardPrimitive.Trigger.Props) {
  return <PreviewCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />;
}

function HoverCardContent({
  className,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 4,
  ...props
}: PreviewCardPrimitive.Popup.Props &
  Pick<PreviewCardPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  return (
    <PreviewCardPrimitive.Portal data-slot="hover-card-portal">
      <PreviewCardPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <PreviewCardPrimitive.Popup
          data-slot="hover-card-content"
          className={cn(
            "z-50 w-64 rounded-lg bg-popover p-inset text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden",
            popupMotion,
            className,
          )}
          {...props}
        />
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
