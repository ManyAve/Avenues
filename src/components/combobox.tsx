import * as Ui from "@ui-sdk/react/combobox";
import type { ComboboxValueChangeReason } from "@ui-sdk/react/combobox";
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";
import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
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
  valueKey,
  type ListData,
  type ListGroup,
  type ListItem,
  type ListSeparator,
  type PickerSize,
  type Presentation,
} from "#avenue/lib/picker";
import { defined, type Loose, type NodeChildren } from "#avenue/lib/props";
import { cn } from "#avenue/lib/utils";

export type { ListData, ListGroup, ListItem, ListSeparator };

/**
 * One choice in a Combobox's `items`: ui-sdk's item (`value`, `label`, `keywords`, `disabled`), plus two Avenue
 * additions the one-tag Combobox draws in the list.
 */
export type ComboboxItemData<T = string> = ListItem<T> & {
  /** Muted text after the label in the list, e.g. "$120.00 owing". Display only; the default search ignores it. */
  hint?: string | undefined;
  /** Right-aligned muted text in the list, e.g. "ID 1042". */
  meta?: string | undefined;
};

/** @deprecated Use `ComboboxItemData`, the shape of each entry in `items` (AVE-146). */
export type ComboboxOption = ComboboxItemData<string>;

// ui-sdk treats an empty value as nothing chosen, so the "none" option carries its own value inside the component. A
// form gets "" for it instead, like a native select's empty option (see the hidden input below).
const NONE = "\u0000none";
const NO_ITEMS: readonly never[] = [];
type None = typeof NONE;

/** "" is the old "nothing chosen" (AVE-137); it still reads as null until both apps have moved off it. */
const chosen = <T,>(value: T | null | undefined): T | null => (value === "" || value === undefined ? null : value);

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Default search: every word typed appears in the label or a keyword (case- and accent-insensitive). */
function matchWords(item: ListItem<unknown>, query: string): boolean {
  const text = fold([item.label, ...(item.keywords ?? [])].join(" "));
  return fold(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => text.includes(w));
}

/** What `onValueChange` gets after the value: ui-sdk Combobox's own details (reason, event, source, `cancel()`). */
export type ComboboxValueChangeDetails = ChangeDetails<ComboboxValueChangeReason>;

/** What the parts share through the root: the field the popup lines up with, and whether the field is disabled. */
type Shared = { anchor: HTMLDivElement | null; setAnchor: (element: HTMLDivElement | null) => void; disabled: boolean };
const SharedContext = createContext<Shared | null>(null);

function useShared(part: string): Shared {
  const shared = use(SharedContext);
  if (!shared) throw new Error(`${part} goes inside Avenue's Combobox.`);
  return shared;
}

/** The root's props Avenue hands on to ui-sdk's single-value Combobox. */
type RootProps<V> = {
  value?: V | null | undefined;
  defaultValue?: V | null | undefined;
  onValueChange?: ((value: V | null, details: ComboboxValueChangeDetails) => void) | undefined;
  onQueryChange?: ((query: string, details: { reason: string; cancel: () => void }) => void) | undefined;
  filter?: ((item: ListItem<V>, query: string) => boolean | number) | undefined;
  itemToValue?: ((value: V) => string) | undefined;
  itemToLabel?: ((value: V) => string) | undefined;
  isItemEqualToValue?: ((itemValue: V, value: V) => boolean) | undefined;
  name?: string | undefined;
  form?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  presentation?: Presentation | undefined;
  children?: ReactNode;
};

/** The root and its shared state, for both forms. */
function ComboboxRoot<V>({ disabled, presentation = "auto", filter, children, ...props }: RootProps<V>) {
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const shared = useMemo(() => ({ anchor, setAnchor, disabled: !!disabled }), [anchor, disabled]);
  return (
    <SharedContext value={shared}>
      <Ui.Combobox<V>
        autoHighlight
        presentation={presentation}
        {...defined({ disabled })}
        {...(filter ? { filter: filter as (item: Ui.ListItem<V>, query: string) => boolean | number } : {})}
        {...defined(props)}
      >
        {children}
      </Ui.Combobox>
    </SharedContext>
  );
}

type InputProps = Omit<Loose<ComponentProps<typeof Ui.ComboboxInput>>, "size" | "className"> & {
  size?: PickerSize | undefined;
  /** A leading icon (house, globe). Decorative. */
  icon?: ReactNode | undefined;
  invalid?: boolean | undefined;
  /** Names the chevron button for screen readers ("Show households"). */
  triggerLabel?: string | undefined;
  /**
   * Names the phone's clear button. By default "Clear" and the field's label in lower case ("Clear household"),
   * read from the input's label or `aria-label`.
   */
  clearLabel?: string | undefined;
  /** Classes for the whole field, not only the text input inside it. */
  className?: string | undefined;
};

/**
 * The closed field: the search input in Avenue's control surface, with an optional leading icon, the phone's clear
 * button and the chevron. Its list opens lined up with the whole field.
 *
 * Icons are the app's 14px (its time-zone picker, AVE-59): the leading icon, the chevron and the check. The leading
 * icon sits 8px from the edge where the app's sits 10px, the AVE-2 section 1 step inside a control.
 */
function ComboboxInput({
  size,
  icon,
  invalid,
  triggerLabel = "Show options",
  clearLabel,
  placeholder,
  className,
  onFocus,
  onMouseUp,
  onBlur,
  ...props
}: InputProps) {
  const { setAnchor, disabled } = useShared("ComboboxInput");
  // Focus selects the whole label so typing replaces it; the click that focused must not undo that selection.
  const focusing = useRef(false);
  // The clear button's name follows the field's own label, which a Field gives the input after it mounts.
  const inputRef = useRef<HTMLInputElement>(null);
  const [fieldName, setFieldName] = useState<string | undefined>();
  useLayoutEffect(() => {
    const element = inputRef.current;
    const label = element?.getAttribute("aria-label") ?? element?.labels?.[0]?.textContent ?? undefined;
    setFieldName(label?.trim().toLowerCase() || undefined);
  }, []);
  return (
    <div
      ref={setAnchor}
      data-slot="combobox"
      data-disabled={disabled || undefined}
      className={cn(fieldControl({ size }), "gap-0 pe-0 pointer-coarse:min-h-11", icon ? "ps-2" : "ps-0", className)}
    >
      {icon && (
        <span aria-hidden className="flex shrink-0 text-muted-foreground">
          {icon}
        </span>
      )}
      {/* While the list is a sheet, ui-sdk moves the input into the sheet's header, which would leave the field
          looking cleared behind it. This stand-in shows the current choice there until a new one is picked
          (AVE-76). It's aria-hidden: the real field is in the sheet, and it shows only while the input is gone. */}
      <Ui.ComboboxValue>
        {({ label }) => (
          <span
            aria-hidden
            data-slot="combobox-value"
            className={cn(
              "hidden min-w-0 flex-1 truncate px-2 [[data-slot=combobox]:not(:has(>input))>&]:block",
              !label && "text-muted-foreground",
            )}
          >
            {label || placeholder}
          </span>
        )}
      </Ui.ComboboxValue>
      <Ui.ComboboxInput
        ref={inputRef}
        aria-invalid={invalid || undefined}
        {...defined({ placeholder })}
        {...defined(props)}
        onFocus={(e) => {
          focusing.current = true;
          const input = e.currentTarget;
          // On a phone, selected text brings up the system's copy and select handles, so the cursor goes to the end
          // instead; with a mouse or keyboard, the whole label is selected so typing replaces it (AVE-76).
          if (input.ownerDocument.defaultView?.matchMedia("(pointer: coarse)").matches) {
            input.setSelectionRange(input.value.length, input.value.length);
          } else input.select();
          onFocus?.(e);
        }}
        onMouseUp={(e) => {
          if (focusing.current) e.preventDefault();
          focusing.current = false;
          onMouseUp?.(e);
        }}
        onBlur={(e) => {
          focusing.current = false;
          onBlur?.(e);
        }}
        className={cn(
          // w-full: a text field's default width (about 20 characters) is also its smallest, so in a column sized by
          // its content (a grid's automatic column) it set that column's minimum and widened a card past a phone. A
          // percentage width lets the browser shrink it to nothing there, while a row sized by its content still gets
          // the default width (AVE-113). flex-1 sizes it inside the group either way, so nothing else moves.
          "h-full w-full min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
          // In a sheet, ui-sdk moves this input into the sheet's header, where it is a 44px search field of its own.
          "sheet:h-11 sheet:w-full sheet:rounded-lg sheet:border sheet:border-input sheet:px-3 sheet:text-base sheet:transition-colors sheet:focus-visible:border-ring sheet:focus-visible:ring-3 sheet:focus-visible:ring-ring/50 dark:sheet:bg-input/30",
        )}
      />
      {/* On a phone the cursor lands after the chosen label instead of selecting it (AVE-76), so typing would add to
          it; Clear empties the field and the search in one tap, keeps focus in it, and shows only while there is
          something to clear. ui-sdk's own Escape brings the choice back while the list is open. With a mouse,
          select-on-focus does this job, so the button never shows there and the desktop look is unchanged
          (UX Engineer, AVE-93). Undoable, so no agent confirm. */}
      <Ui.ComboboxClear
        aria-label={clearLabel ?? (fieldName ? `Clear ${fieldName}` : "Clear choice")}
        className="relative hit-area hidden h-full w-11 shrink-0 items-center justify-center text-muted-foreground outline-none pointer-coarse:flex disabled:cursor-not-allowed"
      >
        <XIcon aria-hidden />
      </Ui.ComboboxClear>
      <Ui.ComboboxTrigger
        aria-label={triggerLabel}
        className="flex h-full w-8 shrink-0 items-center pointer-coarse:w-11 justify-center text-muted-foreground outline-none disabled:cursor-not-allowed"
      >
        <ChevronsUpDownIcon aria-hidden />
      </Ui.ComboboxTrigger>
    </div>
  );
}

/**
 * The open list: a popover as wide as the whole field, or a bottom sheet on a small touch screen, with the sheet's
 * handle. Put a `ComboboxEmpty` and a `ComboboxList` in it.
 */
function ComboboxContent({
  side = "bottom",
  align = "start",
  sideOffset = 4,
  className,
  children,
  ...props
}: NodeChildren<Loose<ComponentProps<typeof Ui.ComboboxContent>>>) {
  const { anchor } = useShared("ComboboxContent");
  return (
    <Ui.ComboboxContent
      anchor={anchor}
      side={side}
      align={align}
      sideOffset={sideOffset}
      // A sheet keeps one height while the search narrows the list, within the part of the screen above the keyboard.
      className={cn(
        listPopup,
        "not-sheet:has-data-empty:p-0 sheet:h-[calc(var(--visual-viewport-height,100dvh)*0.85)]",
        className,
      )}
      {...defined(props)}
    >
      <div aria-hidden data-slot="sheet-handle" className={listSheetHandle} />
      {children}
    </Ui.ComboboxContent>
  );
}

/** What the list says while nothing matches. Hidden otherwise. */
function ComboboxEmpty({ className, ...props }: Loose<ComponentProps<typeof Ui.ComboboxEmpty>>) {
  return (
    <Ui.ComboboxEmpty
      className={cn("px-3 py-2 text-sm text-muted-foreground not-data-empty:hidden", className)}
      {...defined(props)}
    />
  );
}

/** The options. In a sheet, the part that scrolls. */
function ComboboxList({ className, ...props }: Loose<ComponentProps<typeof Ui.ComboboxList>>) {
  return <Ui.ComboboxList className={cn("scroll-py-1 outline-none", listScroll, className)} {...defined(props)} />;
}

type ComboboxItemProps<T> = NodeChildren<Loose<ComponentProps<typeof Ui.ComboboxItem<T>>>> & {
  /** Right-aligned muted text, e.g. "ID 1042". Display only; searching ignores it. */
  meta?: ReactNode | undefined;
};

/**
 * One choice: the check while it is chosen, then its children (a label, or a label and a second line), then `meta`.
 * Give it `label` when the children aren't plain text: the field shows it once chosen, and the search matches it.
 */
function ComboboxItem<T = string>({ value, className, children, label, meta, ...props }: ComboboxItemProps<T>) {
  const text = label ?? (typeof children === "string" ? children : undefined);
  return (
    <Ui.ComboboxItem<T>
      value={value}
      className={cn(listItem, meta != null && "grid-cols-[1rem_1fr_auto]", className)}
      {...defined({ label: text })}
      {...defined(props)}
    >
      <Ui.ComboboxItemIndicator className="col-start-1 flex">
        <CheckIcon aria-hidden className="size-3.5" />
      </Ui.ComboboxItemIndicator>
      <span className="col-start-2 min-w-0">{children}</span>
      {meta != null && <span className="col-start-3 ps-3 text-control text-muted-foreground tabular-nums">{meta}</span>}
    </Ui.ComboboxItem>
  );
}

/** Items that belong together, named by a `ComboboxGroupLabel`. A search hides a group once none of its items match. */
function ComboboxGroup(props: Loose<ComponentProps<typeof Ui.ComboboxGroup>>) {
  return <Ui.ComboboxGroup {...defined(props)} />;
}

/** A group's heading, in line with its items' text. */
function ComboboxGroupLabel({ className, ...props }: Loose<ComponentProps<typeof Ui.ComboboxGroupLabel>>) {
  return <Ui.ComboboxGroupLabel className={cn(listGroupLabel, className)} {...defined(props)} />;
}

/** A line between items or groups. */
function ComboboxSeparator({ className, ...props }: Loose<ComponentProps<typeof Ui.ComboboxSeparator>>) {
  return <Ui.ComboboxSeparator className={cn(listSeparator, className)} {...defined(props)} />;
}

/** The props both forms share: the value, the search and the form. */
interface ComboboxSharedProps<T, Item extends ComboboxItemData<T>> {
  /**
   * The chosen value, or null for none. Pass it with `onValueChange` to control the field, or leave it out
   * and use `defaultValue`. "" still means none, deprecated (AVE-137) and removed once both apps
   * have moved off it (AVE-154).
   */
  value?: T | null | undefined;
  /** The value chosen at first, when `value` is left out. A form reset returns to it. */
  defaultValue?: T | null | undefined;
  /**
   * Gets the new value, or null when the choice is cleared (the "none" option, or the phone's Clear), and ui-sdk's
   * details. `details.cancel()` keeps the old choice. A form reset reports reason "reset" (AVE-145).
   */
  onValueChange?: ((value: T | null, details: ComboboxValueChangeDetails) => void) | undefined;
  /**
   * Replaces the default word search (every word in the label or a keyword). True keeps an item; a number keeps it
   * and ranks it (higher first), e.g. the household matcher that puts an exact spreadsheet ID first.
   */
  filter?: ((item: Item, query: string) => boolean | number) | undefined;
  /** For object values: the string a value is known and posted by. Strings are themselves, objects their `value` or `id`. */
  itemToValue?: ((value: T) => string) | undefined;
  /** For object values: the text a value shows in the field. */
  itemToLabel?: ((value: T) => string) | undefined;
  /** For object values: whether an item's value is the chosen one, when they aren't the same object. */
  isItemEqualToValue?: ((itemValue: T, value: T) => boolean) | undefined;
  /** The name the chosen value posts under in a form. "None" posts "", and nothing chosen posts nothing. */
  name?: string | undefined;
  /** The id of a form to post with, when the field isn't inside it. */
  form?: string | undefined;
  /** Blocks the form's submit until something is chosen, with the browser's own message. */
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  /**
   * How the list opens. "auto" (default) opens a bottom sheet on a small touch screen, with the search field in the
   * sheet's header and the keyboard closed until it is tapped, and a popover elsewhere, decided each time it opens;
   * "sheet" or "popover" always (UX Engineer, AVE-39).
   */
  presentation?: Presentation | undefined;
}

/** Built from parts: `Combobox` holds the value, and its children are `ComboboxInput` and `ComboboxContent`. */
type ComboboxPartsProps<T, Item extends ComboboxItemData<T>> = ComboboxSharedProps<T, Item> & {
  children: ReactNode;
  items?: undefined;
  options?: undefined;
};

/** The one-tag Combobox: Avenue draws the field and the list from `items`. */
type ComboboxWrapperProps<T, Item extends ComboboxItemData<T>> = ComboboxSharedProps<T, Item> &
  Pick<InputProps, "size" | "icon" | "id" | "aria-label" | "aria-describedby" | "triggerLabel" | "clearLabel" | "invalid" | "placeholder" | "className"> & {
    children?: undefined;
    /**
     * The choices, in ui-sdk's shape: `{ value, label, keywords?, disabled? }` (plus Avenue's `hint` and `meta`), a
     * plain string, a group `{ type: "group", label, items }` or a separator `{ type: "separator" }`. A value may be
     * an object, with `itemToValue` and `itemToLabel`.
     */
    items?: ListData<NoInfer<T>, Item> | undefined;
    /** @deprecated Use `items`, which takes the same entries (AVE-146). */
    options?: readonly Item[] | undefined;
    /** Adds a first option that clears the choice (Documents' "Neighborhood"). Without it, null shows `placeholder`. */
    noneLabel?: string | undefined;
    /** What the list says when nothing matches. Gets the trimmed query. */
    emptyMessage?: ((query: string) => ReactNode) | undefined;
  };

export type ComboboxProps<T = string, Item extends ComboboxItemData<T> = ComboboxItemData<T>> =
  | ComboboxPartsProps<T, Item>
  | ComboboxWrapperProps<T, Item>;

/**
 * A field that searches as you type, for long lists (households, time zones). Arrow keys and Enter choose; Escape,
 * or leaving the field, closes the list and puts the current choice back in the field. Built on ui-sdk's Combobox.
 *
 * Two forms, as ui-sdk's Combobox has (AVE-146). With `items` and no children it is one tag: Avenue draws the field
 * and the list, with groups, separators, a "none" option and the empty message. With children it is the root of
 * ui-sdk's composition, and the children are the parts:
 *
 * ```tsx
 * <Combobox value={owner} onValueChange={setOwner} itemToValue={(o) => o.id} itemToLabel={(o) => o.name}>
 *   <ComboboxInput icon={<UserIcon />} triggerLabel="Show owners" />
 *   <ComboboxContent>
 *     <ComboboxEmpty>No owner matches.</ComboboxEmpty>
 *     <ComboboxList>
 *       {owners.map((o) => <ComboboxItem key={o.id} value={o} label={o.name}>…</ComboboxItem>)}
 *     </ComboboxList>
 *   </ComboboxContent>
 * </Combobox>
 * ```
 */
export function Combobox<Item extends ComboboxItemData<any> = ComboboxItemData, T = Item["value"]>(
  props: ComboboxProps<T, Item>,
) {
  if (props.children !== undefined) {
    const { children, value, defaultValue, onValueChange, filter, ...rest } = props;
    return (
      <ComboboxRoot<T>
        {...(value !== undefined ? { value: chosen(value) } : {})}
        {...(defaultValue !== undefined ? { defaultValue: chosen(defaultValue) } : {})}
        {...(onValueChange ? { onValueChange } : {})}
        {...(filter ? { filter: (item: ListItem<T>, query: string) => filter(item as Item, query) } : {})}
        {...rest}
      >
        {children}
      </ComboboxRoot>
    );
  }
  return <ComboboxFromItems<T, Item> {...(props as ComboboxWrapperProps<T, Item>)} />;
}

/** The one-tag Combobox, drawn from its items with Avenue's parts. */
function ComboboxFromItems<T, Item extends ComboboxItemData<T>>({
  items: itemsProp,
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  form,
  required,
  noneLabel,
  placeholder,
  emptyMessage = (query) => (query ? `Nothing matches “${query}”.` : "Nothing to choose from yet."),
  filter = matchWords,
  itemToValue,
  itemToLabel,
  isItemEqualToValue,
  disabled,
  presentation = "auto",
  ...input
}: ComboboxWrapperProps<T, Item>) {
  const items: ListData<T, Item> = itemsProp ?? options ?? NO_ITEMS;
  const keyOf = useMemo(() => valueKey(itemToValue), [itemToValue]);
  const byKey = useMemo(() => new Map(flatItems(items).map((o) => [keyOf(o.value), o])), [items, keyOf]);
  // Uncontrolled, the field still tracks its value, for the form reset below.
  const [own, setOwn] = useState(() => chosen(defaultValue));
  const current = value !== undefined ? chosen(value) : own;
  // ui-sdk is always handed the value, with Avenue's "none" option in place of null where there is one.
  const toRoot = (v: T | null): T | None | null =>
    v !== null ? (byKey.has(keyOf(v)) ? v : null) : noneLabel ? NONE : null;
  const selected = toRoot(current);
  // The app hears it first, as ui-sdk's callbacks do; a canceled change leaves the field's own value alone. ui-sdk is
  // always handed the value, so it can't drop a canceled change itself.
  const change = (next: T | null, details: ComboboxValueChangeDetails) => {
    onValueChange?.(next, details);
    if (!details.canceled) setOwn(next);
  };
  const [query, setQuery] = useState("");
  // Finds the form the field posts with, for its reset.
  const probe = useRef<HTMLSpanElement>(null);
  // ui-sdk is always handed the value (it refuses `value` and `defaultValue` together), so a form reset is answered
  // here: the field goes back to `defaultValue`, and a controlled field hears it through onValueChange.
  const reset = useEffectEvent(() => {
    // A controlled field with no default of its own keeps its value: the app decides what a reset means there.
    if (value !== undefined && defaultValue === undefined) return;
    const target = chosen(defaultValue);
    const same = target === null || current === null ? target === current : keyOf(target) === keyOf(current);
    if (!same && report(onValueChange, target, { reason: "reset" })) setOwn(target);
  });
  useEffect(() => {
    const element = probe.current;
    const owner = form ? element?.ownerDocument.getElementById(form) : element?.closest("form");
    if (!(owner instanceof HTMLFormElement)) return;
    const onReset = () => reset();
    owner.addEventListener("reset", onReset);
    return () => owner.removeEventListener("reset", onReset);
  }, [form]);

  // The "none" option's private value passes through the app's own object-value functions untouched.
  const objectProps = defined({
    itemToValue: itemToValue && ((v: T | None) => (v === NONE ? NONE : itemToValue(v as T))),
    itemToLabel: itemToLabel && ((v: T | None) => (v === NONE ? (noneLabel ?? "") : itemToLabel(v as T))),
    isItemEqualToValue:
      isItemEqualToValue &&
      ((a: T | None, b: T | None) => (a === NONE || b === NONE ? a === b : isItemEqualToValue(a as T, b as T))),
  });

  const item = (entry: Item | (T & string)) => {
    const option = toItem<T, Item>(entry);
    return (
      <ComboboxItem<T | None>
        key={keyOf(option.value)}
        value={option.value}
        label={option.label}
        meta={option.meta}
        {...defined({ keywords: option.keywords, disabled: option.disabled || undefined })}
      >
        <span>{option.label}</span>
        {option.hint && <span className="text-muted-foreground"> · {option.hint}</span>}
      </ComboboxItem>
    );
  };
  const keys = entryKeys(items, keyOf);
  const rows = items.map((entry, i) =>
    isSeparator(entry) ? (
      <ComboboxSeparator key={keys[i]} />
    ) : isGroup(entry) ? (
      <ComboboxGroup key={keys[i]}>
        {entry.label !== undefined && <ComboboxGroupLabel>{entry.label}</ComboboxGroupLabel>}
        {entry.items.map(item)}
      </ComboboxGroup>
    ) : (
      item(entry)
    ),
  );

  return (
    <ComboboxRoot<T | None>
      value={selected}
      onValueChange={(next: T | None | null, details: ComboboxValueChangeDetails) => {
        if (next !== null) change(next === NONE ? null : (next as T), details);
        // The phone's Clear clears the choice as well as the search (AVE-93); Escape while the list is open asks for
        // it back. Clearing the text by typing is still typing, not a choice, so that request is refused.
        else if (details.reason === "clear-press") change(null, details);
        else details.cancel();
      }}
      onQueryChange={(next: string, details: { reason: string; cancel: () => void }) => {
        // ui-sdk empties the text on a form reset, as it would return to its own empty default; the reset listener
        // above has put the field's default value back, and with it its label, so the text stays.
        if (details.reason === "reset") details.cancel();
        else setQuery(next);
      }}
      filter={(entry: ListItem<T | None>, text: string) => {
        if (entry.value === NONE) return text.trim() === "";
        const option = byKey.get(keyOf(entry.value as T));
        return option ? filter(option, text) : false;
      }}
      presentation={presentation}
      // While the none option is chosen, ui-sdk would post its private value, so it gets no name and the hidden input
      // below posts "" in its place.
      {...defined({ disabled, name: selected === NONE ? undefined : name, form, required })}
      {...objectProps}
    >
      <span ref={probe} hidden />
      {name && selected === NONE && (
        <input type="hidden" name={name} value="" disabled={disabled} {...defined({ form })} />
      )}
      <ComboboxInput placeholder={placeholder} {...input} />
      <ComboboxContent>
        <ComboboxEmpty>{emptyMessage(query.trim())}</ComboboxEmpty>
        <ComboboxList>
          {noneLabel && (
            <ComboboxItem<T | None> value={NONE} label={noneLabel}>
              <span className="text-muted-foreground">{noneLabel}</span>
            </ComboboxItem>
          )}
          {rows}
        </ComboboxList>
      </ComboboxContent>
    </ComboboxRoot>
  );
}

export {
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
};
