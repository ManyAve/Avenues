import type { ComponentProps } from "react";
import { Button } from "#avenue/components/button";
import { cn } from "#avenue/lib/utils";

/**
 * ManyAve's outlined view-control button for toolbars (the app's app/ui/components/Toolbar.tsx at e01cc90), on
 * Avenue's Button (ui-sdk button). Changes from the app, both AVE-2: it is md (32px, was 29) to share the
 * toolbar's height, and it takes the md control corner (10px) instead of a pill, because a button acts
 * (AVE-2 section 5 names icon-only toolbar buttons). Side padding 7px becomes 8px. Give an icon-only one an
 * aria-label.
 */
function ToolbarButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      className={cn("min-w-control-md gap-1 px-2 text-control text-muted-foreground shadow-control", className)}
      {...props}
    />
  );
}

export { ToolbarButton };
