import { Field as FieldPrimitive } from "@base-ui/react/field";
import type { ComponentProps } from "react";
import { controlSurface } from "#avenue/lib/control";
import { cn } from "#avenue/lib/utils";

/**
 * Ported from the app's app/ui/components/ui/textarea.tsx (e01cc90): grows with its content from 64px, with the
 * input's look and the lg corner. Side padding 10px to 8px (AVE-2). Rendered through Base UI's Field.Control so a
 * Field labels it, describes it and marks it invalid, as it does an Input.
 */
function Textarea({ className, ...props }: Omit<FieldPrimitive.Control.Props, "render"> & ComponentProps<"textarea">) {
  return (
    <FieldPrimitive.Control
      data-slot="textarea"
      render={<textarea />}
      className={cn(controlSurface, "flex field-sizing-content min-h-16 rounded-lg px-2 py-2", className)}
      {...(props as FieldPrimitive.Control.Props)}
    />
  );
}

export { Textarea };
