import * as TooltipPrimitive from "@ui-sdk/react/tooltip";
import { CircleHelpIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { popupMotion } from "#avenue/lib/popup";
import { cn } from "#avenue/lib/utils";

/**
 * Ported from the app's app/ui/components/ui/tooltip.tsx (e01cc90). md corner (8px, AVE-2 "tooltips"); padding
 * 12 x 6px moves to 12 x 4px and the icon gap to 4px. The arrow's 2px corner is xs.
 *
 * A tooltip is a hint, never the only place information lives. ui-sdk gives the content role="tooltip" and keeps it
 * in the page, hidden, so it names an icon-only trigger or describes any other before focus reaches it. It opens on
 * hover and keyboard focus. The trigger is a real button; don't render it as a span. For help text on a
 * non-interactive label (the Status help) use InfoTip, which also opens on tap.
 */
function Tooltip({ delay = 0, ...props }: ComponentProps<typeof TooltipPrimitive.Tooltip>) {
  return <TooltipPrimitive.Tooltip delay={delay} {...props} />;
}

function TooltipTrigger(props: ComponentProps<typeof TooltipPrimitive.TooltipTrigger>) {
  return <TooltipPrimitive.TooltipTrigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: ComponentProps<typeof TooltipPrimitive.TooltipContent>) {
  return (
    <TooltipPrimitive.TooltipContent
      data-slot="tooltip-content"
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      className={cn(
        "inline-flex w-fit max-w-[min(var(--container-xs),var(--available-width))] items-center gap-1 overflow-visible rounded-md bg-foreground px-3 py-1 text-xs text-background",
        popupMotion,
        className,
      )}
      {...props}
    >
      {children as ReactNode}
      <TooltipPrimitive.TooltipArrow className="absolute size-2.5 rotate-45 rounded-xs bg-foreground data-[side=bottom]:-top-1 data-[side=left]:-right-1 data-[side=right]:-left-1 data-[side=top]:-bottom-1" />
    </TooltipPrimitive.TooltipContent>
  );
}

/**
 * Help text for something that isn't itself a control, such as a status label. Renders a small focusable help
 * button that shows the text on hover, on keyboard focus and on a press or tap (pressing again closes it; Esc or a
 * press elsewhere closes it too). `label` is the button's accessible name and the tooltip describes it, so a screen
 * reader reads both on focus whether or not the tip is showing.
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
  side?: ComponentProps<typeof TooltipPrimitive.TooltipContent>["side"];
  className?: string | undefined;
}) {
  return (
    <Tooltip toggleable type="description">
      <TooltipTrigger
        data-slot="info-tip"
        aria-label={label}
        className={cn(
          "relative inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hit-area [--hit-area-x:--spacing(2)] [--hit-area-y:--spacing(2)] hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-open:text-foreground [&_svg]:size-3.5",
          className,
        )}
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent side={side}>{children}</TooltipContent>
    </Tooltip>
  );
}

export { InfoTip, Tooltip, TooltipContent, TooltipTrigger };
