import { FieldControl } from "@ui-sdk/react/field";
import * as Ui from "@ui-sdk/react/select";
import type { SelectValueChangeReason } from "@ui-sdk/react/select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useState, type ChangeEvent, type ComponentProps, type ReactNode } from "react";
import { report, type ChangeDetails } from "#avenue/lib/change";
import {
  fieldControl,
  flatItems,
  isGroup,
  isSeparator,
  listGroupLabel,
  listItem,
  listPopup,
  listScroll,
  listSeparator,
  listSheetHandle,
  entryKeys,
  toItem,
  toUiData,
  valueKey,
  type ListData,
  type ListGroup,
  type ListItem,
  type ListSeparator,
  type PickerSize,
  type Presentation,
} from "#avenue/lib/picker";
import { defined, type Loose, type NodeChildren } from "#avenue/lib/props";
import { useCoarsePointer } from "#avenue/lib/pointer";
import { cn } from "#avenue/lib/utils";

export type { ListData, ListGroup, ListItem, ListSeparator };

type Native = "auto" | "always" | "never";

/** What `onValueChange` gets after the value: ui-sdk Select's own details (reason, event, source, `cancel()`). */
export type SelectValueChangeDetails = ChangeDetails<SelectValueChangeReason>;


const chevron = <ChevronDownIcon aria-hidden className="shrink-0 text-muted-foreground" />;

/**
 * The closed field: Avenue's control surface at `size` (md 32px by default, sm 28px for a card or dialog header), with
 * the chevron after its children. Put a `SelectValue` in it.
 */
function SelectTrigger({
  size,
  className,
  children,
  ...props
}: NodeChildren<Loose<ComponentProps<typeof Ui.SelectTrigger>>> & { size?: PickerSize | undefined }) {
  return (
    <Ui.SelectTrigger
      className={cn(
        fieldControl({ size }),
        // AVE-22: on a phone, md matches the 44px text fields beside it in a form; sm (a header) keeps its size
        // and takes the invisible 44px hit area, like a button.
        size === "sm" ? "relative hit-area" : "pointer-coarse:min-h-11",
        "justify-between text-start",
        className,
      )}
      {...defined(props)}
    >
      {children}
      {chevron}
    </Ui.SelectTrigger>
  );
}

/** The chosen item's label in the trigger, or the select's `placeholder` in the placeholder token (AVE-186). */
function SelectValue({ className, ...props }: Loose<ComponentProps<typeof Ui.SelectValue>>) {
  return (
    <Ui.SelectValue
      className={cn("min-w-0 flex-1 truncate data-placeholder:text-placeholder", className)}
      {...defined(props)}
    />
  );
}

/**
 * The open list: a popover as wide as the trigger, or a bottom sheet on a small touch screen (`presentation`), with
 * the sheet's handle. Its children are the items, groups and separators.
 */
function SelectContent({
  side = "bottom",
  align = "start",
  sideOffset = 4,
  className,
  children,
  ...props
}: NodeChildren<Loose<ComponentProps<typeof Ui.SelectContent>>>) {
  return (
    <Ui.SelectContent
      side={side}
      align={align}
      sideOffset={sideOffset}
      className={cn(listPopup, className)}
      {...defined(props)}
    >
      <div aria-hidden data-slot="sheet-handle" className={listSheetHandle} />
      <Ui.SelectList className={listScroll}>{children}</Ui.SelectList>
    </Ui.SelectContent>
  );
}

type SelectItemProps<T> = NodeChildren<Loose<ComponentProps<typeof Ui.SelectItem<T>>>>;

/**
 * One choice: the check while it is chosen, then its children (a label, or a label and a second line). Give it
 * `label` when the children aren't plain text, for the trigger and type-ahead. 44px tall on phones and in a sheet.
 */
function SelectItem<T = string>({ value, className, children, label, ...props }: SelectItemProps<T>) {
  const text = label ?? (typeof children === "string" ? children : undefined);
  return (
    <Ui.SelectItem<T> value={value} className={cn(listItem, className)} {...defined({ label: text })} {...defined(props)}>
      <Ui.SelectItemIndicator className="col-start-1 flex">
        <CheckIcon aria-hidden className="size-4" />
      </Ui.SelectItemIndicator>
      <span className="col-start-2 min-w-0">{children}</span>
    </Ui.SelectItem>
  );
}

/** Items that belong together, named by a `SelectGroupLabel`. */
function SelectGroup(props: Loose<ComponentProps<typeof Ui.SelectGroup>>) {
  return <Ui.SelectGroup {...defined(props)} />;
}

/** A group's heading, in line with its items' text. Screen readers announce it with the group. */
function SelectGroupLabel({ className, ...props }: Loose<ComponentProps<typeof Ui.SelectGroupLabel>>) {
  return <Ui.SelectGroupLabel className={cn(listGroupLabel, className)} {...defined(props)} />;
}

/** A line between items or groups. Not an option. */
function SelectSeparator({ className, ...props }: Loose<ComponentProps<typeof Ui.SelectSeparator>>) {
  return <Ui.SelectSeparator className={cn(listSeparator, className)} {...defined(props)} />;
}

/** The props the root and the one-tag Select share: the value, the items and the form. */
interface SelectRootProps<T> {
  /**
   * The choices, in ui-sdk's shape: `{ value, label, disabled? }`, a plain string (its own value and label), a group
   * `{ type: "group", label, items }` or a separator `{ type: "separator" }`. A value may be an object, with
   * `itemToValue`. With parts as children, `items` gives the trigger its labels before the list opens.
   */
  items?: ListData<T> | undefined;
  /** The chosen value, or null for none (shows `placeholder`). */
  value?: T | null | undefined;
  defaultValue?: T | null | undefined;
  /**
   * Gets the new value and ui-sdk's details. On the OS picker Avenue builds them itself, with reason "item-press", the
   * select's change event and how it was chosen; `details.cancel()` puts the old value back there too (AVE-145).
   */
  onValueChange?: ((value: T, details: SelectValueChangeDetails) => void) | undefined;
  /** For object values: the string a value is known and posted by. Strings are themselves, objects their `value` or `id`. */
  itemToValue?: ((value: T) => string) | undefined;
  /** For object values: the text a value shows in the trigger. */
  itemToLabel?: ((value: T) => string) | undefined;
  /** For object values: whether an item's value is the chosen one, when they aren't the same object. */
  isItemEqualToValue?: ((itemValue: T, value: T) => boolean) | undefined;
  /** Shown while nothing is chosen. */
  placeholder?: string | undefined;
  name?: string | undefined;
  disabled?: boolean | undefined;
  required?: boolean | undefined;
  /**
   * How the list opens (when the OS picker isn't used, see `native`). "auto" (default) opens it as a bottom sheet
   * on a small touch screen and as a popover elsewhere, decided each time it opens; "sheet" or "popover" always
   * (UX Engineer, AVE-39).
   */
  presentation?: Presentation | undefined;
}

/** Built from parts: `Select` holds the value and the items, and its children are the trigger and the list. */
type SelectPartsProps<T> = SelectRootProps<T> & {
  children: ReactNode;
  size?: undefined;
  native?: undefined;
  id?: undefined;
  invalid?: undefined;
  className?: undefined;
  "aria-label"?: undefined;
  "aria-labelledby"?: undefined;
  "aria-describedby"?: undefined;
};

/** The one-tag Select: Avenue draws the trigger and the list from `items`. */
type SelectWrapperProps<T> = SelectRootProps<T> & {
  children?: undefined;
  size?: PickerSize | undefined;
  /** The control's id. Inside a Field, leave it out: the Field labels the control itself. */
  id?: string | undefined;
  /** Only when there is no visible label (the year select beside "Account summary"). */
  "aria-label"?: string | undefined;
  /** Ids of visible text that names it, where it has no label of its own (a column header plus its row, AVE-98). */
  "aria-labelledby"?: string | undefined;
  "aria-describedby"?: string | undefined;
  invalid?: boolean | undefined;
  /**
   * Which list opens. "auto" (default) opens the OS picker on touch-first devices and Avenue's list elsewhere; the
   * closed control looks the same either way (UI Designer, AVE-7). The OS picker is drawn from `items`, so it is
   * only in the one-tag Select; built from parts, a Select opens ui-sdk's sheet on a phone instead (AVE-146).
   */
  native?: Native | undefined;
  className?: string | undefined;
};

export type SelectProps<T = string> = SelectPartsProps<T> | SelectWrapperProps<T>;

/** The list `items` describe, drawn with Avenue's parts. */
function SelectItems<T>({ data, keyOf }: { data: ListData<T>; keyOf: (value: T) => string }) {
  const item = (entry: ListItem<T> | (T & string)) => {
    const { value, label, disabled } = toItem<T, ListItem<T>>(entry);
    return (
      <SelectItem<T> key={keyOf(value)} value={value} label={label} {...(disabled ? { disabled: true } : {})}>
        {label}
      </SelectItem>
    );
  };
  const keys = entryKeys(data, keyOf);
  return data.map((entry, i) =>
    isSeparator(entry) ? (
      <SelectSeparator key={keys[i]} />
    ) : isGroup(entry) ? (
      <SelectGroup key={keys[i]}>
        {entry.label !== undefined && <SelectGroupLabel>{entry.label}</SelectGroupLabel>}
        {entry.items.map(item)}
      </SelectGroup>
    ) : (
      item(entry)
    ),
  );
}

/**
 * Pick one value from a short, fixed list (a year, a payment method, a role). Built on ui-sdk's Select: Enter, Space
 * or the arrows open it, typing jumps to a match, Escape closes and keeps the old value. For long or searchable lists
 * use Combobox.
 *
 * Two forms, as ui-sdk's Select has (AVE-146). With `items` and no children it is one tag: Avenue draws the trigger,
 * the list, its groups and separators, and on a touch screen opens the OS picker. With children it is the root of
 * ui-sdk's composition, and the children are the parts:
 *
 * ```tsx
 * <Select items={members} itemToValue={(m) => m.id} itemToLabel={(m) => m.name}>
 *   <SelectTrigger><SelectValue /></SelectTrigger>
 *   <SelectContent>
 *     {members.map((m) => <SelectItem key={m.id} value={m} label={m.name}>…</SelectItem>)}
 *   </SelectContent>
 * </Select>
 * ```
 */
export function Select<T = string>(props: SelectProps<T>) {
  const {
    items: itemsProp,
    value,
    defaultValue,
    onValueChange,
    itemToValue,
    itemToLabel,
    isItemEqualToValue,
    placeholder,
    name,
    disabled,
    required,
    presentation = "auto",
  } = props;
  const items: ListData<T> = itemsProp ?? [];
  const keyOf = valueKey(itemToValue);
  const coarsePointer = useCoarsePointer();
  // The native overlay below shows the chosen label itself, so it tracks an uncontrolled value.
  const [uncontrolled, setUncontrolled] = useState<T | null>(defaultValue ?? null);
  const current = value !== undefined ? value : uncontrolled;

  const root = (children: ReactNode) => (
    <Ui.Select<T>
      {...(itemsProp !== undefined ? { items: toUiData(items) as Ui.ListData<T> } : {})}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      onValueChange={(next: T | T[] | null, details: SelectValueChangeDetails) => {
        if (next !== null && !Array.isArray(next)) onValueChange?.(next, details);
      }}
      presentation={presentation}
      {...defined({ itemToValue, itemToLabel, isItemEqualToValue, placeholder, name, disabled, required })}
    >
      {children}
    </Ui.Select>
  );

  if (props.children !== undefined) return root(props.children);

  const { id, invalid, native = "auto", size, className } = props;
  const aria = defined({
    "aria-label": props["aria-label"],
    "aria-labelledby": props["aria-labelledby"],
    "aria-describedby": props["aria-describedby"],
  });
  const useNative = native === "always" || (native === "auto" && coarsePointer);

  if (useNative) {
    const all = flatItems(items);
    const keys = entryKeys(items, keyOf);
    const same = isItemEqualToValue ?? ((a: T, b: T) => keyOf(a) === keyOf(b));
    // The OS picker's change, reported as ui-sdk reports a choice. A canceled one puts the old value back in the
    // select, which the browser has already changed.
    const pick = (event: ChangeEvent<HTMLInputElement>) => {
      const select = event.currentTarget;
      const found = all.find((o) => keyOf(o.value) === select.value);
      if (!found) return;
      if (report(onValueChange, found.value, { reason: "item-press", event: event.nativeEvent })) {
        setUncontrolled(found.value);
      } else select.value = current === null ? "" : keyOf(current);
    };
    const option = (entry: ListItem<T> | (T & string)) => {
      const o = toItem<T, ListItem<T>>(entry);
      return (
        <option key={keyOf(o.value)} value={keyOf(o.value)} disabled={o.disabled}>
          {o.label}
        </option>
      );
    };
    // Groups become the OS picker's own groups; it has no separators, so those are left out.
    const nativeOptions = (
      <>
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {items.map((entry, i) =>
          isSeparator(entry) ? null : isGroup(entry) ? (
            <optgroup key={keys[i]} label={entry.label}>
              {entry.items.map(option)}
            </optgroup>
          ) : (
            option(entry)
          ),
        )}
      </>
    );
    const shared = {
      id,
      name,
      disabled,
      required,
      ...(value !== undefined ? { value: value === null ? "" : keyOf(value) } : {}),
      ...(defaultValue !== undefined ? { defaultValue: defaultValue === null ? "" : keyOf(defaultValue) } : {}),
      onChange: pick,
      "aria-invalid": invalid || undefined,
      ...aria,
    };

    if (size === "sm" && coarsePointer) {
      // AVE-22 (UI Designer): on a phone an sm select (a card or dialog header) keeps its drawn 28px, and its tap area
      // is 44px. A native <select> can't carry hit-area's ::after, so the OS picker's <select> is laid invisibly over a
      // 44px band across the field (it is the control: focusable, labelled by the Field, opened by a tap), and the
      // field underneath draws its value and its focus, invalid and disabled states from it.
      const chosen = current === null ? undefined : all.find((o) => same(o.value, current));
      const chosenLabel = chosen?.label ?? (current !== null && itemToLabel ? itemToLabel(current) : undefined);
      return (
        <span data-slot="select" className={cn("relative inline-flex w-full min-w-0", className)}>
          <FieldControl
            // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- FieldControl joins it to the Field's label.
            render={<select />}
            {...shared}
            className="peer absolute inset-x-0 top-1/2 z-10 h-11 w-full -translate-y-1/2 cursor-pointer appearance-none text-base opacity-0 disabled:cursor-not-allowed"
          >
            {nativeOptions}
          </FieldControl>
          <span
            aria-hidden
            data-placeholder={chosenLabel === undefined ? true : undefined}
            className={cn(
              fieldControl({ size }),
              "pe-8 data-placeholder:text-placeholder",
              "peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/20 forced-colors:peer-focus-visible:outline-2 forced-colors:peer-focus-visible:outline-offset-2 forced-colors:peer-focus-visible:outline-solid",
              "peer-aria-invalid:border-destructive peer-aria-invalid:ring-3 peer-aria-invalid:ring-destructive/20 dark:peer-aria-invalid:border-destructive/50 dark:peer-aria-invalid:ring-destructive/40",
              "peer-disabled:bg-input/50 peer-disabled:opacity-50 dark:peer-disabled:bg-input/80",
            )}
          >
            <span className="min-w-0 truncate">{chosenLabel ?? placeholder}</span>
          </span>
          <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center">{chevron}</span>
        </span>
      );
    }

    // FieldControl is ui-sdk's seat for a native control: it joins the Field around it (label, description, invalid).
    // Agents can't fill it, so it only renders where the OS picker is the better list.
    const placeholderShown = (value ?? defaultValue ?? null) === null;
    return (
      <span data-slot="select" className={cn("relative inline-flex w-full min-w-0", className)}>
        <FieldControl
          // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- FieldControl joins it to the Field's label.
          render={<select />}
          {...shared}
          data-placeholder={placeholderShown || undefined}
          className={cn(
            fieldControl({ size }),
            "pointer-coarse:min-h-11 appearance-none truncate pe-8 data-placeholder:text-placeholder dark:[color-scheme:dark]",
          )}
        >
          {nativeOptions}
        </FieldControl>
        <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center">{chevron}</span>
      </span>
    );
  }

  return root(
    <>
      <SelectTrigger size={size} {...defined({ id })} aria-invalid={invalid || undefined} {...aria} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItems data={items} keyOf={keyOf} />
      </SelectContent>
    </>,
  );
}

export { SelectContent, SelectGroup, SelectGroupLabel, SelectItem, SelectSeparator, SelectTrigger, SelectValue };
