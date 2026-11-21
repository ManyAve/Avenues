import * as Ui from "@ui-sdk/react/time-input";
import type { TimeInputValueChangeReason } from "@ui-sdk/react/time-input";
import type { ComponentProps } from "react";
import type { ChangeDetails } from "#avenue/lib/change";
import { DateFieldError, NativeDateField, type DateFieldErrorProps } from "#avenue/components/date-picker";
import { segmentClass, segmentedField } from "#avenue/lib/date-field";
import type { PickerSize } from "#avenue/lib/picker";
import { useNative, type Native } from "#avenue/lib/pointer";
import { defined, type Loose } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/** What `onValueChange` gets after the value: ui-sdk TimeInput's own details (reason, event, source, `cancel()`). */
export type TimeInputValueChangeDetails = ChangeDetails<TimeInputValueChangeReason>;

export type TimeInputProps = Omit<Loose<ComponentProps<typeof Ui.TimeInput>>, "onValueChange"> & {
  onValueChange?: ((value: string | null, details: TimeInputValueChangeDetails) => void) | undefined;
  /** md (32px, the default) or sm (28px, for a card or dialog header). */
  size?: PickerSize | undefined;
  /**
   * Whether a phone uses its own time picker. "auto" (default) does on touch-first devices and draws the segments
   * elsewhere (UX Engineer, AVE-202). Children or an hour alone always draw the segments.
   */
  native?: Native | undefined;
  invalid?: boolean | undefined;
};

/**
 * Type a time one part at a time (AVE-202), on ui-sdk's TimeInput: hour and minute segments, AM/PM on a 12-hour
 * clock, in the locale's clock unless `hourCycle` says. Each segment is a spinbutton named by its part ("hour") whose
 * value it reads. The value is a 24-hour time ("14:30", "14:30:15" with seconds) whatever the clock shows, and null
 * until every segment holds something. It posts under `name` (or its Field's).
 *
 * Styled like Input, and on a phone the OS's own time picker by default (`native`). Put it in a Field with a
 * `TimeInputError`. With no children it draws every segment; its children can be a function of its state that
 * renders `state.segments` as `TimeInputSegment`s.
 */
export function TimeInput({ size = "md", native, invalid, className, children, onValueChange, ...props }: TimeInputProps) {
  const os = useNative(native) && children === undefined && props.granularity !== "hour";
  if (os) {
    const { value, defaultValue, min, max, name, form, required, disabled, readOnly, id } = props;
    return (
      <NativeDateField
        type="time"
        slot="time-input"
        reason="input-change"
        {...(props.granularity === "second" ? { step: 1 } : {})}
        {...defined({ value, defaultValue, onValueChange, min, max, name, form, required, disabled, readOnly, id })}
        {...defined({ invalid, size, className, "aria-label": props["aria-label"] })}
      />
    );
  }
  return (
    <Ui.TimeInput
      data-size={size}
      aria-invalid={invalid || undefined}
      className={cn(segmentedField(size), className)}
      {...defined({ onValueChange })}
      {...defined(props)}
    >
      {children ??
        (({ segments }) => segments.map((segment) => <TimeInputSegment key={segment.key} segment={segment} />))}
    </Ui.TimeInput>
  );
}

/** One segment, or the text between two, in Avenue's look. */
export function TimeInputSegment({ className, ...props }: Loose<ComponentProps<typeof Ui.TimeInputSegment>>) {
  return <Ui.TimeInputSegment className={cn(segmentClass, className)} {...defined(props)} />;
}

/**
 * The error a TimeInput shows on submit when its time is partly typed or out of bounds, on the locale's clock: "Enter
 * a time like 02:30 PM". An input with `min` or `max` says its rule as children instead.
 */
export function TimeInputError(props: DateFieldErrorProps) {
  return <DateFieldError kind="time" {...props} />;
}
