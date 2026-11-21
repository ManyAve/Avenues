import * as Ui from "@ui-sdk/react/date-input";
import type { DateInputValueChangeReason } from "@ui-sdk/react/date-input";
import type { ComponentProps } from "react";
import type { ChangeDetails } from "#avenue/lib/change";
import { DateFieldError, NativeDateField, type DateFieldErrorProps } from "#avenue/components/date-picker";
import { segmentClass, segmentedField } from "#avenue/lib/date-field";
import type { PickerSize } from "#avenue/lib/picker";
import { useNative, type Native } from "#avenue/lib/pointer";
import { defined, type Loose } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

/** What `onValueChange` gets after the value: ui-sdk DateInput's own details (reason, event, source, `cancel()`). */
export type DateInputValueChangeDetails = ChangeDetails<DateInputValueChangeReason>;

export type DateInputProps = Omit<Loose<ComponentProps<typeof Ui.DateInput>>, "onValueChange"> & {
  onValueChange?: ((value: string | null, details: DateInputValueChangeDetails) => void) | undefined;
  /** md (32px, the default) or sm (28px, for a card or dialog header). */
  size?: PickerSize | undefined;
  /**
   * Whether a phone uses its own date (or date and time) picker. "auto" (default) does on touch-first devices and
   * draws the segments elsewhere (UX Engineer, AVE-202). Children, `unavailable` days or a time to the second always
   * draw the segments, which the OS picker can't show.
   */
  native?: Native | undefined;
  invalid?: boolean | undefined;
};

/**
 * Type a date one part at a time (AVE-202), on ui-sdk's DateInput: a group of segments in the locale's order (month,
 * day, year in American English; day, month, year in British), each a spinbutton named by its part ("month") whose
 * value it reads ("11"), so a screen reader hears "Due date, group; month, 11". Digits fill a segment and move on, a
 * separator moves on, the arrows step it, paste fills them all. The value is an ISO date ("2026-11-21"), or a local
 * date and time ("2026-11-21T14:30") with `granularity`, and null until every segment holds something. It posts under
 * `name` (or its Field's), and a partly typed date stops the submit.
 *
 * For dates people know by heart (a move-in date, a birthday). For a date picked from a month, use DatePicker. Styled
 * like Input, and on a phone the OS's own picker by default (`native`). Put it in a Field with a `DateInputError`.
 *
 * With no children it draws every segment; its children can be a function of its state that renders
 * `state.segments` as `DateInputSegment`s, as ui-sdk's does.
 */
export function DateInput({ size = "md", native, invalid, className, children, onValueChange, ...props }: DateInputProps) {
  const os =
    useNative(native) && children === undefined && props.unavailable === undefined && props.granularity !== "second";
  if (os) {
    const { value, defaultValue, min, max, name, form, required, disabled, readOnly, id } = props;
    return (
      <NativeDateField
        type={props.granularity && props.granularity !== "day" ? "datetime-local" : "date"}
        slot="date-input"
        reason="input-change"
        {...defined({ value, defaultValue, onValueChange, min, max, name, form, required, disabled, readOnly, id })}
        {...defined({ invalid, size, className, "aria-label": props["aria-label"] })}
      />
    );
  }
  return (
    <Ui.DateInput
      data-size={size}
      aria-invalid={invalid || undefined}
      className={cn(segmentedField(size), className)}
      {...defined({ onValueChange })}
      {...defined(props)}
    >
      {children ??
        (({ segments }) => segments.map((segment) => <DateInputSegment key={segment.key} segment={segment} />))}
    </Ui.DateInput>
  );
}

/** One segment, or the text between two, in Avenue's look. */
export function DateInputSegment({ className, ...props }: Loose<ComponentProps<typeof Ui.DateInputSegment>>) {
  return <Ui.DateInputSegment className={cn(segmentClass, className)} {...defined(props)} />;
}

/**
 * The error a DateInput shows on submit when its date is partly typed or out of bounds, in the locale's order: "Enter
 * a date like 31/12/2026". An input with `min`, `max` or unavailable days says its rule as children instead.
 */
export function DateInputError({ kind, ...props }: DateFieldErrorProps & { kind?: "date" | "date-time" | undefined }) {
  return <DateFieldError kind={kind ?? "date"} {...props} />;
}
