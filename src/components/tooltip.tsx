import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { CircleHelpIcon } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "#avenue/lib/utils";

/**
 * Ported from the app's app/ui/components/ui/tooltip.tsx (e01cc90). md corner (8px, AVE-2 "tooltips"); padding
 * 12 x 6px moves to 12 x 4px and the icon gap to 4px. The arrow's 2px corner is xs.
 *
 * A tooltip is a hint, never the only place information lives (Base UI turns tooltips off for touch). The trigger is
 * a real button so it is always focusable and opens on focus; don't render it as a span. For help text on a
 * non-interactive label (the Status help) use InfoTip, which also opens on tap.
 */
function TooltipProvider({ delay = 0, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />;
}

function Tooltip(props: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger(props: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1 rounded-md bg-foreground px-3 py-1 text-xs text-background data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-xs bg-foreground fill-foreground data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-[10px]" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

/**
 * Help text for something that isn't itself a control, such as a status label. Renders a small focusable help
 * button that shows the text on hover, on keyboard focus and on tap (a tap opens it; tapping elsewhere or Esc
 * closes it). `label` is the button's accessible name and the help text is its description, so a screen reader reads
 * both on focus whether or not the popup is showing (Base UI tooltips add no ARIA of their own).
 * Replaces the app's tooltip on a plain span, which keyboard and touch users could never open.
 */
function InfoTip({
  label,
  children,
  icon = <CircleHelpIcon aria-hidden />,
  side = "top",
  className,
}: {
  label: string;
  children: ReactNode;
  icon?: ReactNode;
  side?: TooltipPrimitive.Positioner.Props["side"];
  className?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const descriptionId = useId();
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <span id={descriptionId} hidden>
        {children}
      </span>
      <TooltipTrigger
        data-slot="info-tip"
        aria-label={label}
        aria-describedby={descriptionId}
        closeOnClick={false}
        onClick={() => setOpen(true)}
        className={cn(
          "relative inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none after:absolute after:-inset-2 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:text-foreground [&_svg]:size-3.5",
          className,
        )}
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent side={side}>{children}</TooltipContent>
    </Tooltip>
  );
}

export { InfoTip, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
