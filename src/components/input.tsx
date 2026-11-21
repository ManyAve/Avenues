import { Input as InputPrimitive } from "@ui-sdk/react/input";
import type { ComponentProps } from "react";
import { controlSize, controlSurface, type ControlSize } from "#avenue/lib/control";
import { cn } from "#avenue/lib/utils";
import { defined, type Loose } from "#avenue/lib/props";

/**
 * Ported from the app's app/ui/components/ui/input.tsx (e01cc90). Same look; the side padding moves from 10px to
 * 8px (AVE-2: off-grid steps inside a control take 8). md (32px, 10px corner) is the default; a smaller control
 * sits in a card or dialog header (sm), a larger one in a mobile primary row (lg).
 * Inside a Field it is the field's control: labelled, described and marked invalid by the Field.
 * For a date or a time use DatePicker, DateInput or TimeInput (AVE-202), not type="date".
 * A placeholder is a hint in the placeholder token (AVE-186), never the label, the only instructions or an example value (AVE-25).
 */
function Input({
  className,
  size = "md",
  ...props
}: Omit<Loose<ComponentProps<typeof InputPrimitive>>, "size"> & { size?: ControlSize | undefined }) {
  return (
    <InputPrimitive
      data-slot="input"
      data-size={size}
      className={cn(
        controlSurface,
        controlSize({ size }),
        // AVE-22: an <input> can't carry the invisible hit area, so on a phone it is 44px tall, at every size.
        "py-1 pointer-coarse:min-h-11 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-control file:font-medium file:text-foreground",
        className,
      )}
      {...defined(props)}
    />
  );
}

export { Input };
