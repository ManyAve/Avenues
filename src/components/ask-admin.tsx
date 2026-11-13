import type { ComponentProps } from "react";
import { cn } from "#avenue/lib/utils";

/**
 * ManyAve's AskAdmin note, ported from the app's app/ui/components/ask-admin.tsx (e01cc90), unchanged: why a
 * control is unavailable to a plain board member ("Ask a board admin to …"), shown as a visible muted line
 * beside the control rather than only in a tooltip (MAN-795).
 *
 * For one disabled button, prefer Button's `disabledReason`, which also links the reason to the button. Use
 * AskAdmin when one reason covers a group of controls; give it an id and point the controls' aria-describedby
 * at it. `footer` places it on its own full-width line above the buttons of a wrapping dialog footer.
 */
function AskAdmin({
  footer = false,
  className,
  ...props
}: ComponentProps<"p"> & { footer?: boolean | undefined }) {
  return (
    <p
      data-slot="ask-admin"
      className={cn(
        "text-meta text-muted-foreground",
        footer && "order-last sm:order-first sm:basis-full sm:text-end",
        className,
      )}
      {...props}
    />
  );
}

export { AskAdmin };
