import * as Ui from "@ui-sdk/react/date-picker";
import type { DatePickerValue, DatePickerValueChangeReason } from "@ui-sdk/react/date-picker";
import { formatDate, formatDateRange } from "@ui-sdk/react/date";
import { mergeProps, renderElement } from "@ui-sdk/react/primitive";
import { CalendarIcon, XIcon } from "lucide-react";
import { FieldControl } from "@ui-sdk/react/field";
import { createContext, useContext, useLayoutEffect, useState, type ChangeEvent, type ComponentProps, type ReactNode } from "react";
import { FieldError } from "#avenue/components/field";
import {
  CalendarDay,
  CalendarGrid,
  CalendarHeader,
  CalendarHeading,
  CalendarNext,
  CalendarPrevious,
  CalendarWeekday,
  CalendarWeekdays,
  CalendarWeeks,
} from "#avenue/components/calendar";
import { report, type ChangeDetails } from "#avenue/lib/change";
import { exampleMessage, useFieldLocale, type DateFieldKind } from "#avenue/lib/date-field";
import { fieldControl, listSheet, listSheetHandle, type PickerSize } from "#avenue/lib/picker";
import { useNative, type Native } from "#avenue/lib/pointer";
import { popupMaxWidth, popupMotion } from "#avenue/lib/popup";
import { defined, type Loose, type NodeChildren, type OwnPartProps } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

export type { DatePickerValue };

/** What `onValueChange` gets after the value: ui-sdk DatePicker's own details (reason, event, source, `cancel()`). */
export type DatePickerValueChangeDetails = ChangeDetails<DatePickerValueChangeReason>;

/**
 * What the parts share through the root: the field the calendar lines up with, the field's size, and what the
 * calendar button's name is made of (the field's label, the date and the locale).
 */
type SharedState = {
  anchor: HTMLElement | null;
  setAnchor: (el: HTMLElement | null) => void;
  size: PickerSize;
  label: string | undefined;
  setLabel: (label: string | undefined) => void;
  value: DatePickerValue;
  locale: string | undefined;
};
const Shared = createContext<SharedState>({
  anchor: null,
  setAnchor: () => {},
  size: "md",
  label: undefined,
  setLabel: () => {},
  value: null,
  locale: undefined,
});

type RootProps = Omit<Loose<ComponentProps<typeof Ui.DatePicker>>, "children" | "onValueChange"> & {
  onValueChange?: ((value: DatePickerValue, details: DatePickerValueChangeDetails) => void) | undefined;
};

/** Built from parts: `DatePicker` holds the date, and its children are the field and the calendar. */
type DatePickerPartsProps = RootProps & {
  children: NonNullable<NodeChildren<RootProps>["children"]>;
  /** The size the parts' field draws at: md (32px, the default) or sm (28px, for a card or dialog header). */
  size?: PickerSize | undefined;
  native?: undefined;
  id?: undefined;
  placeholder?: undefined;
  invalid?: undefined;
  "aria-label"?: undefined;
};

/** The one-tag DatePicker: Avenue draws the field, the calendar button and the calendar. */
type DatePickerWrapperProps = RootProps & {
  children?: undefined;
  size?: PickerSize | undefined;
  /**
   * Whether a phone uses its own date picker. "auto" (default) does on touch-first devices, where the OS wheel or
   * dialog is the most familiar control and the best read by VoiceOver and TalkBack, and Avenue's field elsewhere
   * (UX Engineer, AVE-202). It needs a single date with no `unavailable` days, which the OS picker can't refuse: a
   * range or unavailable days always draw Avenue's field, whose calendar opens as a sheet on a phone.
   */
  native?: Native | undefined;
  /** The input's id. Inside a Field, leave it out: the Field labels the input itself. */
  id?: string | undefined;
  /** A hint in the empty field, never its label. Leave it out to show nothing. */
  placeholder?: string | undefined;
  invalid?: boolean | undefined;
  /** Only when there is no visible label. */
  "aria-label"?: string | undefined;
};

export type DatePickerProps = DatePickerPartsProps | DatePickerWrapperProps;

/**
 * Pick or type a date (AVE-202), on ui-sdk's DatePicker: a text field that reads a date typed in the locale's order on
 * Enter or blur ("21/11/2026" in British English, "11/21/2026" in American, ISO, digits alone, month names, paste), and
 * a button that opens Avenue's Calendar on demand. Alt+Down opens it from the field. The value is an ISO date
 * ("2026-11-21") or null, and posts under `name` (or its Field's). Ranges take `mode="range"` and two inputs.
 *
 * Two forms, as Select has. With no children it is one tag: the field, the calendar button and the calendar, and on a
 * phone the OS's own date picker (`native`). With children it is ui-sdk's composition in Avenue's look:
 *
 * ```tsx
 * <DatePicker name="due">
 *   <DatePickerGroup>
 *     <DatePickerInput />
 *     <DatePickerTrigger />
 *   </DatePickerGroup>
 *   <DatePickerContent />
 * </DatePicker>
 * ```
 *
 * The calendar opens as a popover under the field, and as a bottom sheet on a small touch screen (`presentation`,
 * "auto" by default). Put it in a Field with a `DatePickerError`: on submit, text that isn't a date says "Enter a date
 * like 31/12/2026", in the locale's order.
 */
export function DatePicker(props: DatePickerProps) {
  const {
    children,
    size = "md",
    native,
    id,
    placeholder,
    invalid,
    "aria-label": ariaLabel,
    weekdayFormat = "narrow",
    fixedWeeks = true,
    presentation = "auto",
    onValueChange,
    className,
    ...rest
  } = props;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [label, setLabel] = useState<string | undefined>();
  const useOsPicker = useNative(native) && children === undefined && rest.mode !== "range" && rest.unavailable === undefined;

  if (useOsPicker) {
    const single = (v: DatePickerValue | undefined) => (Array.isArray(v) ? null : v);
    return (
      <NativeDateField
        type="date"
        slot="date-picker"
        reason="input-commit"
        value={single(rest.value)}
        defaultValue={single(rest.defaultValue)}
        onValueChange={onValueChange}
        {...defined({ min: rest.min, max: rest.max, name: rest.name, form: rest.form, required: rest.required })}
        {...defined({ disabled: rest.disabled, readOnly: rest.readOnly, id, invalid, size, className, "aria-label": ariaLabel })}
      />
    );
  }

  return (
    <Ui.DatePicker
        weekdayFormat={weekdayFormat}
        fixedWeeks={fixedWeeks}
        presentation={presentation}
        className={cn("min-w-0", className)}
        {...defined({ onValueChange })}
        {...defined(rest)}
      >
        {(state) => (
          <Shared.Provider value={{ anchor, setAnchor, size, label, setLabel, value: state.value, locale: rest.locale }}>
            {children ?? (
              <>
                <DatePickerGroup>
                  <DatePickerInput {...defined({ id, placeholder, "aria-label": ariaLabel })} aria-invalid={invalid || undefined} />
                  <DatePickerTrigger />
                </DatePickerGroup>
                <DatePickerContent />
              </>
            )}
          </Shared.Provider>
        )}
      </Ui.DatePicker>
  );
}

/**
 * The field's box: Avenue's control surface, holding the input and its buttons, with the focus and invalid rings of
 * any field. The calendar lines up with it. It is never narrower than a full date and its button (160px), so in a
 * row that wraps, it moves to its own line before its date is cut off (AVE-202).
 */
export function DatePickerGroup({ className, render, ...props }: OwnPartProps<"div">) {
  const { setAnchor, size } = useContext(Shared);
  return renderElement(
    "div",
    mergeProps(
      {
        "data-slot": "date-picker-group",
        ref: setAnchor,
        className: cn(
          fieldControl({ size }),
          "min-w-40 gap-0 ps-0 pe-0 pointer-coarse:min-h-11",
          "has-data-disabled:cursor-not-allowed has-data-disabled:bg-input/50 has-data-disabled:opacity-50 dark:has-data-disabled:bg-input/80",
          className,
        ),
      },
      defined(props),
    ),
    render,
  );
}

/** The text field a date is typed in. Inside a Field, the Field labels it; on its own it needs `aria-label`. */
export function DatePickerInput({ className, ref, ...props }: Loose<ComponentProps<typeof Ui.DatePickerInput>>) {
  const { setLabel } = useContext(Shared);
  const [element, setElement] = useState<HTMLInputElement | null>(null);
  // The calendar button is named after the field, which a Field labels once it mounts. A range's end leaves it.
  useLayoutEffect(() => {
    if (!element || props.end) return;
    const named = element.getAttribute("aria-label") ?? element.labels?.[0]?.textContent ?? undefined;
    setLabel(named?.trim().toLowerCase() || undefined);
  }, [element, props.end, setLabel]);
  return (
    <Ui.DatePickerInput
      ref={(el: HTMLInputElement | null) => {
        setElement(el);
        if (typeof ref === "function") return ref(el);
        if (ref) ref.current = el;
      }}
      className={cn(
        // A text field's default width (about 20 characters) is also its smallest; w-full lets the group size it.
        "h-full w-full min-w-0 flex-1 bg-transparent px-2 tabular-nums outline-none placeholder:text-placeholder disabled:cursor-not-allowed",
        className,
      )}
      {...defined(props)}
    />
  );
}

/**
 * The calendar button at the end of the field, 32px wide (44px on a phone) and the field's full height. It is named
 * after its field and the date chosen ("Choose due date, Saturday, November 21, 2026"), so two pickers on one screen
 * never share a name, as ui-sdk's "Choose date" would (AVE-92). `aria-label` replaces it.
 */
export function DatePickerTrigger({ className, children, ...props }: Loose<ComponentProps<typeof Ui.DatePickerTrigger>>) {
  const { label, value, locale } = useContext(Shared);
  const [element, setElement] = useState<HTMLButtonElement | null>(null);
  const resolved = useFieldLocale(element, locale);
  const long = { weekday: "long", month: "long", day: "numeric", year: "numeric" } as const;
  const chosen =
    typeof value === "string"
      ? formatDate(value, resolved, long)
      : value
        ? formatDateRange(value[0], value[1], resolved, long)
        : undefined;
  const name = [`Choose ${label ?? "date"}`, chosen].filter(Boolean).join(", ");
  return (
    <Ui.DatePickerTrigger
      ref={setElement}
      aria-label={name}
      className={cn(
        "flex h-full w-8 shrink-0 items-center justify-center rounded-e-[inherit] text-muted-foreground outline-none pointer-coarse:w-11",
        "hover:text-foreground focus-visible:bg-accent focus-visible:text-accent-foreground data-open:text-foreground disabled:cursor-not-allowed",
        className,
      )}
      {...defined(props)}
    >
      {children ?? <CalendarIcon aria-hidden />}
    </Ui.DatePickerTrigger>
  );
}

/**
 * Clears the date and puts focus back in the field; hidden while there is nothing to clear. Name it after the field
 * ("Clear due date"). Undoable, so no agent confirm.
 */
export function DatePickerClear({ className, children, ...props }: Loose<ComponentProps<typeof Ui.DatePickerClear>>) {
  return (
    <Ui.DatePickerClear
      className={cn(
        "flex h-full w-8 shrink-0 items-center justify-center text-muted-foreground outline-none pointer-coarse:w-11 data-empty:hidden",
        "hover:text-foreground focus-visible:bg-accent focus-visible:text-accent-foreground disabled:cursor-not-allowed",
        className,
      )}
      {...defined(props)}
    >
      {children ?? <XIcon aria-hidden />}
    </Ui.DatePickerClear>
  );
}

/**
 * The format to type, in the locale: "DD/MM/YYYY", or with a function child of its state, `example` ("31/12/2026").
 * It describes the inputs. Show it under the field where a format is easy to get wrong.
 */
export function DatePickerHint({ className, ...props }: Loose<ComponentProps<typeof Ui.DatePickerHint>>) {
  return <Ui.DatePickerHint className={cn("text-field text-muted-foreground", className)} {...defined(props)} />;
}

/**
 * The calendar's popup: Avenue's popover look, under the field and lined up with its start, or a bottom sheet on a
 * small touch screen. With no children it holds Avenue's Calendar parts (heading, arrows, the month); write those out
 * to change the month, add `DatePickerPreset`s, or show two months.
 */
export function DatePickerContent({
  side = "bottom",
  align = "start",
  sideOffset = 4,
  className,
  children,
  ...props
}: NodeChildren<Loose<ComponentProps<typeof Ui.DatePickerContent>>>) {
  const { anchor } = useContext(Shared);
  return (
    <Ui.DatePickerContent
      side={side}
      align={align}
      sideOffset={sideOffset}
      {...(anchor ? { anchor } : {})}
      className={cn(
        popupMotion,
        popupMaxWidth,
        "grid gap-2 rounded-lg bg-popover p-3 text-popover-foreground shadow-popover ring-1 ring-border outline-none",
        listSheet(),
        "sheet:items-center sheet:px-inset sheet:pb-inset",
        className,
      )}
      {...defined(props)}
    >
      <div aria-hidden data-slot="sheet-handle" className={listSheetHandle} />
      {children ?? (
        <div className="grid gap-1 sheet:mx-auto">
          <CalendarHeader>
            <CalendarHeading />
            <CalendarPrevious />
            <CalendarNext />
          </CalendarHeader>
          <CalendarGrid>
            <CalendarWeekdays>{(index) => <CalendarWeekday index={index} />}</CalendarWeekdays>
            <CalendarWeeks>{(cell) => <CalendarDay value={cell.date} />}</CalendarWeeks>
          </CalendarGrid>
        </div>
      )}
    </Ui.DatePickerContent>
  );
}

/** A date or range the popup picks in one press, like "End of month". It shows as chosen while its value is. */
export function DatePickerPreset({ className, ...props }: Loose<ComponentProps<typeof Ui.DatePickerPreset>>) {
  return (
    <Ui.DatePickerPreset
      className={cn(
        "relative hit-area inline-flex h-control-sm items-center rounded-md px-2 text-control outline-none",
        "hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        "data-selected:bg-primary-subtle data-selected:text-primary-subtle-foreground disabled:opacity-50",
        className,
      )}
      {...defined(props)}
    />
  );
}

/**
 * The error a DatePicker shows on submit when its text isn't a date it takes, in the locale's order: "Enter a date
 * like 31/12/2026". A picker with `min`, `max` or unavailable days says its rule as children instead.
 */
export function DatePickerError(props: DateFieldErrorProps) {
  return <DateFieldError kind="date" {...props} />;
}

export type DateFieldErrorProps = Omit<ComponentProps<typeof FieldError>, "match" | "errors"> & {
  /** What a required field says when nothing was entered: "Enter the move-in date." Defaults to "Enter a date". */
  missing?: ReactNode | undefined;
  /** The locale the field shows, when it isn't the page's. */
  locale?: string | undefined;
};

/** Whether the date or time field in this Field holds nothing typed at all (as opposed to a part of a date). */
function fieldIsEmpty(field: Element) {
  const segmented = field.querySelector("[data-slot=date-input][role=group], [data-slot=time-input][role=group]");
  if (segmented) return segmented.hasAttribute("data-empty");
  const inputs = field.querySelectorAll<HTMLInputElement>(
    "input[data-slot=date-picker-input], input[type=date], input[type=time], input[type=datetime-local]",
  );
  return [...inputs].every((input) => input.value === "");
}

/**
 * The one error line of a date or time field, shown on submit as Field shows every error. An empty required field
 * says `missing`. Anything else it refuses (text that isn't a date, a partly typed one, past `min` or `max`, an
 * unavailable day), ui-sdk reports as one custom validity, so the line asks for the format in the locale's order:
 * "Enter a date like 31/12/2026". A field with `min`, `max` or unavailable days says its rule as children instead
 * ("Choose a weekday in December"). Shared by DatePickerError, DateInputError and TimeInputError.
 */
export function DateFieldError({ kind, missing, locale, children, ...props }: DateFieldErrorProps & { kind: DateFieldKind }) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const resolved = useFieldLocale(element, locale);
  const [empty, setEmpty] = useState(false);
  useLayoutEffect(() => {
    const field = element?.closest("[data-slot=field]");
    if (!field) return;
    const read = () => setEmpty(fieldIsEmpty(field));
    read();
    // ui-sdk writes data-empty in the render after the keystroke, so read once that frame is drawn.
    const later = () => requestAnimationFrame(read);
    field.addEventListener("input", later);
    field.addEventListener("keyup", later);
    return () => {
      field.removeEventListener("input", later);
      field.removeEventListener("keyup", later);
    };
  }, [element]);
  const what = kind === "time" ? "Enter a time" : kind === "date" ? "Enter a date" : "Enter a date and time";
  return (
    <FieldError ref={setElement} {...props}>
      {empty ? (missing ?? what) : (children ?? exampleMessage(kind, resolved))}
    </FieldError>
  );
}

export type NativeDateFieldProps<R extends string> = {
  type: "date" | "datetime-local" | "time";
  slot: string;
  value?: string | null | undefined;
  defaultValue?: string | null | undefined;
  onValueChange?: ((value: string | null, details: ChangeDetails<R>) => void) | undefined;
  reason: R;
  step?: number | undefined;
  min?: string | undefined;
  max?: string | undefined;
  name?: string | undefined;
  form?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;
  id?: string | undefined;
  invalid?: boolean | undefined;
  size?: PickerSize | undefined;
  /** A function of ui-sdk's state has no state to read here, so only a plain class name applies. */
  className?: string | ((state: never) => string | undefined) | undefined;
  "aria-label"?: string | undefined;
};

/**
 * The phone's own date or time picker: a native input in the field look, joined to the Field by ui-sdk's
 * FieldControl. Its value is the same string ui-sdk's field posts ("2026-11-21", "14:30", "2026-11-21T14:30"). It
 * reports a change as ui-sdk does, and `details.cancel()` puts the old value back. Agents can't fill a native date
 * input, so it only renders where the OS picker is the better control.
 */
/** Shared by DatePicker, DateInput and TimeInput on a phone. */
export function NativeDateField<R extends string>(props: NativeDateFieldProps<R>) {
  const { type, slot, value, defaultValue, onValueChange, reason, invalid, size, className, ...rest } = props;
  const [current, setCurrent] = useState(defaultValue ?? "");
  const shown = value === undefined ? current : (value ?? "");
  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const next = input.value || null;
    if (report(onValueChange, next, { reason, event: event.nativeEvent })) setCurrent(next ?? "");
    else input.value = shown;
  };
  return (
    <span data-slot={slot} className={cn("relative inline-flex w-full min-w-0", typeof className === "string" && className)}>
      <FieldControl
        // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- FieldControl joins it to the Field's label.
        render={<input type={type} />}
        {...defined(rest)}
        {...(value !== undefined ? { value: shown } : { defaultValue: defaultValue ?? "" })}
        onChange={change}
        aria-invalid={invalid || undefined}
        className={cn(fieldControl({ size }), "pointer-coarse:min-h-11 dark:[color-scheme:dark]")}
      />
    </span>
  );
}
