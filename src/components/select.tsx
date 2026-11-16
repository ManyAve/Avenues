import { FieldControl } from "@ui-sdk/react/field";
import {
  Select as SelectRoot,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectList,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useState, useSyncExternalStore, type ChangeEvent } from "react";
import {
  fieldControl,
  listItem,
  listPopup,
  listScroll,
  listSheetHandle,
  type PickerSize,
  type Presentation,
} from "#avenue/lib/picker";
import { defined } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
  disabled?: boolean | undefined;
}

type Native = "auto" | "always" | "never";

const coarse = "(pointer: coarse)";
function subscribe(onChange: () => void) {
  const query = window.matchMedia(coarse);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
/** True on touch-first devices (phones, tablets), where the OS picker is the better list. */
function useCoarsePointer() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(coarse).matches,
    () => false,
  );
}

export interface SelectProps<V extends string = string> {
  size?: PickerSize | undefined;
  options: readonly SelectOption<V>[];
  /** The chosen value, or null for none (shows `placeholder`). */
  value?: V | null | undefined;
  defaultValue?: V | null | undefined;
  onValueChange?: ((value: V) => void) | undefined;
  /** Shown while nothing is chosen. */
  placeholder?: string | undefined;
  /** The control's id. Inside a Field, leave it out: the Field labels the control itself. */
  id?: string | undefined;
  name?: string | undefined;
  /** Only when there is no visible label (the year select beside "Account summary"). */
  "aria-label"?: string | undefined;
  /** Ids of visible text that names it, where it has no label of its own (a column header plus its row, AVE-98). */
  "aria-labelledby"?: string | undefined;
  "aria-describedby"?: string | undefined;
  invalid?: boolean | undefined;
  disabled?: boolean | undefined;
  required?: boolean | undefined;
  /**
   * Which list opens. "auto" (default) opens the OS picker on touch-first devices and Avenue's list elsewhere; the
   * closed control looks the same either way (UI Designer, AVE-7).
   */
  native?: Native | undefined;
  /**
   * How Avenue's list opens (when the OS picker isn't used, see `native`). "auto" (default) opens it as a bottom sheet
   * on a small touch screen and as a popover elsewhere, decided each time it opens; "sheet" or "popover" always
   * (UX Engineer, AVE-39).
   */
  presentation?: Presentation | undefined;
  className?: string | undefined;
}

/**
 * Pick one value from a short, fixed list (a year, a payment method, a role). Built on ui-sdk's Select: Enter, Space
 * or the arrows open it, typing jumps to a match, Escape closes and keeps the old value. For long or searchable lists
 * use Combobox.
 */
export function Select<V extends string = string>({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  id,
  name,
  invalid,
  disabled,
  required,
  native = "auto",
  presentation = "auto",
  size,
  className,
  ...aria
}: SelectProps<V>) {
  const coarsePointer = useCoarsePointer();
  const useNative = native === "always" || (native === "auto" && coarsePointer);
  const chevron = <ChevronDownIcon aria-hidden className="shrink-0 text-muted-foreground" />;
  // The native overlay below shows the chosen label itself, so it tracks an uncontrolled value.
  const [uncontrolled, setUncontrolled] = useState<V | null>(defaultValue ?? null);
  const current = value !== undefined ? value : uncontrolled;

  if (useNative && size === "sm" && coarsePointer) {
    // AVE-22 (UI Designer): on a phone an sm select (a card or dialog header) keeps its drawn 28px, and its tap area
    // is 44px. A native <select> can't carry hit-area's ::after, so the OS picker's <select> is laid invisibly over a
    // 44px band across the field (it is the control: focusable, labelled by the Field, opened by a tap), and the
    // field underneath draws its value and its focus, invalid and disabled states from it.
    const chosen = options.find((o) => o.value === current);
    return (
      <span data-slot="select" className={cn("relative inline-flex w-full min-w-0", className)}>
        <FieldControl
          // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- FieldControl joins it to the Field's label.
          render={<select />}
          id={id}
          name={name}
          disabled={disabled}
          required={required}
          {...(value !== undefined ? { value: value ?? "" } : {})}
          {...(defaultValue !== undefined ? { defaultValue: defaultValue ?? "" } : {})}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const found = options.find((o) => o.value === event.currentTarget.value);
            if (!found) return;
            setUncontrolled(found.value);
            onValueChange?.(found.value);
          }}
          aria-invalid={invalid || undefined}
          {...aria}
          className="peer absolute inset-x-0 top-1/2 z-10 h-11 w-full -translate-y-1/2 cursor-pointer appearance-none text-base opacity-0 disabled:cursor-not-allowed"
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </FieldControl>
        <span
          aria-hidden
          data-placeholder={chosen ? undefined : true}
          className={cn(
            fieldControl({ size }),
            "pe-8 data-placeholder:text-muted-foreground",
            "peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
            "peer-aria-invalid:border-destructive peer-aria-invalid:ring-3 peer-aria-invalid:ring-destructive/20 dark:peer-aria-invalid:border-destructive/50 dark:peer-aria-invalid:ring-destructive/40",
            "peer-disabled:bg-input/50 peer-disabled:opacity-50 dark:peer-disabled:bg-input/80",
          )}
        >
          <span className="min-w-0 truncate">{chosen?.label ?? placeholder}</span>
        </span>
        <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center">{chevron}</span>
      </span>
    );
  }

  if (useNative) {
    // FieldControl is ui-sdk's seat for a native control: it joins the Field around it (label, description, invalid).
    // Agents can't fill it, so it only renders where the OS picker is the better list.
    const placeholderShown = (value ?? defaultValue ?? null) === null;
    return (
      <span data-slot="select" className={cn("relative inline-flex w-full min-w-0", className)}>
        <FieldControl
          // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- FieldControl joins it to the Field's label.
          render={<select />}
          id={id}
          name={name}
          disabled={disabled}
          required={required}
          {...(value !== undefined ? { value: value ?? "" } : {})}
          {...(defaultValue !== undefined ? { defaultValue: defaultValue ?? "" } : {})}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const found = options.find((o) => o.value === event.currentTarget.value);
            if (found) onValueChange?.(found.value);
          }}
          aria-invalid={invalid || undefined}
          {...aria}
          data-placeholder={placeholderShown || undefined}
          className={cn(
            fieldControl({ size }),
            "pointer-coarse:min-h-11 appearance-none truncate pe-8 data-placeholder:text-muted-foreground dark:[color-scheme:dark]",
          )}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </FieldControl>
        <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center">
          {chevron}
        </span>
      </span>
    );
  }

  return (
    <SelectRoot<V>
      items={options.map((o) =>
        o.disabled
          ? { value: o.value, label: o.label, disabled: true }
          : { value: o.value, label: o.label },
      )}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      onValueChange={(next: V | V[] | null) => {
        if (typeof next === "string") onValueChange?.(next);
      }}
      presentation={presentation}
      {...defined({ placeholder, name, disabled, required })}
    >
      <SelectTrigger
        id={id}
        aria-invalid={invalid || undefined}
        {...aria}
        className={cn(
          fieldControl({ size }),
          // AVE-22: on a phone, md matches the 44px text fields beside it in a form; sm (a header) keeps its size
          // and takes the invisible 44px hit area, like a button.
          size === "sm" ? "relative hit-area" : "pointer-coarse:min-h-11",
          "justify-between text-start",
          className,
        )}
      >
        <SelectValue className="min-w-0 flex-1 truncate data-placeholder:text-muted-foreground" />
        {chevron}
      </SelectTrigger>
      <SelectContent side="bottom" align="start" sideOffset={4} className={listPopup}>
        <div aria-hidden data-slot="sheet-handle" className={listSheetHandle} />
        <SelectList className={listScroll}>
          {options.map((o) => (
            <SelectItem
              key={o.value}
              value={o.value}
              label={o.label}
              className={listItem}
              {...(o.disabled ? { disabled: true } : {})}
            >
              <SelectItemIndicator className="col-start-1 flex">
                <CheckIcon aria-hidden className="size-4" />
              </SelectItemIndicator>
              <span className="col-start-2 min-w-0">{o.label}</span>
            </SelectItem>
          ))}
        </SelectList>
      </SelectContent>
    </SelectRoot>
  );
}
