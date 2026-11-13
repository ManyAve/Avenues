import { Textarea as TextareaPrimitive } from "@ui-sdk/react/textarea";
import type { ComponentProps } from "react";
import { controlSurface } from "#avenue/lib/control";
import { cn } from "#avenue/lib/utils";

/**
 * Ported from the app's app/ui/components/ui/textarea.tsx (e01cc90): grows with its content from 64px, with the
 * input's look and the lg corner. Side padding 10px to 8px (AVE-2). ui-sdk's Textarea joins the Field around it, so
 * the Field labels it, describes it and marks it invalid, as it does an Input.
 * A placeholder is a hint in muted-foreground, never the label, the only instructions or an example value (AVE-25).
 */
function Textarea({ className, ...props }: ComponentProps<typeof TextareaPrimitive>) {
  return (
    <TextareaPrimitive
      data-slot="textarea"
      className={cn(controlSurface, "flex field-sizing-content min-h-16 rounded-lg px-2 py-2", className)}
      {...props}
    />
  );
}

export { Textarea };
