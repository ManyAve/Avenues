import { Field } from "@base-ui/react/field";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { controlSize, controlSurface } from "#avenue/lib/control";
import { cn } from "#avenue/lib/utils";

/** Select and Combobox come in md (32px, lg corner, the default) and sm (28px, md corner, for a card or dialog header). */
export type PickerSize = "sm" | "md";

/**
 * The closed field every value picker shares (Select trigger, native Select, Combobox input group): Avenue's control
 * surface and size (#avenue/lib/control), plus the states a wrapper needs. Base UI's Field marks an invalid Select
 * trigger with data-invalid, and a Combobox's invalid input sits inside the group, so both show the invalid ring.
 * sm text is 14px on wider screens to sit beside a header's 14px line; it stays 16px on phones so iOS doesn't zoom.
 */
export function fieldControl({ size = "md" }: { size?: PickerSize | null | undefined } = {}) {
  return cn(
    controlSurface,
    controlSize({ size: size ?? "md" }),
    "flex items-center gap-2 text-foreground",
    "data-invalid:border-destructive data-invalid:ring-3 data-invalid:ring-destructive/20 dark:data-invalid:border-destructive/50 dark:data-invalid:ring-destructive/40",
    "has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50",
    "has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40",
    size === "sm" && "md:text-control",
  );
}

/** The open list's frame, shared with Combobox: the app's menu look (lg corner, popover colours, ring). */
export const listPopup =
  "max-h-[min(20rem,var(--available-height))] min-w-(--anchor-width) max-w-[min(28rem,var(--available-width))] origin-(--transform-origin) overflow-y-auto overscroll-contain rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none " +
  "duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";

/** One row in that list: sm corner, inset 4px inside the lg frame (AVE-2 section 4). */
export const listItem =
  "grid cursor-default grid-cols-[1rem_1fr] items-center gap-x-2 rounded-sm px-2 py-1 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50";

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
  /** The control's id. Inside a Base UI Field, leave it out: the Field labels the control itself. */
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
 * Pick one value from a short, fixed list (a year, a payment method, a role). Built on Base UI Select: Enter, Space
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
    // The OS picker opens; the closed control is still Avenue's (same height, corner, border, chevron).
    // Field.Control registers it with an enclosing Base UI Field, so Field.Label and invalid state still wire up.
    const placeholderShown = (value ?? defaultValue ?? null) === null;
    return (
      <span data-slot="select" className={cn("relative inline-flex w-full min-w-0", className)}>
        <Field.Control
          render={
            <select>
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
            </select>
          }
          id={id}
          name={name}
          disabled={disabled}
          required={required}
          {...(value !== undefined ? { value: value ?? "" } : {})}
          {...(defaultValue !== undefined ? { defaultValue: defaultValue ?? "" } : {})}
          onValueChange={(next) => {
            const found = options.find((o) => o.value === next);
            if (found) onValueChange?.(found.value);
          }}
          aria-invalid={invalid || undefined}
          {...aria}
          data-placeholder={placeholderShown || undefined}
          className={cn(
            fieldControl({ size }),
            "appearance-none truncate pe-8 data-placeholder:text-muted-foreground dark:[color-scheme:dark]",
          )}
        />
        <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center">{chevron}</span>
      </span>
    );
  }

  return (
    <SelectPrimitive.Root<V>
      items={options}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      onValueChange={(next) => {
        if (next !== null) onValueChange?.(next);
      }}
      id={id}
      name={name}
      disabled={disabled}
      required={required}
    >
      <SelectPrimitive.Trigger
        data-slot="select"
        aria-invalid={invalid || undefined}
        {...aria}
        className={cn(fieldControl({ size }), "justify-between text-start", className)}
      >
        <SelectPrimitive.Value
          placeholder={placeholder}
          className="min-w-0 flex-1 truncate data-placeholder:text-muted-foreground"
        />
        <SelectPrimitive.Icon className="flex">{chevron}</SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          sideOffset={4}
          alignItemWithTrigger={false}
          align="start"
          className="isolate z-50 outline-none"
        >
          <SelectPrimitive.Popup data-slot="select-content" className={cn(listPopup, "w-max")}>
            <SelectPrimitive.List>
              {options.map((o) => (
                <SelectPrimitive.Item key={o.value} value={o.value} disabled={o.disabled} className={listItem}>
                  <SelectPrimitive.ItemIndicator className="col-start-1 flex">
                    <CheckIcon aria-hidden className="size-4" />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText className="col-start-2 min-w-0">{o.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

