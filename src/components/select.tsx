import { FieldControl } from "@ui-sdk/react/field";
import {
  Select as SelectRoot,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useSyncExternalStore, type ChangeEvent } from "react";
import { defined, fieldControl, listItem, listPopup, type PickerSize } from "#avenue/lib/picker";
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
  "aria-describedby"?: string | undefined;
  invalid?: boolean | undefined;
  disabled?: boolean | undefined;
  required?: boolean | undefined;
  /**
   * Which list opens. "auto" (default) opens the OS picker on touch-first devices and Avenue's list elsewhere; the
   * closed control looks the same either way (UI Designer, AVE-7).
   */
  native?: Native | undefined;
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
  size,
  className,
  ...aria
}: SelectProps<V>) {
  const coarsePointer = useCoarsePointer();
  const useNative = native === "always" || (native === "auto" && coarsePointer);
  const chevron = <ChevronDownIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />;

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
            "appearance-none truncate pe-8 data-placeholder:text-muted-foreground dark:[color-scheme:dark]",
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
      {...defined({ placeholder, name, disabled, required })}
    >
      <SelectTrigger
        id={id}
        aria-invalid={invalid || undefined}
        {...aria}
        className={cn(fieldControl({ size }), "justify-between text-start", className)}
      >
        <SelectValue className="min-w-0 flex-1 truncate data-placeholder:text-muted-foreground" />
        {chevron}
      </SelectTrigger>
      <SelectContent side="bottom" align="start" sideOffset={4} className={listPopup}>
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
      </SelectContent>
    </SelectRoot>
  );
}
